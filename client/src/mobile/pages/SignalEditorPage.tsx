import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, Type, Music, Film, ImageIcon, Check,
  Play, Pause, Plus, Trash2, X,
} from "lucide-react";
import { getClips, clearSession, saveClip, type ClipEntry } from "@/mobile/lib/clipSession";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  type: "clip" | "photo";
  blob: Blob;
  duration: number; // seconds
  trimIn: number; // seconds from start
  trimOut: number; // seconds from end (0 = no trim)
  thumbnails: string[]; // data URLs
}

interface TextAnnotation {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  startTime: number;
  endTime: number;
}

interface AudioTrack {
  filename: string;
  label: string;
}

const AUDIO_TRACKS: AudioTrack[] = [
  { filename: "Freedom_March.mp3", label: "Freedom March" },
  { filename: "Pulse_of_Truth.mp3", label: "Pulse of Truth" },
  { filename: "Rising_Voice.mp3", label: "Rising Voice" },
  { filename: "Civic_Anthem.mp3", label: "Civic Anthem" },
  { filename: "Silent_Resolve.mp3", label: "Silent Resolve" },
  { filename: "Power_To_The_People.mp3", label: "Power to the People" },
  { filename: "New_Dawn.mp3", label: "New Dawn" },
  { filename: "Stand_Together.mp3", label: "Stand Together" },
];

const SIGNAL_CATEGORIES = [
  "Politicians", "Corruption", "Current Events", "Legislation",
  "Voting & Elections", "Justice", "Economy", "Community",
];

const TEXT_COLORS = ["#ffffff", "#ff4444", "#44ff44", "#4444ff", "#ffff00", "#ff44ff", "#44ffff", "#ff8800"];

const THUMB_W = 56;
const THUMB_H = 40;
const THUMB_PER_CLIP = 5;

// ── Thumbnail generator ───────────────────────────────────────────────────────

async function generateThumbnails(blob: Blob, count: number): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    const thumbs: string[] = [];
    let idx = 0;

    const captureFrame = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_W;
      canvas.height = THUMB_H;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
      idx++;
      if (idx < count) {
        video.currentTime = (idx / Math.max(count - 1, 1)) * (video.duration || 1);
      } else {
        URL.revokeObjectURL(url);
        resolve(thumbs);
      }
    };

    video.addEventListener("loadedmetadata", () => {
      video.addEventListener("seeked", captureFrame);
      video.currentTime = 0;
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve([]);
    });
  });
}

