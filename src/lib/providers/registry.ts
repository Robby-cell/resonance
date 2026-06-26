/**
 * Provider registry — the strategy map.
 *
 * The registry is an ordered array. The first provider whose `match()` returns
 * true wins. The `directProvider` is always last (it matches everything), so
 * it acts as the fallback.
 *
 * To add a new provider (Apple Music, Bandcamp, YouTube Music, etc.):
 *   1. Create `src/lib/providers/yourservice.ts` exporting a `SongProvider`.
 *   2. Import and add it to the `providers` array below (before `directProvider`).
 *
 * That's it — the AddFromUrlModal and EmbedPlayer will pick it up automatically.
 */

import type { SongProvider } from "./types";
import { spotifyProvider } from "./spotify";
import { soundcloudProvider } from "./soundcloud";
import { directProvider } from "./direct";

export const providers: SongProvider[] = [
  spotifyProvider,
  soundcloudProvider,
  directProvider, // MUST be last — it's the fallback.
];

export function matchProvider(url: string): SongProvider {
  for (const p of providers) {
    if (p.match(url)) return p;
  }
  return directProvider;
}

export type { SongProvider, ResolvedSong, EmbedType } from "./types";
