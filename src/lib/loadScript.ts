/**
 * Lazy-load external scripts with caching and promise dedup.
 */

const loadedScripts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

/** Load a script tag and resolve once it's ready. Cached per-src. */
export function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  if (loadingPromises.has(src)) return loadingPromises.get(src)!;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      loadedScripts.add(src);
      loadingPromises.delete(src);
      resolve();
    };
    script.onerror = () => {
      loadingPromises.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });

  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Load the Spotify IFrame API. Resolves with the IFrameAPI object.
 * The script sets window.onSpotifyIframeAPIReady as a callback, so we
 * need to handle both first-load and already-loaded cases.
 */
let spotifyApiPromise: Promise<any> | null = null;

export function loadSpotifyIframeApi(): Promise<any> {
  if (spotifyApiPromise) return spotifyApiPromise;
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));

  spotifyApiPromise = new Promise((resolve, reject) => {
    // If the API is already on the window, use it directly.
    const existing = (window as any).SpotifyIframeConfig?.iframeAPI;
    if (existing) {
      resolve(existing);
      return;
    }

    // Otherwise set the ready callback and load the script.
    (window as any).onSpotifyIframeAPIReady = (api: any) => {
      resolve(api);
    };

    loadScript("https://open.spotify.com/embed/iframe-api/v1").catch(reject);
  });

  return spotifyApiPromise;
}

/**
 * Load the SoundCloud Widget API. Resolves with the SC global.
 */
let scApiPromise: Promise<any> | null = null;

export function loadSoundCloudWidgetApi(): Promise<any> {
  if (scApiPromise) return scApiPromise;
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));

  scApiPromise = new Promise((resolve, reject) => {
    const existing = (window as any).SC;
    if (existing?.Widget) {
      resolve(existing);
      return;
    }
    loadScript("https://w.soundcloud.com/player/api.js")
      .then(() => {
        const sc = (window as any).SC;
        if (sc?.Widget) resolve(sc);
        else
          reject(new Error("SoundCloud Widget API not available after load"));
      })
      .catch(reject);
  });

  return scApiPromise;
}

/**
 * Load the YouTube IFrame API. Resolves with the YT global.
 * The script calls window.onYouTubeIframeAPIReady when loaded.
 */
let ytApiPromise: Promise<any> | null = null;

export function loadYouTubeIframeApi(): Promise<any> {
  if (ytApiPromise) return ytApiPromise;
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));

  ytApiPromise = new Promise((resolve, reject) => {
    const existing = (window as any).YT;
    if (existing?.Player) {
      resolve(existing);
      return;
    }
    (window as any).onYouTubeIframeAPIReady = () => {
      const yt = (window as any).YT;
      if (yt?.Player) resolve(yt);
      else reject(new Error("YouTube IFrame API not available after load"));
    };
    loadScript("https://www.youtube.com/iframe_api").catch(reject);
  });

  return ytApiPromise;
}
