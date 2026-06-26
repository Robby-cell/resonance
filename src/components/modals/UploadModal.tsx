"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, FileAudio, Music2 } from "lucide-react";
import { useLibraryStore } from "@/lib/store";
import {
  parseTagsFromBlob,
  parseFilename,
  probeBlobDuration,
} from "@/lib/audio";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type StagedFile = {
  file: File;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  coverBlob: Blob | null;
  coverMime?: string;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

type UploadModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addUploadedSong = useLibraryStore((s) => s.addUploadedSong);

  const reset = useCallback(() => {
    setStaged([]);
    setIsDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const stageFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    if (arr.length === 0) {
      toast("No audio files detected", {
        description: "Try MP3, WAV, M4A, OGG, FLAC files.",
      });
      return;
    }

    const newStaged: StagedFile[] = arr.map((file) => {
      const parsed = parseFilename(file.name);
      return {
        file,
        title: parsed.title ?? file.name,
        artist: parsed.artist ?? "Unknown artist",
        album: "",
        durationSec: 0,
        coverBlob: null,
        status: "ready" as const,
      };
    });
    setStaged((s) => [...s, ...newStaged]);

    // Probe each file for tags + duration in parallel
    await Promise.all(
      arr.map(async (file) => {
        try {
          const [tags, dur] = await Promise.all([
            parseTagsFromBlob(file),
            probeBlobDuration(file),
          ]);
          setStaged((s) =>
            s.map((st) => {
              if (st.file !== file) return st;
              return {
                ...st,
                title: tags.title || st.title,
                artist: tags.artist || st.artist,
                album: tags.album || "",
                durationSec: dur,
                coverBlob: tags.coverBlob ?? null,
                coverMime: tags.coverBlob?.type,
              };
            }),
          );
        } catch (e) {
          console.warn("Probe failed", e);
        }
      }),
    );
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void stageFiles(e.dataTransfer.files);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) void stageFiles(e.target.files);
  }

  function updateField(idx: number, patch: Partial<StagedFile>) {
    setStaged((s) => s.map((st, i) => (i === idx ? { ...st, ...patch } : st)));
  }

  function removeStaged(idx: number) {
    setStaged((s) => s.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    const store = useLibraryStore.getState();
    let successCount = 0;
    for (let i = 0; i < staged.length; i++) {
      const item = staged[i];
      if (item.status === "done") {
        successCount++;
        continue;
      }
      updateField(i, { status: "uploading" });
      try {
        await store.addUploadedSong({
          title: item.title.trim() || item.file.name,
          artist: item.artist.trim() || "Unknown artist",
          album: item.album.trim() || undefined,
          durationSec: item.durationSec,
          mimeType: item.file.type || "audio/mpeg",
          size: item.file.size,
          blob: item.file,
          coverBlob: item.coverBlob,
          coverMime: item.coverMime,
        });
        updateField(i, { status: "done" });
        successCount++;
      } catch (e: any) {
        updateField(i, { status: "error", error: e?.message ?? "Failed" });
      }
    }
    toast.success(
      `${successCount} song${successCount !== 1 ? "s" : ""} added to your library`,
    );
    reset();
    onOpenChange(false);
  }

  const allDone = staged.length > 0 && staged.every((s) => s.status === "done");
  const anyUploading = staged.some((s) => s.status === "uploading");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!anyUploading) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-[#111118] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5 text-[#ff6b4a]" />
            Upload music
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Files stay on this device — they're stored in your browser's cache
            and never uploaded anywhere.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-[#ff6b4a] bg-[#ff6b4a]/10"
              : "border-white/15 hover:border-white/30 hover:bg-white/5",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <div className="flex flex-col items-center gap-2 text-white/80">
            <FileAudio className="h-10 w-10 text-[#ff6b4a]" />
            <p className="font-medium">
              Drop audio files here or click to browse
            </p>
            <p className="text-xs text-white/50">
              MP3, WAV, M4A, OGG, FLAC — metadata & cover art are detected
              automatically
            </p>
          </div>
        </div>

        {staged.length > 0 && (
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 min-h-0">
            {staged.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="rounded-lg bg-black/30 border border-white/5 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#ff6b4a]/30 to-[#ff6b4a]/5 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.coverBlob ? (
                      <img
                        src={URL.createObjectURL(item.coverBlob)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="h-5 w-5 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-white/50">Title</Label>
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          updateField(idx, { title: e.target.value })
                        }
                        disabled={
                          item.status === "uploading" || item.status === "done"
                        }
                        className="h-8 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-white/50">Artist</Label>
                      <Input
                        value={item.artist}
                        onChange={(e) =>
                          updateField(idx, { artist: e.target.value })
                        }
                        disabled={
                          item.status === "uploading" || item.status === "done"
                        }
                        className="h-8 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-white/50">Album</Label>
                      <Input
                        value={item.album}
                        onChange={(e) =>
                          updateField(idx, { album: e.target.value })
                        }
                        disabled={
                          item.status === "uploading" || item.status === "done"
                        }
                        className="h-8 bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-white/50">File info</Label>
                      <div className="text-xs text-white/60 h-8 flex items-center gap-2">
                        <span>{formatBytes(item.file.size)}</span>
                        <span>·</span>
                        <span>{Math.round(item.durationSec)}s</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-white/60 hover:text-white"
                    onClick={() => removeStaged(idx)}
                    disabled={item.status === "uploading"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {item.status === "uploading" && (
                  <div className="mt-2">
                    <Progress value={70} className="h-1" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="mt-2 text-xs text-[#ff6b4a]">
                    ✓ Added to library
                  </div>
                )}
                {item.status === "error" && (
                  <div className="mt-2 text-xs text-red-400">
                    ✗ {item.error || "Failed"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={anyUploading}
            className="text-white hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={staged.length === 0 || anyUploading || allDone}
            className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
          >
            {anyUploading
              ? "Adding..."
              : `Add ${staged.length} song${staged.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
