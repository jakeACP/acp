import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AvatarSVG,
  DEFAULT_AVATAR_CONFIG,
  type AvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLE_LIST,
  EYE_COLORS,
  EYE_SHAPE_LIST,
  EYEBROW_STYLE_LIST,
  NOSE_STYLE_LIST,
  MOUTH_STYLE_LIST,
  FACIAL_HAIR_LIST,
  GLASSES_LIST,
  BACKGROUNDS,
} from "./avatar-svg";

interface AvatarBuilderProps {
  open: boolean;
  onClose: () => void;
  initialConfig?: AvatarConfig;
}

// Reusable option pill
function OptionPill({
  label, selected, onClick, swatch,
}: { label: string; selected: boolean; onClick: () => void; swatch?: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
        ${selected
          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-400"
        }
      `}
    >
      {swatch && (
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/30 flex-shrink-0"
          style={{ background: swatch }}
        />
      )}
      {label}
    </button>
  );
}

// Color swatch grid
function SwatchGrid({
  items, selected, onSelect,
}: { items: { id: string; name: string; color?: string; base?: string; from?: string }[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const col = item.color ?? item.base ?? item.from ?? "#ccc";
        return (
          <button
            key={item.id}
            title={item.name}
            onClick={() => onSelect(item.id)}
            className={`
              w-8 h-8 rounded-full border-2 transition-all hover:scale-110
              ${selected === item.id ? "border-blue-500 scale-110 shadow-lg" : "border-transparent hover:border-slate-300"}
            `}
            style={{ background: col }}
          />
        );
      })}
    </div>
  );
}

// Section label
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 mt-4 first:mt-0">{children}</p>;
}

export function AvatarBuilder({ open, onClose, initialConfig }: AvatarBuilderProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<AvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);

  const set = (key: keyof AvatarConfig, val: string) =>
    setConfig((c) => ({ ...c, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: async (cfg: AvatarConfig) =>
      apiRequest("/api/profile/avatar-config", "PUT", { avatarConfig: cfg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar saved!", description: "Your avatar is now showing on your profile." });
      onClose();
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save your avatar.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-lg font-bold">Create Your Avatar</DialogTitle>
          <p className="text-sm text-slate-500">Customize your look — no photo needed.</p>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(90vh-130px)]">
          {/* Live preview */}
          <div className="md:w-56 flex-shrink-0 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center gap-4 p-6 border-b md:border-b-0 md:border-r">
            <div className="rounded-full shadow-2xl overflow-hidden ring-4 ring-white dark:ring-slate-600">
              <AvatarSVG config={config} size={160} />
            </div>
            <p className="text-xs text-slate-500 text-center">Live preview updates as you customize</p>
          </div>

          {/* Options panel */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="skin" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-3 mb-1 flex-shrink-0 flex flex-wrap h-auto gap-1 bg-slate-100 dark:bg-slate-800 p-1">
                {[
                  { val: "skin",   label: "Skin" },
                  { val: "hair",   label: "Hair" },
                  { val: "eyes",   label: "Eyes" },
                  { val: "face",   label: "Face" },
                  { val: "extras", label: "Extras" },
                  { val: "bg",     label: "Background" },
                ].map(({ val, label }) => (
                  <TabsTrigger key={val} value={val} className="text-xs px-3 py-1.5 rounded">{label}</TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1 px-4 pb-4">
                {/* ── SKIN TAB ── */}
                <TabsContent value="skin" className="mt-3 space-y-3">
                  <SectionLabel>Skin Tone</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_TONES.map((s) => (
                      <button
                        key={s.id}
                        title={s.name}
                        onClick={() => set("skinTone", s.id)}
                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${config.skinTone === s.id ? "border-blue-500 scale-110 shadow-lg" : "border-slate-200 hover:border-slate-300"}`}
                        style={{ background: s.base }}
                      >
                        {config.skinTone === s.id && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    {SKIN_TONES.find(s => s.id === config.skinTone) && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Selected: <strong>{SKIN_TONES.find(s => s.id === config.skinTone)?.name}</strong>
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* ── HAIR TAB ── */}
                <TabsContent value="hair" className="mt-3 space-y-3">
                  <SectionLabel>Hair Style</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_STYLE_LIST.map((h) => (
                      <OptionPill
                        key={h.id}
                        label={h.name}
                        selected={config.hairStyle === h.id}
                        onClick={() => set("hairStyle", h.id)}
                      />
                    ))}
                  </div>

                  <SectionLabel>Hair Color — Natural</SectionLabel>
                  <SwatchGrid
                    items={HAIR_COLORS.slice(0, 10)}
                    selected={config.hairColor}
                    onSelect={(id) => set("hairColor", id)}
                  />

                  <SectionLabel>Hair Color — Eccentric</SectionLabel>
                  <SwatchGrid
                    items={HAIR_COLORS.slice(10)}
                    selected={config.hairColor}
                    onSelect={(id) => set("hairColor", id)}
                  />
                  {HAIR_COLORS.find(h => h.id === config.hairColor) && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Selected: <strong>{HAIR_COLORS.find(h => h.id === config.hairColor)?.name}</strong>
                    </p>
                  )}
                </TabsContent>

                {/* ── EYES TAB ── */}
                <TabsContent value="eyes" className="mt-3 space-y-3">
                  <SectionLabel>Eye Shape</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {EYE_SHAPE_LIST.map((e) => (
                      <OptionPill
                        key={e.id}
                        label={e.name}
                        selected={config.eyeShape === e.id}
                        onClick={() => set("eyeShape", e.id)}
                      />
                    ))}
                  </div>

                  <SectionLabel>Eye Color — Natural</SectionLabel>
                  <SwatchGrid
                    items={EYE_COLORS.slice(0, 6)}
                    selected={config.eyeColor}
                    onSelect={(id) => set("eyeColor", id)}
                  />

                  <SectionLabel>Eye Color — Fantasy</SectionLabel>
                  <SwatchGrid
                    items={EYE_COLORS.slice(6)}
                    selected={config.eyeColor}
                    onSelect={(id) => set("eyeColor", id)}
                  />
                  {EYE_COLORS.find(e => e.id === config.eyeColor) && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Selected: <strong>{EYE_COLORS.find(e => e.id === config.eyeColor)?.name}</strong>
                    </p>
                  )}

                  <SectionLabel>Eyebrow Style</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {EYEBROW_STYLE_LIST.map((b) => (
                      <OptionPill
                        key={b.id}
                        label={b.name}
                        selected={config.eyebrowStyle === b.id}
                        onClick={() => set("eyebrowStyle", b.id)}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* ── FACE TAB ── */}
                <TabsContent value="face" className="mt-3 space-y-3">
                  <SectionLabel>Nose</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {NOSE_STYLE_LIST.map((n) => (
                      <OptionPill
                        key={n.id}
                        label={n.name}
                        selected={config.noseStyle === n.id}
                        onClick={() => set("noseStyle", n.id)}
                      />
                    ))}
                  </div>

                  <SectionLabel>Mouth</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {MOUTH_STYLE_LIST.map((m) => (
                      <OptionPill
                        key={m.id}
                        label={m.name}
                        selected={config.mouthStyle === m.id}
                        onClick={() => set("mouthStyle", m.id)}
                      />
                    ))}
                  </div>

                  <SectionLabel>Facial Hair</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {FACIAL_HAIR_LIST.map((f) => (
                      <OptionPill
                        key={f.id}
                        label={f.name}
                        selected={config.facialHair === f.id}
                        onClick={() => set("facialHair", f.id)}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* ── EXTRAS TAB ── */}
                <TabsContent value="extras" className="mt-3 space-y-3">
                  <SectionLabel>Glasses / Eyewear</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {GLASSES_LIST.map((g) => (
                      <OptionPill
                        key={g.id}
                        label={g.name}
                        selected={config.glasses === g.id}
                        onClick={() => set("glasses", g.id)}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* ── BACKGROUND TAB ── */}
                <TabsContent value="bg" className="mt-3 space-y-3">
                  <SectionLabel>Background Color</SectionLabel>
                  <div className="grid grid-cols-6 gap-3">
                    {BACKGROUNDS.map((b) => (
                      <button
                        key={b.id}
                        title={b.name}
                        onClick={() => set("backgroundColor", b.id)}
                        className={`h-12 rounded-xl border-2 transition-all hover:scale-105 ${config.backgroundColor === b.id ? "border-blue-500 scale-105 shadow-lg" : "border-transparent hover:border-slate-300"}`}
                        style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }}
                      />
                    ))}
                  </div>
                  {BACKGROUNDS.find(b => b.id === config.backgroundColor) && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Selected: <strong>{BACKGROUNDS.find(b => b.id === config.backgroundColor)?.name}</strong>
                    </p>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none">
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate(config)}
            disabled={saveMutation.isPending}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saveMutation.isPending ? "Saving…" : "Save Avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
