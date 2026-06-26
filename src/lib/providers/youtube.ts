/**
 * YouTube provider — uses youtubei.js to resolve video metadata and audio streams.
 *
 * Handles URLs like:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *
 * YouTube audio stream URLs expire after ~6 hours, so we store the video URL
 * and re-resolve the stream URL on-demand at play time (see resolveYouTubeStream).
 */

// Use the pre-bundled browser build. The default export path resolves to the
// Node.js build which doesn't work in the browser; "/web.bundle" is a
// pre-bundled browser version.
import Innertube from "youtubei.js/web.bundle";
import type { SongProvider, ResolvedSong } from "./types";

const YOUTUBE_URL_RE = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i;

/** Extract the 11-character video ID from a YouTube URL. */
export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    // youtube.com/watch?v=VIDEO_ID
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    // youtube.com/shorts/VIDEO_ID or youtube.com/embed/VIDEO_ID
    const m = u.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

/** Build a thumbnail URL for a YouTube video. */
function thumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// Cache the Innertube instance — it's expensive to create.
let ytInstance: any = null;
async function getInnertube() {
  if (!ytInstance) {
    ytInstance = await Innertube.create();
  }
  return ytInstance;
}

export const youtubeProvider: SongProvider = {
  name: "YouTube",
  isEmbed: false,

  match(url: string) {
    return YOUTUBE_URL_RE.test(url) && !!parseYouTubeVideoId(url);
  },

  async resolve(url: string): Promise<ResolvedSong> {
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Couldn't parse YouTube video ID from that URL.");
    }

    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    const title: string = info.basic_info?.title || `YouTube video ${videoId}`;
    const artist: string = info.basic_info?.author || "YouTube";
    const durationSec: number = Number(info.basic_info?.duration) || 0;

    return {
      title,
      artist,
      sourceUrl: url,
      coverUrl: thumbUrl(videoId),
      durationSec,
    };
  },
};

/**
 * Resolve a fresh audio stream URL for a YouTube video.
 * Called on-demand by resolveAudioSource() when a YouTube song is played.
 * Caches the result for 1 hour to avoid re-resolving on every play.
 */
const streamCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function resolveYouTubeStream(
  videoUrl: string,
): Promise<string | null> {
  const videoId = parseYouTubeVideoId(videoUrl);
  if (!videoId) return null;

  // Check cache
  const cached = streamCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    // Get the best audio-only stream. YouTube serves adaptive formats with
    // separate audio/video tracks. We want the highest-quality audio-only stream.
    const stream = info.chooseFormat({
      quality: "best",
      type: "audio",
    });

    if (!stream?.decipher) {
      // Fallback: try to get any format with audio
      const anyStream = info.chooseFormat({ quality: "best", type: "mixed" });
      if (!anyStream?.decipher) return null;
      const url = anyStream.decipher(yt.session.player);
      streamCache.set(videoId, { url, expires: Date.now() + CACHE_TTL });
      return url;
    }

    const url = stream.decipher(yt.session.player);
    streamCache.set(videoId, { url, expires: Date.now() + CACHE_TTL });
    return url;
  } catch (e) {
    console.error("YouTube stream resolution failed:", e);
    return null;
  }
}
