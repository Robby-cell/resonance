"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { useLibraryStore, Song } from "@/lib/store";

type EditSongDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  song: Song;
};

export function EditSongDialog({
  open,
  onOpenChange,
  song,
}: EditSongDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditSongForm
        key={song.id + (open ? "-open" : "-closed")}
        song={song}
        onDone={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function EditSongForm({ song, onDone }: { song: Song; onDone: () => void }) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [album, setAlbum] = useState(song.album ?? "");
  const updateSongMeta = useLibraryStore((s) => s.updateSongMeta);

  async function handleSave() {
    await updateSongMeta(song.id, {
      title: title.trim() || song.title,
      artist: artist.trim() || "Unknown artist",
      album: album.trim() || undefined,
    });
    toast.success("Song details updated");
    onDone();
  }

  return (
    <DialogContent className="max-w-md bg-[#111118] border-white/10 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <Pencil className="h-5 w-5 text-[#ff6b4a]" />
          Edit song details
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label className="text-white/80">Title</Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Artist</Label>
          <Input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">
            Album <span className="text-white/40">(optional)</span>
          </Label>
          <Input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          onClick={onDone}
          className="text-white hover:text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handleSave()}
          className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
