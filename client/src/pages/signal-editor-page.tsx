import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Type, Music, Play, Pause, Plus, Trash2, X,
  Upload, Loader2, Film, Check,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { getPendingSignalFile, clearPendingSignalFile } from "@/lib/signalFileStore";
import { fetchCsrfToken, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface TextAnnotation {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
}

const AUDIO_TRACKS = [
  { filename: "Freedom_March.mp3", label: "Freedom March" },
  { filename: "Pulse_of_Truth.mp3", label: "Pulse of Truth" },
  { filename: "Rising_Voice.mp3", label: "Rising Voice" },
  { filename: "Civic_Anthem.mp3", label: "Civic Anthem" },
  { filename: "Silent_Resolve.mp3", label: "Silent Resolve" },
  { filename: "Power_To_The_People.mp3", label: "Power to the People" },
  { filename: "New_Dawn.mp3", label: "New Dawn" },
  { filename: "Stand_Together.mp3", label: "Stand Together" },
];

const CATEGORIES = [
  "Politicians", "Corruption", "Current Events", "Legislation",
  "Voting & Elections", "Justice", "Economy", "Community",
];

const TEXT_COLORS = ["#ffffff", "#ff4444", "#44ff44", "#4444ff", "#ffff00", "#ff44ff", "#44ffff", "#ff8800"];

const THUMB_W = 80;
const THUMB_H = 45;
const THUMB_COUNT = 12;

async function generateThumbnails(blob: Blob, count: number): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const thumbs: string[] = [];
    let idx = 0;
    let settled = false;

    const finish = (result: string[]) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timeout = setTimeout(() => finish(thumbs.length > 0 ? thumbs : []), 6000);

    const snap = (): string => {
      const c = document.createElement("canvas");
      c.width = THUMB_W;
      c.height = THUMB_H;
      const ctx = c.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
      return c.toDataURL("image/jpeg", 0.5);
    };

    const captureFrame = () => {
      thumbs.push(snap());
      idx++;
      const dur = video.duration;
      if (idx < count && isFinite(dur) && dur > 0) {
        video.currentTime = (idx / Math.max(count - 1, 1)) * dur;
      } else {
        while (thumbs.length < count && thumbs.length > 0) thumbs.push(thumbs[0]);
        clearTimeout(timeout);
        finish(thumbs);
      }
    };

    video.addEventListener("seeked", captureFrame);
    video.addEventListener("loadeddata", () => {
      captureFrame();
    }, { once: true });
    video.addEventListener("error", () => { clearTimeout(timeout); finish([]); }, { once: true });
    video.load();
  });
}

