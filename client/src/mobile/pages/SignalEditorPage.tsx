import type { ReactNode, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, Type, Music, Film, ImageIcon, Check,
  Play, Pause, Plus, Trash2, X, Camera, Layers, Upload,
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

// ── Thumbnail helpers ──────────────────────────────────────────────────────────

const THUMB_OUT_W = 720;
const THUMB_OUT_H = 1280;

/** Capture first frame of a video blob and center-crop to 9:16 portrait. */
async function generateFirstFrameBlob(blob: Blob): Promise<{ blob: Blob; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;

    const capture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_OUT_W;
      canvas.height = THUMB_OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }

      const vW = video.videoWidth || THUMB_OUT_W;
      const vH = video.videoHeight || THUMB_OUT_H;
      const targetR = THUMB_OUT_W / THUMB_OUT_H;
      const videoR = vW / vH;
      let sx = 0, sy = 0, sw = vW, sh = vH;
      if (videoR > targetR) { sw = Math.round(vH * targetR); sx = Math.round((vW - sw) / 2); }
      else { sh = Math.round(vW / targetR); sy = Math.round((vH - sh) / 2); }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, THUMB_OUT_W, THUMB_OUT_H);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      canvas.toBlob((b) => resolve(b ? { blob: b, dataUrl } : null), "image/jpeg", 0.85);
    };

    video.addEventListener("loadeddata", () => { video.currentTime = 0; }, { once: true });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(null); }, { once: true });
    video.load();
  });
}

/**
 * Load an image File and center-crop it to 9:16 portrait (720×1280).
 * Enforces the correct aspect ratio for Signal thumbnails.
 */
