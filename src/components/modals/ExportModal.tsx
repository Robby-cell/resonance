"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FileJson, ListMusic, Package, Loader2 } from "lucide-react";
import { useLibraryStore } from "@/lib/store";
import {
  exportLibraryMetaJson,
  downloadFile,
  exportPlaylistM3U,
  exportPlaylistBundle,
  importPlaylistBundle,
} from "@/lib/exporter";

type ExportModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [busy, setBusy] = useState(false);
  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);

  function handleExportLibraryJson() {
    const json = exportLibraryMetaJson();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`spotifree-library-${stamp}.json`, json, "application/json");
    toast.success("Library metadata exported");
  }

  function handleExportM3U(playlistId: string) {
    void exportPlaylistM3U(playlistId).then(() => {
      toast.success("Playlist exported as M3U8");
    });
  }

  async function handleExportBundle(playlistId: string) {
    setBusy(true);
    try {
      await exportPlaylistBundle(playlistId);
      toast.success("Playlist bundle exported (with audio)");
    } catch (e: any) {
      toast.error("Export failed", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleImportBundle(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const count = await importPlaylistBundle(text);
      toast.success(`Imported ${count} song(s)`);
    } catch (e: any) {
      toast.error("Import failed", {
        description: e?.message ?? "Invalid bundle file",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111118] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Download className="h-5 w-5 text-[#ff6b4a]" />
            Export & backup
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Back up your library, share playlists, or move them to another
            device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Full library metadata */}
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-[#ff6b4a]/15 flex items-center justify-center shrink-0">
                <FileJson className="h-5 w-5 text-[#ff6b4a]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">Library metadata</h3>
                <p className="text-sm text-white/60 mt-1">
                  Export all {songs.length} songs and {playlists.length}{" "}
                  playlists as a JSON file. Note: this does <strong>not</strong>{" "}
                  include audio files — only metadata. Use playlist bundles
                  below for full audio backups.
                </p>
                <Button
                  onClick={handleExportLibraryJson}
                  className="mt-3 bg-white text-black hover:bg-white/90 rounded-full"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              </div>
            </div>
          </section>

          {/* Per-playlist exports */}
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-[#ff6b4a]/15 flex items-center justify-center shrink-0">
                <ListMusic className="h-5 w-5 text-[#ff6b4a]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">
                  Per-playlist exports
                </h3>
                <p className="text-sm text-white/60 mt-1 mb-3">
                  Export any single playlist as an M3U8 file (works with VLC and
                  most players) or as a self-contained Spotifree bundle (with
                  audio included).
                </p>
                {playlists.length === 0 ? (
                  <p className="text-sm text-white/40 italic">
                    No playlists yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {playlists.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-white/50">
                            {p.songIds.length} song
                            {p.songIds.length !== 1 ? "s" : ""}
                            {p.system ? " · system" : ""}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportM3U(p.id)}
                            disabled={p.songIds.length === 0}
                            className="border-white/15 text-white hover:bg-white/10 rounded-full h-7"
                          >
                            M3U
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportBundle(p.id)}
                            disabled={p.songIds.length === 0 || busy}
                            className="border-white/15 text-white hover:bg-white/10 rounded-full h-7"
                          >
                            {busy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Package className="h-3 w-3" />
                            )}
                            <span className="ml-1">Bundle</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Import bundle */}
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-[#ff6b4a]/15 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-[#ff6b4a]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">
                  Import playlist bundle
                </h3>
                <p className="text-sm text-white/60 mt-1 mb-3">
                  Restore a Spotifree playlist bundle (.spotifree.json) that you
                  previously exported. Audio is included for uploaded songs.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  id="import-bundle-input"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImportBundle(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("import-bundle-input")?.click()
                  }
                  disabled={busy}
                  className="border-white/15 text-white hover:bg-white/10 rounded-full"
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Choose bundle file
                </Button>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:text-white hover:bg-white/10"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