async function generatePhotoThumb(blob: Blob): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_W;
      canvas.height = THUMB_H;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, THUMB_W, THUMB_H);
      URL.revokeObjectURL(url);
      const t = canvas.toDataURL("image/jpeg", 0.5);
      resolve([t, t, t, t, t]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    img.src = url;
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SignalEditorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Timeline state
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentEntryIdx, setCurrentEntryIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const blobUrlsRef = useRef<string[]>([]);

  // Active bottom sheet
  const [sheet, setSheet] = useState<"none" | "text" | "sound" | "category" | "processing">("none");

  // Text annotation state
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("#ffffff");
  const [newFontSize, setNewFontSize] = useState(24);
  const [newStartTime, setNewStartTime] = useState(0);
  const [newEndTime, setNewEndTime] = useState(5);

  // Sound state
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [previewingTrack, setPreviewingTrack] = useState<string | null>(null);

  // Category / posting
  const [category, setCategory] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  // ── Load clips from IDB ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const clips = await getClips();
      if (cancelled) return;

      const built: TimelineEntry[] = await Promise.all(
        clips.map(async (clip) => {
          const thumbs = await generateThumbnails(clip.blob, THUMB_PER_CLIP);
          return {
            id: clip.id,
            type: "clip" as const,
            blob: clip.blob,
            duration: clip.duration,
            trimIn: 0,
            trimOut: 0,
            thumbnails: thumbs,
          };
        })
      );

      if (!cancelled) {
        setEntries(built);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Blob URLs for preview player ─────────────────────────────────────────

  useEffect(() => {
    blobUrlsRef.current.forEach(URL.revokeObjectURL);
    blobUrlsRef.current = entries.map((e) => URL.createObjectURL(e.blob));
    return () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, [entries]);

  // ── Preview player — sequential src-swap ─────────────────────────────────

  const loadEntry = useCallback((idx: number) => {
    const v = videoRef.current;
    if (!v || idx >= blobUrlsRef.current.length) return;
    v.src = blobUrlsRef.current[idx];
    v.currentTime = entries[idx]?.trimIn ?? 0;
    if (playing) v.play().catch(() => {});
  }, [entries, playing]);

  useEffect(() => {
    loadEntry(currentEntryIdx);
  }, [currentEntryIdx, blobUrlsRef.current.length]);

  // Preload next clip
  useEffect(() => {
    const nv = nextVideoRef.current;
    const nextIdx = currentEntryIdx + 1;
    if (nv && nextIdx < blobUrlsRef.current.length) {
      nv.src = blobUrlsRef.current[nextIdx];
    }
  }, [currentEntryIdx, blobUrlsRef.current.length]);

  // On ended, advance to next
  const handleEnded = useCallback(() => {
    const nextIdx = currentEntryIdx + 1;
    if (nextIdx < entries.length) {
      setCurrentEntryIdx(nextIdx);
    } else {
      setPlaying(false);
      setCurrentEntryIdx(0);
    }
  }, [currentEntryIdx, entries.length]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const entry = entries[currentEntryIdx];
    if (!entry) return;
    const elapsed = v.currentTime - entry.trimIn;
    const totalBefore = entries.slice(0, currentEntryIdx).reduce((s, e) => s + (e.duration - e.trimIn - e.trimOut), 0);
    setCurrentTime(totalBefore + Math.max(0, elapsed));

    // Honor trimOut
    const trimOut = entry.trimOut > 0 ? entry.duration - entry.trimOut : entry.duration;
    if (v.currentTime >= trimOut) handleEnded();
  }, [entries, currentEntryIdx, handleEnded]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  // ── Active text overlay during preview ───────────────────────────────────

  const activeAnnotations = annotations.filter(
    (a) => currentTime >= a.startTime && currentTime <= a.endTime
  );

  // ── Trim drag handles ─────────────────────────────────────────────────────

  const handleTrimIn = (entryId: string, delta: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const newTrimIn = Math.max(0, Math.min(e.trimIn + delta, e.duration - e.trimOut - 0.5));
        return { ...e, trimIn: newTrimIn };
      })
    );
  };

  const handleTrimOut = (entryId: string, delta: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const newTrimOut = Math.max(0, Math.min(e.trimOut + delta, e.duration - e.trimIn - 0.5));
        return { ...e, trimOut: newTrimOut };
      })
    );
  };

  const removeEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setCurrentEntryIdx(0);
  };

  // ── Add Footage ───────────────────────────────────────────────────────────

  const footageInputRef = useRef<HTMLInputElement>(null);
  const addFootage = async (file: File) => {
    const blob = file;
    const duration = await getVideoDuration(blob);
    const thumbs = await generateThumbnails(blob, THUMB_PER_CLIP);
    const entry: TimelineEntry = {
      id: `extra-${Date.now()}`,
      type: "clip",
      blob,
      duration,
      trimIn: 0,
      trimOut: 0,
      thumbnails: thumbs,
    };
    setEntries((prev) => [...prev, entry]);
    // also save to IDB so compose can access it
    const clipEntry: ClipEntry = { id: entry.id, blob, duration, timestamp: Date.now() };
    await saveClip(clipEntry);
  };

  // ── Add Photo ─────────────────────────────────────────────────────────────

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBlobs, setPhotoBlobs] = useState<{ id: string; blob: Blob }[]>([]);

  const addPhoto = async (file: File) => {
    const blob = file;
    const thumbs = await generatePhotoThumb(blob);
    const entry: TimelineEntry = {
      id: `photo-${Date.now()}`,
      type: "photo",
      blob,
      duration: 2,
      trimIn: 0,
      trimOut: 0,
      thumbnails: thumbs,
    };
    setEntries((prev) => [...prev, entry]);
    setPhotoBlobs((prev) => [...prev, { id: entry.id, blob }]);
  };

  // ── Sound preview ─────────────────────────────────────────────────────────

  const previewTrack = (filename: string) => {
    if (previewAudio) { previewAudio.pause(); previewAudio.src = ""; }
    if (previewingTrack === filename) { setPreviewingTrack(null); setPreviewAudio(null); return; }
    const audio = new Audio(`/public/audio/${filename}`);
    audio.volume = audioVolume;
    audio.play().catch(() => {});
    setPreviewAudio(audio);
    setPreviewingTrack(filename);
    audio.addEventListener("ended", () => setPreviewingTrack(null));
  };

  useEffect(() => {
    return () => { if (previewAudio) { previewAudio.pause(); } };
  }, [previewAudio]);

  // ── Text annotation add ───────────────────────────────────────────────────

  const addAnnotation = () => {
    if (!newText.trim()) return;
    setAnnotations((prev) => [...prev, {
      id: `ann-${Date.now()}`,
      text: newText.trim(),
      color: newColor,
      fontSize: newFontSize,
      startTime: newStartTime,
      endTime: newEndTime,
    }]);
    setNewText("");
    setSheet("none");
  };

  // ── Compose / Post ────────────────────────────────────────────────────────

  const totalDuration = entries.reduce((s, e) => s + (e.duration - e.trimIn - e.trimOut), 0);

  const startCompose = async () => {
    if (!category) { toast({ title: "Pick a category", variant: "destructive" }); return; }
    if (entries.length === 0) { toast({ title: "No clips to post", variant: "destructive" }); return; }

    setPosting(true);
    setSheet("processing");

    try {
      const fd = new FormData();
      fd.append("title", postTitle);
      fd.append("category", category);

      const clipEntries = entries.filter((e) => e.type === "clip");
      const photoEntries = entries.filter((e) => e.type === "photo");

      clipEntries.forEach((e, i) => fd.append(`clip_${i}`, e.blob, `clip_${i}.webm`));
      photoEntries.forEach((e, i) => fd.append(`photo_${i}`, e.blob, `photo_${i}.jpg`));

      const trimData: Record<string, { trimIn: number; trimOut: number; clipDuration: number }> = {};
      clipEntries.forEach((e, i) => { trimData[`clip_${i}`] = { trimIn: e.trimIn, trimOut: e.trimOut, clipDuration: e.duration }; });
      photoEntries.forEach((e, i) => { trimData[`photo_${i}`] = { trimIn: 0, trimOut: e.duration > 0 ? e.duration : 2, clipDuration: e.duration > 0 ? e.duration : 2 }; });
      fd.append("trimData", JSON.stringify(trimData));
      fd.append("textAnnotations", JSON.stringify(annotations));
      if (selectedAudio) {
        fd.append("audioTrack", selectedAudio);
        fd.append("audioVolume", String(audioVolume));
      }

      const res = await fetch("/api/mobile/signals/compose", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      const { jobId: jid } = await res.json();
      setJobId(jid);

      // Start polling
      const interval = window.setInterval(async () => {
        try {
          const r = await fetch(`/api/mobile/signals/compose/${jid}`);
          const data = await r.json();
          if (data.status === "done") {
            clearInterval(interval);
            await clearSession();
            setPosting(false);
            toast({ title: "Signal posted!", description: "Your Signal is live." });
            setLocation("/mobile/signals");
          } else if (data.status === "error") {
            clearInterval(interval);
            setPosting(false);
            setSheet("category");
            toast({ title: "Processing failed", description: data.errorMessage || "FFmpeg error", variant: "destructive" });
          }
        } catch { /* keep polling */ }
      }, 2000);
      pollIntervalRef.current = interval;
    } catch (err: any) {
      setPosting(false);
      setSheet("category");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mobile-root min-h-screen flex flex-col bg-black items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-red-500 animate-spin" />
        <p className="text-white/50 text-sm">Loading clips…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mobile-root min-h-screen flex flex-col bg-black">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <button onClick={() => setLocation("/mobile/create")} className="text-white/70">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold text-lg">Edit Signal</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-white/40 text-sm text-center">No clips found. Go back and record some clips first.</p>
          <button
            onClick={() => setLocation("/mobile/create")}
            className="px-6 py-3 rounded-full bg-red-500 text-white font-semibold text-sm"
          >
            Back to Recorder
          </button>
        </div>
      </div>
    );
  }

  const currentEntry = entries[currentEntryIdx];

  return (
    <div className="mobile-root min-h-screen flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <button onClick={() => setLocation("/mobile/create")} className="text-white/70 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-base">Edit Signal</h1>
        <button
          onClick={() => setSheet("category")}
          className="px-4 py-1.5 rounded-full bg-red-500 text-white font-semibold text-sm"
        >
          Post
        </button>
      </div>

      {/* Preview player */}
      <div className="relative bg-black shrink-0" style={{ aspectRatio: "9/16", maxHeight: "45vh" }}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
        />
        {/* Hidden preload video */}
        <video ref={nextVideoRef} className="hidden" playsInline muted />

        {/* Active text overlays */}
        {activeAnnotations.map((ann) => (
          <div
            key={ann.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center px-2 py-1 rounded"
            style={{ color: ann.color, fontSize: ann.fontSize, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {ann.text}
          </div>
        ))}

        {/* Play/Pause overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={`w-14 h-14 rounded-full bg-black/40 flex items-center justify-center transition-opacity ${playing ? "opacity-0 hover:opacity-100" : "opacity-100"}`}>
            {playing ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-0.5" />}
          </div>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex justify-around py-3 border-b border-white/10 shrink-0">
        {[
          { icon: Type, label: "Text", action: () => setSheet("text") },
          { icon: Music, label: "Sound", action: () => setSheet("sound") },
          {
            icon: Film, label: "+ Footage", action: () => footageInputRef.current?.click()
          },
          {
            icon: ImageIcon, label: "+ Photo", action: () => photoInputRef.current?.click()
          },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[10px]">{label}</span>
          </button>
        ))}
      </div>

      {/* Hidden file inputs */}
      <input ref={footageInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) addFootage(f); e.target.value = ""; }} />
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />

      {/* Timeline strip */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-3 py-2 shrink-0">
          <p className="text-white/40 text-xs">Timeline · {totalDuration.toFixed(1)}s</p>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-2 px-3 pb-3 items-end" style={{ minWidth: "max-content" }}>
            {entries.map((entry, idx) => (
              <TimelineClip
                key={entry.id}
                entry={entry}
                isActive={idx === currentEntryIdx}
                onClick={() => { setCurrentEntryIdx(idx); setPlaying(false); videoRef.current?.pause(); }}
                onTrimIn={(delta) => handleTrimIn(entry.id, delta)}
                onTrimOut={(delta) => handleTrimOut(entry.id, delta)}
                onRemove={() => removeEntry(entry.id)}
              />
            ))}
            {/* Add clip button */}
            <button
              onClick={() => footageInputRef.current?.click()}
              className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 border-dashed flex items-center justify-center shrink-0 self-center"
            >
              <Plus className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Text annotation bars */}
        {annotations.length > 0 && (
          <div className="px-3 pb-2 shrink-0">
            <div className="flex flex-wrap gap-1">
              {annotations.map((ann) => (
                <div key={ann.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{ background: ann.color + "30", color: ann.color, border: `1px solid ${ann.color}50` }}>
                  <span className="truncate max-w-[80px]">{ann.text}</span>
                  <span className="text-white/40">{ann.startTime.toFixed(0)}s–{ann.endTime.toFixed(0)}s</span>
                  <button onClick={() => setAnnotations((p) => p.filter((a) => a.id !== ann.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected audio bar */}
        {selectedAudio && (
          <div className="px-3 pb-2 shrink-0 flex items-center gap-2">
            <Music className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs">{AUDIO_TRACKS.find(t => t.filename === selectedAudio)?.label}</span>
            <button onClick={() => setSelectedAudio(null)} className="ml-auto">
              <X className="w-3 h-3 text-white/40" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom sheets ──────────────────────────────────────────────────── */}

      {/* Text sheet */}
      {sheet === "text" && (
        <BottomSheet title="Add Text" onClose={() => setSheet("none")}>
          <div className="space-y-4">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Type your text…"
              className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/30"
              maxLength={80}
            />
            <div>
              <p className="text-white/50 text-xs mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {TEXT_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: newColor === c ? "#fff" : "transparent" }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/50 text-xs mb-1">Font size: {newFontSize}px</p>
              <input type="range" min={14} max={48} value={newFontSize}
                onChange={(e) => setNewFontSize(Number(e.target.value))}
                className="w-full accent-red-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/50 text-xs mb-1">Start: {newStartTime.toFixed(1)}s</p>
                <input type="range" min={0} max={Math.max(totalDuration - 0.5, 0)} step={0.5}
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">End: {newEndTime.toFixed(1)}s</p>
                <input type="range" min={0.5} max={Math.max(totalDuration, 0.5)} step={0.5}
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
            </div>
            <button
              onClick={addAnnotation}
              disabled={!newText.trim()}
              className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-40"
            >
              Add to Timeline
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Sound sheet */}
      {sheet === "sound" && (
        <BottomSheet title="Background Music" onClose={() => setSheet("none")}>
          <div className="space-y-2">
            <div>
              <p className="text-white/50 text-xs mb-1">Volume: {Math.round(audioVolume * 100)}%</p>
              <input type="range" min={0} max={1} step={0.05} value={audioVolume}
                onChange={(e) => setAudioVolume(Number(e.target.value))}
                className="w-full accent-green-500" />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {AUDIO_TRACKS.map((track) => (
                <div key={track.filename}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                    ${selectedAudio === track.filename ? "bg-green-500/20 border border-green-500/40" : "bg-white/5 border border-white/10"}`}
                  onClick={() => setSelectedAudio(t => t === track.filename ? null : track.filename)}>
                  <button
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"
                    onClick={(e) => { e.stopPropagation(); previewTrack(track.filename); }}>
                    {previewingTrack === track.filename
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play className="w-4 h-4 text-white ml-0.5" />}
                  </button>
                  <span className="text-white text-sm flex-1">{track.label}</span>
                  {selectedAudio === track.filename && <Check className="w-4 h-4 text-green-400" />}
                </div>
              ))}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Category sheet */}
      {sheet === "category" && (
        <BottomSheet title="Post Signal" onClose={() => setSheet("none")}>
          <div className="space-y-4">
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Add a title…"
              className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/30"
              maxLength={120}
            />
            <div>
              <p className="text-white/50 text-xs mb-2">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {SIGNAL_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-left
                      ${category === cat ? "bg-red-500 text-white" : "bg-white/10 text-white/70"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-white/40 text-xs text-center">This Signal will be posted publicly.</p>
            <button
              onClick={startCompose}
              disabled={!category || posting}
              className="w-full py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-40"
            >
              {posting ? "Uploading…" : "Post Signal"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Processing modal */}
      {sheet === "processing" && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-red-500 animate-spin" />
          <p className="text-white font-semibold">Processing your video…</p>
          <p className="text-white/50 text-sm text-center px-8">
            FFmpeg is stitching and encoding your Signal. This may take a minute.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Timeline Clip component ────────────────────────────────────────────────────

interface TimelineClipProps {
  entry: TimelineEntry;
  isActive: boolean;
  onClick: () => void;
  onTrimIn: (delta: number) => void;
  onTrimOut: (delta: number) => void;
  onRemove: () => void;
}

function TimelineClip({ entry, isActive, onClick, onTrimIn, onTrimOut, onRemove }: TimelineClipProps) {
  const trimInDragRef = useRef<{ startX: number; startVal: number } | null>(null);
  const trimOutDragRef = useRef<{ startX: number; startVal: number } | null>(null);
  const clampedDuration = Math.max(entry.duration - entry.trimIn - entry.trimOut, 0.1);
  const widthPx = Math.max(clampedDuration * 12, THUMB_W + 20);

  const startTrimIn = (clientX: number) => { trimInDragRef.current = { startX: clientX, startVal: entry.trimIn }; };
  const startTrimOut = (clientX: number) => { trimOutDragRef.current = { startX: clientX, startVal: entry.trimOut }; };

  const moveDrag = useCallback((clientX: number) => {
    const PX_PER_SEC = 12;
    if (trimInDragRef.current) {
      const delta = (clientX - trimInDragRef.current.startX) / PX_PER_SEC;
      onTrimIn(delta - (entry.trimIn - trimInDragRef.current.startVal));
    }
    if (trimOutDragRef.current) {
      const delta = (trimOutDragRef.current.startX - clientX) / PX_PER_SEC;
      onTrimOut(delta - (entry.trimOut - trimOutDragRef.current.startVal));
    }
  }, [entry.trimIn, entry.trimOut, onTrimIn, onTrimOut]);

  const endDrag = () => { trimInDragRef.current = null; trimOutDragRef.current = null; };

  useEffect(() => {
    const mm = (e: MouseEvent) => moveDrag(e.clientX);
    const tm = (e: TouchEvent) => moveDrag(e.touches[0].clientX);
    window.addEventListener("mousemove", mm);
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchend", endDrag);
    };
  }, [moveDrag]);

  return (
    <div
      className="relative flex-shrink-0 rounded-lg overflow-visible"
      style={{ width: widthPx, height: THUMB_H + 24 }}
      onClick={onClick}
    >
      {/* Thumbnail strip */}
      <div
        className={`flex rounded-lg overflow-hidden border-2 transition-all ${isActive ? "border-red-500" : "border-transparent"}`}
        style={{ height: THUMB_H }}
      >
        {entry.thumbnails.length > 0
          ? entry.thumbnails.map((t, i) => (
              <img key={i} src={t} className="h-full object-cover" style={{ width: widthPx / entry.thumbnails.length }} alt="" />
            ))
          : <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <span className="text-white/30 text-[10px]">{entry.type === "photo" ? "Photo" : "Clip"}</span>
            </div>
        }
      </div>

      {/* Duration label */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        <span className="text-white/60 text-[9px]">{clampedDuration.toFixed(1)}s</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-white/40 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Trim handles */}
      <div
        className="absolute top-0 bottom-4 left-0 w-3 bg-white/30 rounded-l-lg cursor-ew-resize flex items-center justify-center z-10"
        onMouseDown={(e) => { e.stopPropagation(); startTrimIn(e.clientX); }}
        onTouchStart={(e) => { e.stopPropagation(); startTrimIn(e.touches[0].clientX); }}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>
      <div
        className="absolute top-0 bottom-4 right-0 w-3 bg-white/30 rounded-r-lg cursor-ew-resize flex items-center justify-center z-10"
        onMouseDown={(e) => { e.stopPropagation(); startTrimOut(e.clientX); }}
        onTouchStart={(e) => { e.stopPropagation(); startTrimOut(e.touches[0].clientX); }}
      >
        <div className="w-0.5 h-4 bg-white/70 rounded" />
      </div>
    </div>
  );
}

// ── BottomSheet ────────────────────────────────────────────────────────────────

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-3xl p-5 pb-8 border-t border-white/10 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    });
    v.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(0); });
  });
}