async function cropImageTo916(file: File): Promise<{ blob: Blob; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_OUT_W;
      canvas.height = THUMB_OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }

      const iW = img.naturalWidth;
      const iH = img.naturalHeight;
      const targetR = THUMB_OUT_W / THUMB_OUT_H;
      const imgR = iW / iH;
      let sx = 0, sy = 0, sw = iW, sh = iH;
      if (imgR > targetR) { sw = Math.round(iH * targetR); sx = Math.round((iW - sw) / 2); }
      else { sh = Math.round(iW / targetR); sy = Math.round((iH - sh) / 2); }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_OUT_W, THUMB_OUT_H);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      canvas.toBlob((b) => resolve(b ? { blob: b, dataUrl } : null), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
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
  // Photo playback timer
  const photoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active bottom sheet
  const [sheet, setSheet] = useState<"none" | "text" | "sound" | "category" | "processing" | "addMedia" | "thumbnail">("none");

  // Clips track container ref for auto-stretch
  const clipsContainerRef = useRef<HTMLDivElement>(null);
  const [clipsContainerWidth, setClipsContainerWidth] = useState(0);
  useEffect(() => {
    const el = clipsContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setClipsContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  // Thumbnail
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const thumbnailCameraRef = useRef<HTMLInputElement>(null);

  // ── Load clips from IDB ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const clips = await getClips();
      if (cancelled) return;

      const built: TimelineEntry[] = await Promise.all(
        clips.map(async (clip) => {
          const isPhoto = clip.id.startsWith("photo-");
          const thumbs = isPhoto
            ? await generatePhotoThumb(clip.blob)
            : await generateThumbnails(clip.blob, THUMB_PER_CLIP);
          return {
            id: clip.id,
            type: isPhoto ? ("photo" as const) : ("clip" as const),
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

        // Auto-generate thumbnail from first entry (first frame of first clip, or first photo)
        if (built.length > 0) {
          const first = built[0];
          if (first.type === "clip") {
            generateFirstFrameBlob(first.blob).then((result) => {
              if (result && !cancelled) {
                setThumbnailBlob(result.blob);
                setThumbnailDataUrl(result.dataUrl);
              }
            });
          } else {
            // Photo: use the already-generated thumbnail data URL
            const dataUrl = first.thumbnails[0];
            if (dataUrl) {
              setThumbnailDataUrl(dataUrl);
              fetch(dataUrl).then(r => r.blob()).then(b => { if (!cancelled) setThumbnailBlob(b); });
            }
          }
        }
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

  // ── Preview player — sequential src-swap with photo support ─────────────

  // Clear photo timer helper
  const clearPhotoTimer = () => {
    if (photoTimerRef.current) { clearTimeout(photoTimerRef.current); photoTimerRef.current = null; }
  };

  // Advance to next entry (shared by video onEnded and photo timer)
  const handleEnded = useCallback(() => {
    clearPhotoTimer();
    const nextIdx = currentEntryIdx + 1;
    if (nextIdx < entries.length) {
      setCurrentEntryIdx(nextIdx);
    } else {
      setPlaying(false);
      setCurrentEntryIdx(0);
    }
  }, [currentEntryIdx, entries.length]);

  const loadEntry = useCallback((idx: number) => {
    clearPhotoTimer();
    const entry = entries[idx];
    if (!entry) return;
    const v = videoRef.current;

    if (entry.type === "photo") {
      // Photos: pause video, show image overlay; schedule advance after display duration
      if (v) { v.pause(); v.src = ""; }
      if (playing) {
        const displayDur = Math.max(0.1, entry.duration - entry.trimIn - entry.trimOut) * 1000;
        photoTimerRef.current = setTimeout(handleEnded, displayDur);
      }
    } else {
      // Clips: load into video element
      if (!v || idx >= blobUrlsRef.current.length) return;
      v.src = blobUrlsRef.current[idx];
      v.currentTime = entry.trimIn;
      if (playing) v.play().catch(() => {});
    }
  }, [entries, playing, handleEnded]);

  useEffect(() => {
    loadEntry(currentEntryIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntryIdx, blobUrlsRef.current.length]);

  // Preload next clip (skip photos)
  useEffect(() => {
    const nv = nextVideoRef.current;
    const nextIdx = currentEntryIdx + 1;
    if (nv && nextIdx < entries.length && entries[nextIdx]?.type === "clip") {
      nv.src = blobUrlsRef.current[nextIdx] ?? "";
    }
  }, [currentEntryIdx, blobUrlsRef.current.length, entries]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const entry = entries[currentEntryIdx];
    if (!entry || entry.type === "photo") return;
    const elapsed = v.currentTime - entry.trimIn;
    const totalBefore = entries.slice(0, currentEntryIdx).reduce((s, e) => s + Math.max(0, e.duration - e.trimIn - e.trimOut), 0);
    setCurrentTime(totalBefore + Math.max(0, elapsed));

    // Honor trimOut: stop clip when reaching the trimmed end
    const stopAt = entry.trimOut > 0 ? entry.duration - entry.trimOut : entry.duration;
    if (v.currentTime >= stopAt) handleEnded();
  }, [entries, currentEntryIdx, handleEnded]);

  const togglePlay = () => {
    const entry = entries[currentEntryIdx];
    if (!entry) return;
    if (playing) {
      clearPhotoTimer();
      videoRef.current?.pause();
      setPlaying(false);
    } else {
      if (entry.type === "clip") {
        videoRef.current?.play().catch(() => {});
      } else {
        // For photo entry: start a timer to advance
        const displayDur = Math.max(0.1, entry.duration - entry.trimIn - entry.trimOut) * 1000;
        photoTimerRef.current = setTimeout(handleEnded, displayDur);
      }
      setPlaying(true);
    }
  };

  // Cleanup photo timer on unmount
  useEffect(() => () => clearPhotoTimer(), []);

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
    const id = `photo-${Date.now()}`;
    const entry: TimelineEntry = {
      id,
      type: "photo",
      blob,
      duration: 2,  // default 2s display duration
      trimIn: 0,
      trimOut: 0,
      thumbnails: thumbs,
    };
    setEntries((prev) => [...prev, entry]);
    setPhotoBlobs((prev) => [...prev, { id, blob }]);
    // Persist photo to IDB so it survives page reload (same store as clips)
    await saveClip({ id, blob, duration: 2, timestamp: Date.now() });
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

  // ── Thumbnail pick handlers ───────────────────────────────────────────────

  const handleThumbnailPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast({ title: "Please select an image file", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const result = await cropImageTo916(file);
    if (result) {
      setThumbnailDataUrl(result.dataUrl);
      setThumbnailBlob(result.blob);
      toast({ title: "Thumbnail updated", description: "Auto-cropped to 9:16 portrait." });
    } else {
      toast({ title: "Couldn't load image", variant: "destructive" });
    }
    e.target.value = "";
  };

  // ── Compose / Post ────────────────────────────────────────────────────────

  const totalDuration = entries.reduce((s, e) => s + (e.duration - e.trimIn - e.trimOut), 0);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!t || tags.length >= 5 || tags.includes(t)) { setTagInput(""); return; }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const startCompose = async () => {
    if (entries.length === 0) { toast({ title: "No clips to post", variant: "destructive" }); return; }

    setPosting(true);
    setSheet("processing");

    try {
      const fd = new FormData();
      fd.append("title", postTitle);
      if (category) fd.append("category", category);
      // Tags: up to 5 user tags, category prepended if selected
      const allTags = category ? [category, ...tags] : tags;
      fd.append("tags", JSON.stringify(allTags));

      // Assign field names and build ordered timeline manifest
      let clipIdx = 0;
      let photoIdx = 0;
      const timelineManifest: Array<{ type: "clip" | "photo"; field: string }> = [];
      const trimData: Record<string, { trimIn: number; trimOut: number; clipDuration: number }> = {};

      for (const e of entries) {
        if (e.type === "clip") {
          const field = `clip_${clipIdx++}`;
          fd.append(field, e.blob, `${field}.webm`);
          trimData[field] = { trimIn: e.trimIn, trimOut: e.trimOut, clipDuration: e.duration };
          timelineManifest.push({ type: "clip", field });
        } else {
          const field = `photo_${photoIdx++}`;
          fd.append(field, e.blob, `${field}.jpg`);
          const displayDur = Math.max(0.5, e.duration - e.trimOut);
          trimData[field] = { trimIn: 0, trimOut: displayDur, clipDuration: e.duration };
          timelineManifest.push({ type: "photo", field });
        }
      }

      fd.append("timeline", JSON.stringify(timelineManifest));
      fd.append("trimData", JSON.stringify(trimData));
      fd.append("textAnnotations", JSON.stringify(annotations));
      if (selectedAudio) {
        fd.append("audioTrack", selectedAudio);
        fd.append("audioVolume", String(audioVolume));
      }
      // Include thumbnail (auto-generated or user-selected)
      if (thumbnailBlob) {
        fd.append("thumbnail", thumbnailBlob, "thumbnail.jpg");
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
      <div className="relative bg-black shrink-0" style={{ aspectRatio: "9/16", maxHeight: "62vh" }}>
        {/* Video element — visible only for clip entries */}
        <video
          ref={videoRef}
          className={`w-full h-full object-contain ${currentEntry?.type === "photo" ? "hidden" : "block"}`}
          playsInline
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
        />
        {/* Photo preview — visible only for photo entries */}
        {currentEntry?.type === "photo" && (
          <img
            src={blobUrlsRef.current[currentEntryIdx] ?? ""}
            className="w-full h-full object-contain"
            alt="Photo preview"
          />
        )}
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

        {/* Scrubber bar with tap-to-pin for text annotations */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 flex items-center px-2 cursor-pointer"
          title="Tap to set text pin time"
          onClick={(e) => {
            if (totalDuration <= 0) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const t = ratio * totalDuration;
            setNewStartTime(parseFloat(t.toFixed(1)));
            setNewEndTime(parseFloat(Math.min(t + 3, totalDuration).toFixed(1)));
          }}
        >
          <div className="w-full h-1 bg-white/20 rounded-full relative">
            <div
              className="absolute left-0 top-0 h-full bg-red-500 rounded-full"
              style={{ width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Thumbnail button — centered below preview */}
      <div className="flex justify-center py-1.5 shrink-0">
        <button
          onClick={() => setSheet("thumbnail")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-xs hover:bg-white/20 active:bg-white/25 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Change Thumbnail
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={footageInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) addFootage(f); e.target.value = ""; }} />
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden"
        onChange={handleThumbnailPick} />
      <input ref={thumbnailCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={handleThumbnailPick} />

      {/* ── 3-track Timeline ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-white/10">

        {/* Header */}
        <div className="px-3 pt-2 pb-1 shrink-0">
          <p className="text-white/40 text-xs">Timeline · {totalDuration.toFixed(1)}s</p>
        </div>

        {/* Track 1 — Overlays */}
        <div className="flex items-center gap-0 shrink-0 px-3 pb-2">
          {/* Label */}
          <div className="w-14 shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-white/40" />
            <span className="text-white/40 text-[10px]">Overlays</span>
          </div>
          {/* Content — annotation pills */}
          <div className="flex-1 overflow-x-auto">
            {annotations.length > 0 ? (
              <div className="flex gap-1.5" style={{ minWidth: "max-content" }}>
                {annotations.map((ann) => (
                  <div key={ann.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs shrink-0"
                    style={{ background: ann.color + "25", color: ann.color, border: `1px solid ${ann.color}40` }}>
                    <Type className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate max-w-[60px]">{ann.text}</span>
                    <span className="text-white/30">{ann.startTime.toFixed(0)}s</span>
                    <button onClick={() => setAnnotations((p) => p.filter((a) => a.id !== ann.id))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-white/20 text-xs italic">No overlays</span>
            )}
          </div>
          {/* + add text overlay */}
          <button
            onClick={() => setSheet("text")}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 border-dashed flex items-center justify-center shrink-0 ml-2"
          >
            <Plus className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Track 2 — Clips */}
        <div className="flex items-center gap-0 shrink-0 px-3 pb-2">
          {/* Label */}
          <div className="w-14 shrink-0 flex items-center gap-1">
            <Film className="w-3 h-3 text-white/40" />
            <span className="text-white/40 text-[10px]">Clips</span>
          </div>
          {/* Stretched clips — fills available space */}
          <div ref={clipsContainerRef} className="flex-1 overflow-hidden">
            {(() => {
              const pxPerSec = totalDuration > 0 && clipsContainerWidth > 0
                ? clipsContainerWidth / totalDuration
                : 12;
              return (
                <div className="flex gap-0.5 items-end w-full">
                  {entries.map((entry, idx) => (
                    <TimelineClip
                      key={entry.id}
                      entry={entry}
                      isActive={idx === currentEntryIdx}
                      pxPerSec={pxPerSec}
                      onClick={() => { setCurrentEntryIdx(idx); setPlaying(false); videoRef.current?.pause(); }}
                      onTrimIn={(delta) => handleTrimIn(entry.id, delta)}
                      onTrimOut={(delta) => handleTrimOut(entry.id, delta)}
                      onRemove={() => removeEntry(entry.id)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
          {/* + add video or photo */}
          <button
            onClick={() => setSheet("addMedia")}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 border-dashed flex items-center justify-center shrink-0 ml-2"
          >
            <Plus className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Track 3 — Sound */}
        <div className="flex items-center gap-0 shrink-0 px-3 pb-2">
          {/* Label */}
          <div className="w-14 shrink-0 flex items-center gap-1">
            <Music className="w-3 h-3 text-white/40" />
            <span className="text-white/40 text-[10px]">Sound</span>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-x-auto">
            {selectedAudio ? (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 w-fit">
                <Music className="w-3 h-3 text-green-400 shrink-0" />
                <span className="text-green-400 text-xs whitespace-nowrap">
                  {AUDIO_TRACKS.find(t => t.filename === selectedAudio)?.label}
                </span>
                <button onClick={() => setSelectedAudio(null)} className="ml-1">
                  <X className="w-3 h-3 text-green-400/60" />
                </button>
              </div>
            ) : (
              <span className="text-white/20 text-xs italic">No sound added</span>
            )}
          </div>
          {/* + add sound */}
          <button
            onClick={() => setSheet("sound")}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 border-dashed flex items-center justify-center shrink-0 ml-2"
          >
            <Plus className="w-4 h-4 text-white/50" />
          </button>
        </div>

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
                <input type="range" min={0} max={Math.max(totalDuration - 0.5, 0)} step={0.1}
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">End: {newEndTime.toFixed(1)}s</p>
                <input type="range" min={0.5} max={Math.max(totalDuration, 0.5)} step={0.1}
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
            </div>
            <p className="text-white/30 text-[10px] text-center">Tip: tap the progress bar above to pin start time</p>
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
              <p className="text-white/50 text-xs mb-2">Category <span className="text-white/30">(optional)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {SIGNAL_CATEGORIES.map((cat) => (
                  <button key={cat}
                    onClick={() => setCategory((prev) => prev === cat ? "" : cat)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-left
                      ${category === cat ? "bg-red-500 text-white" : "bg-white/10 text-white/70"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-white/50 text-xs mb-2">Tags <span className="text-white/30">({tags.length}/5)</span></p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs">
                      <span className="text-white/50">#</span>{tag}
                      <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="ml-0.5">
                        <X className="w-3 h-3 text-white/50" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {tags.length < 5 && (
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag…"
                    className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
                    maxLength={32}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium disabled:opacity-40 active:bg-white/20"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
            {/* Thumbnail picker */}
            <div>
              <p className="text-white/50 text-xs mb-2">Thumbnail</p>
              <div className="flex gap-3 items-start">
                {/* Preview */}
                <div className="shrink-0 rounded-lg overflow-hidden border border-white/20"
                  style={{ width: 48, aspectRatio: "9/16" }}>
                  {thumbnailDataUrl
                    ? <img src={thumbnailDataUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                    : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white/30" />
                      </div>
                  }
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-2 flex-1">
                  <button type="button" onClick={() => thumbnailInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-white/10 text-white/70 text-sm text-left flex items-center gap-2 active:bg-white/20">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span>Upload from Library</span>
                  </button>
                  <button type="button" onClick={() => thumbnailCameraRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-white/10 text-white/70 text-sm text-left flex items-center gap-2 active:bg-white/20">
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
              <p className="text-white/30 text-[10px] mt-1.5">
                {thumbnailDataUrl ? "Auto-cropped to 9:16 portrait — tap above to change." : "Using first frame. Tap above to choose a different image."}
              </p>
            </div>

            <p className="text-white/40 text-xs text-center">This Signal will be posted publicly.</p>
            <button
              onClick={startCompose}
              disabled={posting}
              className="w-full py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-40"
            >
              {posting ? "Uploading…" : "Post Signal"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Add Media sheet */}
      {sheet === "addMedia" && (
        <BottomSheet title="Add to Timeline" onClose={() => setSheet("none")}>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setSheet("none"); footageInputRef.current?.click(); }}
              className="flex flex-col items-center gap-3 py-5 rounded-2xl bg-white/10 active:bg-white/20"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Film className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Add Video</span>
            </button>
            <button
              onClick={() => { setSheet("none"); photoInputRef.current?.click(); }}
              className="flex flex-col items-center gap-3 py-5 rounded-2xl bg-white/10 active:bg-white/20"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Add Photo</span>
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Thumbnail sheet */}
      {sheet === "thumbnail" && (
        <BottomSheet title="Change Thumbnail" onClose={() => setSheet("none")}>
          <div className="flex gap-3 items-start mb-4">
            <div className="shrink-0 rounded-xl overflow-hidden border border-white/20" style={{ width: 56, aspectRatio: "9/16" }}>
              {thumbnailDataUrl
                ? <img src={thumbnailDataUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white/30" />
                  </div>
              }
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <button
                onClick={() => { setSheet("none"); thumbnailInputRef.current?.click(); }}
                className="py-3 px-4 rounded-xl bg-white/10 text-white text-sm text-left flex items-center gap-2 active:bg-white/20"
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                Upload from Library
              </button>
              <button
                onClick={() => { setSheet("none"); thumbnailCameraRef.current?.click(); }}
                className="py-3 px-4 rounded-xl bg-white/10 text-white text-sm text-left flex items-center gap-2 active:bg-white/20"
              >
                <Camera className="w-4 h-4 shrink-0" />
                Take Photo
              </button>
            </div>
          </div>
          <p className="text-white/30 text-xs">Images are auto-cropped to 9:16 portrait.</p>
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
  pxPerSec: number;
  onClick: () => void;
  onTrimIn: (delta: number) => void;
  onTrimOut: (delta: number) => void;
  onRemove: () => void;
}

function TimelineClip({ entry, isActive, pxPerSec, onClick, onTrimIn, onTrimOut, onRemove }: TimelineClipProps) {
  const trimInDragRef = useRef<{ startX: number; startVal: number } | null>(null);
  const trimOutDragRef = useRef<{ startX: number; startVal: number } | null>(null);
  const clampedDuration = Math.max(entry.duration - entry.trimIn - entry.trimOut, 0.1);
  const widthPx = Math.max(clampedDuration * pxPerSec, THUMB_W + 20);

  const startTrimIn = (clientX: number) => { trimInDragRef.current = { startX: clientX, startVal: entry.trimIn }; };
  const startTrimOut = (clientX: number) => { trimOutDragRef.current = { startX: clientX, startVal: entry.trimOut }; };

  const moveDrag = useCallback((clientX: number) => {
    if (trimInDragRef.current) {
      const delta = (clientX - trimInDragRef.current.startX) / pxPerSec;
      onTrimIn(delta - (entry.trimIn - trimInDragRef.current.startVal));
    }
    if (trimOutDragRef.current) {
      const delta = (trimOutDragRef.current.startX - clientX) / pxPerSec;
      onTrimOut(delta - (entry.trimOut - trimOutDragRef.current.startVal));
    }
  }, [entry.trimIn, entry.trimOut, onTrimIn, onTrimOut, pxPerSec]);

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
