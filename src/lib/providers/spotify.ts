/**
 * Spotify provider.
 *
 * Handles URLs like:
 *   https://open.spotify.com/track/abc123
 *   https://open.spotify.com/album/abc123
 *   https://open.spotify.com/playlist/abc123
 *   https://open.spotify.com/episode/abc123
 *
 * Spotify does NOT allow direct audio download (DRM-protected), so playback
 * goes through Spotify's official embed iframe, controlled via the IFrame API.
 *
 * Metadata (title, artist, cover art) comes from Spotify's public oEmbed
 * endpoint, which requires no authentication and is CORS-friendly.
 */

import type { SongProvider, ResolvedSong } from "./types";

const SPOTIFY_URL_RE = /^https?:\/\/(open\.|www\.)?spotify\.com\//i;

/** Extract the content type and ID from a Spotify URL. */
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  const m = url.match(
    /spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i,
  );
  if (!m) return null;
  return { type: m[1].toLowerCase(), id: m[2] };
}

/** Convert an open.spotify.com URL into a spotify: URI for the embed API. */
export function toSpotifyUri(embedUrl: string): string {
  const m = embedUrl.match(
    /embed\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i,
  );
  if (m) return `spotify:${m[1].toLowerCase()}:${m[2]}`;
  return "";
}

export const spotifyProvider: SongProvider = {
  name: "Spotify",
  isEmbed: true,

  match(url: string) {
    return SPOTIFY_URL_RE.test(url);
  },

  async resolve(url: string): Promise<ResolvedSong> {
    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      throw new Error(
        "Couldn't parse Spotify URL — expected a track, album, or playlist link.",
      );
    }

    // oEmbed gives us title, author, thumbnail — no auth required.
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) {
      throw new Error(
        `Spotify oEmbed request failed (HTTP ${res.status}). The URL may be invalid or private.`,
      );
    }
    const data = await res.json();

    // Spotify oEmbed returns title as "Song Title - Artist" for tracks.
    // Split on the first " - " to separate them.
    let title: string = data.title || "Unknown track";
    let artist: string = "Spotify";
    if (typeof data.title === "string") {
      const dashIdx = data.title.indexOf(" - ");
      if (dashIdx > 0) {
        title = data.title.slice(0, dashIdx).trim();
        artist = data.title.slice(dashIdx + 3).trim();
      }
    }

    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;

    return {
      title,
      artist,
      sourceUrl: url,
      embedUrl,
      embedType: "spotify",
      coverUrl: data.thumbnail_url,
      durationSec: 0, // Spotify oEmbed doesn't expose duration.
    };
  },
};
