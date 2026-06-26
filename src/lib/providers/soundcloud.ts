/**
 * SoundCloud provider.
 *
 * Handles URLs like:
 *   https://soundcloud.com/artist/track
 *   https://soundcloud.com/artist/sets/playlist
 *
 * SoundCloud's public API requires registration, so we use:
 *   - oEmbed endpoint for metadata (no auth, CORS-friendly)
 *   - The embed iframe player (https://w.soundcloud.com/player/?url=...) for playback
 *
 * The embed is controlled programmatically via the SoundCloud Widget API
 * (https://w.soundcloud.com/player/api.js).
 */

import type { SongProvider, ResolvedSong } from "./types";

const SOUNDCLOUD_URL_RE = /^https?:\/\/(www\.)?soundcloud\.com\//i;

export const soundcloudProvider: SongProvider = {
  name: "SoundCloud",
  isEmbed: true,

  match(url: string) {
    return SOUNDCLOUD_URL_RE.test(url);
  },

  async resolve(url: string): Promise<ResolvedSong> {
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) {
      throw new Error(
        `SoundCloud oEmbed request failed (HTTP ${res.status}). The URL may be invalid or private.`,
      );
    }
    const data = await res.json();

    // Build a minimal-player embed URL (no visual artwork, no buy/share buttons).
    const params = new URLSearchParams({
      url,
      auto_play: "false",
      buying: "false",
      sharing: "false",
      download: "false",
      show_artwork: "true",
      show_playcount: "false",
      show_user: "false",
      hide_related: "true",
      visual: "false",
    });
    const embedUrl = `https://w.soundcloud.com/player/?${params.toString()}`;

    return {
      title: data.title || "Unknown track",
      artist: data.author_name || "Unknown artist",
      sourceUrl: url,
      embedUrl,
      embedType: "soundcloud",
      coverUrl: data.thumbnail_url,
      durationSec: 0, // SoundCloud oEmbed doesn't expose duration.
    };
  },
};
