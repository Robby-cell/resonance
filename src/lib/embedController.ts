/**
 * Singleton bridge between the player store and the active embed controller.
 *
 * The EmbedPlayer component registers its controller here when an embed song
 * starts playing, and unregisters it when the song changes. The player store's
 * togglePlay/seek/etc. actions call into this to control embed playback without
 * needing to know which platform is active.
 */

export type EmbedController = {
  play: () => void;
  pause: () => void;
  /** Seek to a position in seconds. */
  seek: (seconds: number) => void;
  /** Set volume 0..1 (Spotify embeds don't support this — caller should check). */
  setVolume?: (volume: number) => void;
  /** Whether volume control is supported (false for Spotify). */
  supportsVolume: boolean;
};

let activeController: EmbedController | null = null;

export function setActiveEmbedController(c: EmbedController | null) {
  activeController = c;
}

export function getActiveEmbedController(): EmbedController | null {
  return activeController;
}
