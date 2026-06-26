/**
 * YouTube provider — uses noembed.com for metadata and the YouTube IFrame
 * Player API for playback.
 *
 * Handles URLs like:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *
 * Why not youtubei.js? YouTube's internal API requires POST requests with
 * specific headers and cookies. CORS proxies don't reliably forward POST
 * requests with JSON bodies, so youtubei.js can't fetch video info or stream
 * URLs from the browser. The YouTube IFrame Player API is the only supported
 * way to play YouTube content in a browser — it runs in a sandboxed iframe
 * on youtube.com's origin, bypassing CORS entirely.
 */

import type { SongProvider, ResolvedSong } from "./types";

const YOUTUBE_URL_RE = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i;

/** Extract the 11-character video ID from a YouTube URL. */
export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

function thumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export const youtubeProvider: SongProvider = {
  name: "YouTube",
  isEmbed: true,

  match(url: string) {
    return YOUTUBE_URL_RE.test(url) && !!parseYouTubeVideoId(url);
  },

  async resolve(url: string): Promise<ResolvedSong> {
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Couldn't parse YouTube video ID from that URL.");
    }

    // noembed.com is a CORS-friendly oEmbed proxy that supports YouTube.
    // It returns title, author name, and thumbnail URL via a simple GET request.
    let title = `YouTube video ${videoId}`;
    let artist = "YouTube";
    const coverUrl = thumbUrl(videoId);

    try {
      const res = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${videoId}`,
        )}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) artist = data.author_name;
      }
    } catch {
      // noembed might be down — fall back to thumbnail-only metadata.
    }

    // The embed URL for the YouTube IFrame Player API.
    // enablejsapi=1 lets us control playback programmatically.
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1`;

    return {
      title,
      artist,
      sourceUrl: url,
      coverUrl,
      durationSec: 0, // noembed doesn't expose duration; the player reports it.
      embedUrl,
      embedType: "youtube",
    };
  },
};
