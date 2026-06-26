"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Sparkles, MonitorSmartphone, Info } from "lucide-react";
import { useSettingsStore } from "@/lib/settings";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const recommendationsEnabled = useSettingsStore(
    (s) => s.recommendationsEnabled,
  );
  const mediaSessionEnabled = useSettingsStore((s) => s.mediaSessionEnabled);
  const toggleRecommendations = useSettingsStore(
    (s) => s.toggleRecommendations,
  );
  const toggleMediaSession = useSettingsStore((s) => s.toggleMediaSession);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111118] border-white/8 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-[#ff6b4a]" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Customize your Resonance experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {/* Recommendations toggle */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="w-10 h-10 rounded-md bg-[#ff6b4a]/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#ff6b4a]" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium text-white cursor-pointer">
                Song recommendations
              </Label>
              <p className="text-xs text-white/50 mt-0.5">
                Shows AI-powered recommendations on the home page based on what
                you're listening to. Turn off for a simpler experience.
              </p>
            </div>
            <Switch
              checked={recommendationsEnabled}
              onCheckedChange={toggleRecommendations}
              aria-label="Toggle recommendations"
            />
          </div>

          {/* Media Session toggle */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="w-10 h-10 rounded-md bg-[#ff6b4a]/15 flex items-center justify-center shrink-0">
              <MonitorSmartphone className="h-5 w-5 text-[#ff6b4a]" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium text-white cursor-pointer">
                System media controls
              </Label>
              <p className="text-xs text-white/50 mt-0.5">
                Integrates with your OS media controls (lock screen,
                notification center, media keys) for background playback
                control.
              </p>
            </div>
            <Switch
              checked={mediaSessionEnabled}
              onCheckedChange={toggleMediaSession}
              aria-label="Toggle media session"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 mt-2 rounded-lg bg-white/[0.02] border border-white/5">
            <Info className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
            <p className="text-xs text-white/40 leading-relaxed">
              Your settings are stored locally in your browser. Audio files
              never leave your device — only song titles and artist names are
              sent to the recommendation service.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
