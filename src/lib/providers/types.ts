/**
 * Provider strategy types.
 *
 * Each provider knows how to:
 *  - match a URL (e.g. spotify.com, soundcloud.com, or any direct audio URL)
 *  - resolve metadata (title, artist, cover art) for that URL
 *  - return either a playable audio source (blob/direct URL) OR an embed URL
 *    that the EmbedPlayer can load in an iframe (Spotify/SoundCloud)
 *
 * The registry is an ordered array — first match wins. The "direct" provider
 * is the fallback that matches everything, so it must be last.
 */

export type EmbedType = "spotify" | "soundcloud" | "youtube";

export type ResolvedSong = {
  title: string;
  artist: string;
  album?: string;
  durationSec: number;

  /** Remote cover art URL (from oEmbed). Used for embed songs. */
  coverUrl?: string;

  /** Original source URL the user pasted. */
  sourceUrl: string;

  // --- Direct-audio source (one of these two) ---
  /** If we managed to download the audio, the Blob is here. */
  audioBlob?: Blob;
  audioMime?: string;
  audioSize?: number;
  /** If we can stream but not download, the direct URL is here. */
  audioUrl?: string;

  // --- Embed source (Spotify / SoundCloud) ---
  /** If this song is played via an embedded iframe, the embed URL is here. */
  embedUrl?: string;
  embedType?: EmbedType;
};

export type SongProvider = {
  /** Display name (shown in UI badges / toasts). */
  name: string;
  /** Returns true if this provider handles the given URL. */
  match: (url: string) => boolean;
  /** Resolve metadata + audio source from the URL. */
  resolve: (url: string) => Promise<ResolvedSong>;
  /** True if playback is via an embedded iframe (vs a native <audio> src). */
  isEmbed: boolean;
};
