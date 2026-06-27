"use client";

import { useLibraryStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Upload,
  Link2,
  Download,
  Settings,
} from "lucide-react";
import { ExportModal } from "./modals/ExportModal";
import { SettingsModal } from "./modals/SettingsModal";
import { useState } from "react";

type TopBarProps = {
  onOpenSidebar: () => void;
  onOpenUpload: () => void;
  onOpenAddUrl: () => void;
};

export function TopBar({
  onOpenSidebar,
  onOpenUpload,
  onOpenAddUrl,
}: TopBarProps) {
  const view = useLibraryStore((s) => s.view);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm safe-top safe-left safe-right">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/8"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 text-white/50 hover:text-white hover:bg-black/70"
            onClick={() => window.history.back()}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 text-white/50 hover:text-white hover:bg-black/70"
            onClick={() => window.history.forward()}
            aria-label="Forward"
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Mobile title */}
        <div className="md:hidden flex-1 min-w-0">
          <h1 className="text-white font-bold text-base capitalize truncate">
            {view.kind === "home"
              ? "Home"
              : view.kind === "search"
                ? "Search"
                : view.kind === "library"
                  ? "Library"
                  : view.kind === "liked"
                    ? "Liked Songs"
                    : "Playlist"}
          </h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/8"
            onClick={onOpenUpload}
            aria-label="Upload"
          >
            <Upload size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/8"
            onClick={onOpenAddUrl}
            aria-label="Add from URL"
          >
            <Link2 size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/8"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings size={18} />
          </Button>
          <Button
            variant="ghost"
            className="hidden md:flex text-white/70 hover:text-white hover:bg-white/8 rounded-full text-sm"
            onClick={onOpenUpload}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button
            variant="ghost"
            className="hidden md:flex text-white/70 hover:text-white hover:bg-white/8 rounded-full text-sm"
            onClick={onOpenAddUrl}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Add URL
          </Button>
          <Button
            variant="ghost"
            className="hidden md:flex text-white/70 hover:text-white hover:bg-white/8 rounded-full text-sm"
            onClick={() => setExportOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex text-white/70 hover:text-white hover:bg-white/8 rounded-full"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings size={18} />
          </Button>
        </div>
      </header>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
