import { useLocation } from "wouter";
import { Camera, Link as LinkIcon, Upload, X, CheckCircle2, AlertCircle, Youtube } from "lucide-react";
import { useRef, useState } from "react";
import { clearSession, saveClip } from "@/mobile/lib/clipSession";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { validatePastedSignalUrl } from "@/mobile/lib/signal-video-utils";

const DURATION_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '60s', value: 60 },
  { label: '3 min', value: 180 },
];
const DURATION_OPTIONS_PAID = [
  { label: '15s', value: 15 },
  { label: '60s', value: 60 },
  { label: '3 min', value: 180 },
  { label: '10 min', value: 600 },
];

function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) { resolve(2); return; }
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    const fallback = setTimeout(() => { URL.revokeObjectURL(url); resolve(5); }, 5000);
    v.addEventListener("loadedmetadata", () => {
      clearTimeout(fallback);
      const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 5;
      URL.revokeObjectURL(url);
      resolve(dur);
    }, { once: true });
    v.addEventListener("error", () => { clearTimeout(fallback); URL.revokeObjectURL(url); resolve(5); }, { once: true });
  });
}

export function SignalChoicePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [mode, setMode] = useState<'choice' | 'paste'>('choice');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const isPremium = user?.subscriptionStatus === 'premium';
  const durationOptions = isPremium ? DURATION_OPTIONS_PAID : DURATION_OPTIONS;

  // Live URL validation result
  const urlValidation = videoUrl.trim() ? validatePastedSignalUrl(videoUrl) : null;

  const handleRecordVideo = async () => {
    await clearSession();
    setLocation(`/mobile/signals/record?duration=${duration}`);
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await clearSession();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith("image/");
        const dur = await getMediaDuration(file);
        const id = isImage ? `photo-upload-${Date.now()}-${i}` : `upload-${Date.now()}-${i}`;
        const blob = isImage ? file : new Blob([file], { type: file.type.startsWith("video/") ? file.type : "video/mp4" });
        await saveClip({ id, blob, duration: dur, timestamp: Date.now() + i });
      }
      setLocation("/mobile/edit");
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const validation = validatePastedSignalUrl(videoUrl);
      if (!validation.valid) throw new Error(validation.error ?? 'Invalid URL');

      const token = await fetchCsrfToken();
      const res = await fetch('/api/mobile/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        credentials: 'include',
        body: JSON.stringify({ videoUrl: validation.canonicalUrl, title }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to post signal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
      toast({ title: 'Signal Posted!' });
      setLocation('/mobile/signals');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (mode === 'paste') {
    return (
      <div className="mobile-root min-h-screen flex flex-col bg-black">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <button onClick={() => setMode('choice')} className="text-white/70">
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold text-lg">Paste Video Link</h1>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* URL input */}
          <div className="space-y-1.5">
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="YouTube or TikTok link, or .mp4 URL…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />

            {/* Validation feedback */}
            {urlValidation && (
              <div
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  urlValidation.valid
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {urlValidation.valid
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                }
                <span>
                  {urlValidation.valid
                    ? urlValidation.type === 'youtube'
                      ? 'YouTube video detected — will display as an embedded player'
                      : urlValidation.type === 'tiktok'
                      ? 'TikTok video detected — will display as an embedded player'
                      : 'Direct video URL — will play natively'
                    : urlValidation.error}
                </span>
              </div>
            )}
          </div>

          {/* YouTube thumbnail preview */}
          {urlValidation?.valid && urlValidation.type === 'youtube' && urlValidation.youtubeThumbnailUrl && (
            <div className="rounded-xl overflow-hidden aspect-video bg-black relative">
              <img
                src={urlValidation.youtubeThumbnailUrl}
                alt="YouTube thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Youtube className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* TikTok note */}
          {urlValidation?.valid && urlValidation.type === 'tiktok' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 text-xs">
              <span>🎵</span>
              <span>TikTok videos will open inside the Signal feed as an embedded player.</span>
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />

          <button
            onClick={() => submitMutation.mutate()}
            disabled={!urlValidation?.valid || submitMutation.isPending}
            className="w-full py-3 bg-red-500 rounded-xl text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {submitMutation.isPending ? 'Posting…' : 'Post Signal'}
          </button>

          <p className="text-white/30 text-xs text-center">
            Supported: YouTube links · TikTok links · Direct .mp4 / .webm URLs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-root min-h-screen flex flex-col bg-black">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={() => setLocation('/mobile/create')} className="text-white/70">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-lg">Signal Video</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 gap-4">
        <p className="text-white/60 text-sm text-center mb-2">
          How do you want to create your Signal?
        </p>

        <div className="flex justify-center mb-4">
          <div className="flex gap-1 bg-white/10 rounded-full p-1">
            {durationOptions.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  duration === value ? 'bg-red-500 text-white' : 'text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRecordVideo}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 hover:border-red-400/50 active:scale-[0.98] transition-all"
          data-testid="record-video-option"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">Record Video</p>
            <p className="text-white/50 text-sm mt-0.5">Use your camera to record a new Signal</p>
          </div>
        </button>

        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all disabled:opacity-50"
          data-testid="upload-media-option"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">{uploading ? "Importing…" : "Upload Media"}</p>
            <p className="text-white/50 text-sm mt-0.5">Import videos or photos from your device</p>
          </div>
        </button>

        <input
          ref={uploadInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={handleUploadFiles}
        />

        <button
          onClick={() => setMode('paste')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all"
          data-testid="paste-link-option"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
            <LinkIcon className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">Paste Link</p>
            <p className="text-white/50 text-sm mt-0.5">Share a YouTube or TikTok video link</p>
          </div>
        </button>
      </div>
    </div>
  );
}