export default function SignalEditorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [audioTrack, setAudioTrack] = useState("");

  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("#ffffff");
  const [newFontSize, setNewFontSize] = useState(24);
  const [newStartTime, setNewStartTime] = useState(0);
  const [newEndTime, setNewEndTime] = useState(3);

  const [activePanel, setActivePanel] = useState<"none" | "text" | "sound">("none");
  const [composing, setComposing] = useState(false);

  const scrubberDragging = useRef(false);

  useEffect(() => {
    const f = getPendingSignalFile();
    if (!f) {
      setLocation("/signals");
      return;
    }
    setFile(f);
    clearPendingSignalFile();
    const url = URL.createObjectURL(f);
    setBlobUrl(url);

    const vid = document.createElement("video");
    vid.preload = "auto";
    vid.src = url;
    vid.onloadedmetadata = () => {
      const dur = isFinite(vid.duration) ? vid.duration : 0;
      setDuration(dur);
      setNewEndTime(Math.min(3, dur));
      setLoading(false);
    };
    vid.onerror = () => {
      toast({ title: "Failed to load video", variant: "destructive" });
      setLocation("/signals");
    };

    generateThumbnails(f, THUMB_COUNT).then(setThumbnails);

    return () => { URL.revokeObjectURL(url); };
  }, []);

  const trimmedDuration = Math.max(0, duration - trimIn - trimOut);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      playingRef.current = false;
      setPlaying(false);
    } else {
      playingRef.current = true;
      if (v.currentTime < trimIn || v.currentTime >= duration - trimOut) {
        v.currentTime = trimIn;
      }
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const stopAt = duration - trimOut;
    if (v.currentTime >= stopAt) {
      v.pause();
      v.currentTime = trimIn;
      playingRef.current = false;
      setPlaying(false);
    }
    setCurrentTime(v.currentTime - trimIn);
  }, [duration, trimIn, trimOut]);

  const seekToTime = useCallback((globalTime: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = trimIn + Math.max(0, Math.min(globalTime, trimmedDuration));
    if (isFinite(v.duration)) {
      v.currentTime = target;
    }
    setCurrentTime(globalTime);
  }, [trimIn, trimmedDuration]);

  const handleScrubberInteraction = useCallback((clientX: number, bar: HTMLElement) => {
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (trimmedDuration <= 0) return;
    seekToTime(ratio * trimmedDuration);
  }, [trimmedDuration, seekToTime]);

  const addAnnotation = () => {
    if (!newText.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: `ann-${Date.now()}`,
        text: newText.trim(),
        color: newColor,
        fontSize: newFontSize,
        startTime: newStartTime,
        endTime: Math.max(newStartTime + 0.5, newEndTime),
        x: 50,
        y: 50,
      },
    ]);
    setNewText("");
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!t || tags.length >= 5 || tags.includes(t)) { setTagInput(""); return; }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const activeAnnotations = annotations.filter(
    (a) => currentTime >= a.startTime && currentTime <= a.endTime
  );

  const handleCompose = async () => {
    if (!file) return;
    setComposing(true);
    try {
      const token = await fetchCsrfToken();
      const fd = new FormData();
      fd.append("clip_0", file);

      const trimData: Record<string, any> = {};
      trimData["clip_0"] = { trimIn, trimOut, clipDuration: duration };
      fd.append("trimData", JSON.stringify(trimData));
      fd.append("timeline", JSON.stringify([{ type: "clip", field: "clip_0" }]));
      fd.append("title", title);
      fd.append("category", category);
      fd.append("tags", JSON.stringify([...(category ? [category] : []), ...tags]));
      fd.append("textAnnotations", JSON.stringify(annotations.map((a) => ({
        text: a.text,
        color: a.color,
        fontSize: a.fontSize,
        startTime: a.startTime,
        endTime: a.endTime,
      }))));
      if (audioTrack) fd.append("audioTrack", audioTrack);

      const res = await fetch("/api/mobile/signals/compose", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": token },
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Compose failed");
      }
      const { jobId } = await res.json();

      let attempts = 0;
      while (attempts < 120) {
        await new Promise((r) => setTimeout(r, 2000));
        const r = await fetch(`/api/mobile/signals/compose/${jobId}`, { credentials: "include" });
        if (!r.ok) throw new Error("Status check failed");
        const status = await r.json();
        if (status.status === "done") {
          await queryClient.invalidateQueries({ queryKey: ["/api/mobile/signals"] });
          toast({ title: "Signal posted!", description: "Your video is now live." });
          setLocation("/signals");
          return;
        }
        if (status.status === "error") throw new Error(status.errorMessage || "Compose failed");
        attempts++;
      }
      throw new Error("Compose timed out");
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setComposing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const trimInPct = duration > 0 ? (trimIn / duration) * 100 : 0;
  const trimOutPct = duration > 0 ? (trimOut / duration) * 100 : 0;
  const playheadPct = trimmedDuration > 0 ? (currentTime / trimmedDuration) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/signals")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Edit Signal</h1>
          </div>
          <Button
            onClick={handleCompose}
            disabled={composing || !title.trim()}
            className="gap-2"
          >
            {composing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><Upload className="w-4 h-4" /> Post Signal</>
            )}
          </Button>
        </div>

        {/* Main content — preview + sidebar */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Video Preview */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <div
              className="relative bg-black rounded-xl overflow-hidden w-full shrink-0"
              style={{ aspectRatio: "9/16", maxHeight: "58vh" }}
            >
              <video
                ref={videoRef}
                src={blobUrl || undefined}
                className="w-full h-full object-cover"
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => { playingRef.current = false; setPlaying(false); }}
              />

              {activeAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className="absolute pointer-events-none select-none font-bold text-center"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: ann.color,
                    fontSize: `${ann.fontSize}px`,
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  {ann.text}
                </div>
              ))}

              <button
                onClick={togglePlay}
                className="absolute bottom-4 left-4 z-20 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>

              <div className="absolute bottom-4 right-4 text-white/70 text-xs bg-black/50 px-2 py-0.5 rounded">
                {currentTime.toFixed(1)}s / {trimmedDuration.toFixed(1)}s
              </div>
            </div>

            {/* Scrubber */}
            <div
              className="w-full mt-3 h-8 flex items-center cursor-pointer touch-none"
              style={{ maxWidth: "calc(58vh * 9 / 16)" }}
              onPointerDown={(e) => {
                scrubberDragging.current = true;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                if (playing) { videoRef.current?.pause(); playingRef.current = false; setPlaying(false); }
                handleScrubberInteraction(e.clientX, e.currentTarget as HTMLElement);
              }}
              onPointerMove={(e) => {
                if (!scrubberDragging.current) return;
                handleScrubberInteraction(e.clientX, e.currentTarget as HTMLElement);
              }}
              onPointerUp={() => { scrubberDragging.current = false; }}
              onPointerCancel={() => { scrubberDragging.current = false; }}
            >
              <div className="w-full h-1.5 bg-muted rounded-full relative">
                <div
                  className="absolute left-0 top-0 h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(100, playheadPct)}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-primary"
                  style={{ left: `calc(${Math.min(100, playheadPct)}% - 7px)` }}
                />
              </div>
            </div>

            {/* Timeline strip */}
            <div className="w-full mt-2 relative rounded-lg overflow-hidden" style={{ maxWidth: "calc(58vh * 9 / 16)" }}>
              <div className="flex h-12 bg-muted/50 rounded-lg overflow-hidden">
                {thumbnails.length > 0
                  ? thumbnails.map((t, i) => (
                      <img key={i} src={t} className="h-full flex-1 object-cover" alt="" />
                    ))
                  : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                      <Film className="w-4 h-4 mr-1" /> Loading timeline...
                    </div>
                  )
                }
              </div>

              {/* Trim overlay — left */}
              {trimIn > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-black/60 border-r-2 border-red-500"
                  style={{ width: `${trimInPct}%` }}
                />
              )}
              {/* Trim overlay — right */}
              {trimOut > 0 && (
                <div
                  className="absolute right-0 top-0 bottom-0 bg-black/60 border-l-2 border-red-500"
                  style={{ width: `${trimOutPct}%` }}
                />
              )}
            </div>

            {/* Trim controls */}
            <div className="w-full mt-3 flex gap-4" style={{ maxWidth: "calc(58vh * 9 / 16)" }}>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">Trim Start ({trimIn.toFixed(1)}s)</label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration - trimOut - 0.5, 0)}
                  step={0.1}
                  value={trimIn}
                  onChange={(e) => setTrimIn(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">Trim End ({trimOut.toFixed(1)}s)</label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration - trimIn - 0.5, 0)}
                  step={0.1}
                  value={trimOut}
                  onChange={(e) => setTrimOut(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Right: Details & Tools */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your signal a title..."
                maxLength={200}
                className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c === category ? "" : c)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      category === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag..."
                  className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addTag} className="text-primary hover:text-primary/80">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span key={t} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      #{t}
                      <button onClick={() => setTags((p) => p.filter((x) => x !== t))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tool panels */}
            <div className="flex gap-2">
              <button
                onClick={() => setActivePanel(activePanel === "text" ? "none" : "text")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                  activePanel === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Type className="w-4 h-4" /> Text
              </button>
              <button
                onClick={() => setActivePanel(activePanel === "sound" ? "none" : "sound")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                  activePanel === "sound" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music className="w-4 h-4" /> Music
              </button>
            </div>

            {/* Text Annotation Panel */}
            {activePanel === "text" && (
              <div className="bg-muted/50 rounded-xl p-3 space-y-3">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter text overlay..."
                  maxLength={100}
                  className="w-full bg-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-1 flex-wrap">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <div className="flex-1">
                    <label className="block mb-1">Size: {newFontSize}px</label>
                    <input type="range" min={10} max={72} value={newFontSize} onChange={(e) => setNewFontSize(parseInt(e.target.value))} className="w-full accent-primary" />
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex-1">
                    <label className="text-muted-foreground block mb-1">Start: {newStartTime.toFixed(1)}s</label>
                    <input type="range" min={0} max={Math.max(trimmedDuration - 0.5, 0)} step={0.1} value={newStartTime}
                      onChange={(e) => { setNewStartTime(parseFloat(e.target.value)); setNewEndTime(Math.max(parseFloat(e.target.value) + 0.5, newEndTime)); }}
                      className="w-full accent-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-muted-foreground block mb-1">End: {newEndTime.toFixed(1)}s</label>
                    <input type="range" min={0.5} max={Math.max(trimmedDuration, 0.5)} step={0.1} value={newEndTime} onChange={(e) => setNewEndTime(parseFloat(e.target.value))} className="w-full accent-primary" />
                  </div>
                </div>
                <button
                  onClick={addAnnotation}
                  disabled={!newText.trim()}
                  className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                >
                  Add Text
                </button>

                {annotations.length > 0 && (
                  <div className="space-y-1.5 mt-1">
                    {annotations.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-background rounded-lg px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
                          <span className="truncate text-foreground">{a.text}</span>
                          <span className="text-muted-foreground shrink-0">{a.startTime.toFixed(1)}–{a.endTime.toFixed(1)}s</span>
                        </div>
                        <button onClick={() => setAnnotations((p) => p.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-destructive ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Music Panel */}
            {activePanel === "sound" && (
              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                <button
                  onClick={() => setAudioTrack("")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !audioTrack ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  No music
                </button>
                {AUDIO_TRACKS.map((t) => (
                  <button
                    key={t.filename}
                    onClick={() => setAudioTrack(t.filename === audioTrack ? "" : t.filename)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                      audioTrack === t.filename ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {audioTrack === t.filename && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {composing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 text-center max-w-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Processing your Signal</h2>
            <p className="text-sm text-muted-foreground">This may take a minute. Please don't close this page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
