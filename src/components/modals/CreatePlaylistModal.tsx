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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ListMusic } from "lucide-react";
import { useLibraryStore } from "@/lib/store";

type CreatePlaylistModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
};

export function CreatePlaylistModal({
  open,
  onOpenChange,
  onCreated,
}: CreatePlaylistModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CreatePlaylistForm
        key={open ? "open" : "closed"}
        onDone={(id) => {
          onOpenChange(false);
          if (id) onCreated?.(id);
        }}
      />
    </Dialog>
  );
}

function CreatePlaylistForm({
  onDone,
}: {
  onDone: (id: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);

  async function handleCreate() {
    const pl = await createPlaylist(name, description);
    toast.success(`Playlist "${pl.name}" created`);
    onDone(pl.id);
  }

  return (
    <DialogContent className="max-w-md bg-[#111118] border-white/10 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <ListMusic className="h-5 w-5 text-[#ff6b4a]" />
          Create a playlist
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="pl-name" className="text-white/80">
            Playlist name
          </Label>
          <Input
            id="pl-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Playlist"
            className="bg-white/5 border-white/10 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pl-desc" className="text-white/80">
            Description <span className="text-white/40">(optional)</span>
          </Label>
          <Textarea
            id="pl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this playlist about?"
            rows={3}
            className="bg-white/5 border-white/10 text-white resize-none"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          onClick={() => onDone(null)}
          className="text-white hover:text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handleCreate()}
          className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
        >
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
