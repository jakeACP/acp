import { useLocation } from "wouter";
import { Camera, Link as LinkIcon, X } from "lucide-react";
import { useState } from "react";
import { clearSession } from "@/mobile/lib/clipSession";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export function SignalChoicePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState('');
  const [mode, setMode] = useState<'choice' | 'paste'>('choice');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const { toast } = useToast();

  const isPremium = user?.subscriptionStatus === 'premium';
  const durationOptions = isPremium ? DURATION_OPTIONS_PAID : DURATION_OPTIONS;

  const handleRecordVideo = async () => {
    await clearSession();
    setLocation(`/mobile/create?duration=${duration}`);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mobile/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl, title }),
      });
      if (!res.ok) throw new Error('Failed to post signal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
      toast({ title: 'Signal Posted!' });
      setLocation('/mobile/signals');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not post Signal.', variant: 'destructive' });
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
          <input
            type="url"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="YouTube, TikTok, or video URL..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30"
          />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30"
          />
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!videoUrl.trim() || submitMutation.isPending}
            className="w-full py-3 bg-red-500 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            {submitMutation.isPending ? 'Posting...' : 'Post Signal'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-root min-h-screen flex flex-col bg-black">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={() => setLocation('/mobile')} className="text-white/70">
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
          onClick={() => setMode('paste')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all"
          data-testid="paste-link-option"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
            <LinkIcon className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">Paste Link</p>
            <p className="text-white/50 text-sm mt-0.5">Share a YouTube, TikTok, or other video link</p>
          </div>
        </button>
      </div>
    </div>
  );
}
