import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { clearSession, saveClip, saveMetadata } from "@/mobile/lib/clipSession";
import {
  X, RefreshCw, Timer, Sparkles, Type, Smile,
  Trash2, ChevronLeft, Check, Edit3, Upload,
} from "lucide-react";

type RecordingState = 'idle' | 'recording' | 'paused' | 'done' | 'category' | 'uploading';
type Filter = 'none' | 'vivid' | 'mono' | 'cool' | 'warm';

interface TextOverlay {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  background?: string;
}

interface Segment {
  startAt: number;
  endAt: number;
}

const FILTERS: Record<Filter, string> = {
  none: '',
  vivid: 'contrast(1.1) saturate(1.2)',
  mono: 'grayscale(1)',
  cool: 'contrast(1.05) saturate(1.05) hue-rotate(-10deg)',
  warm: 'contrast(1.05) saturate(1.1) hue-rotate(10deg) brightness(1.05)',
};

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

const SIGNAL_CATEGORIES = [
  { label: 'Politicians', emoji: '🏛️' },
  { label: 'Corruption', emoji: '💰' },
  { label: 'Current Events', emoji: '📰' },
  { label: 'Legislation', emoji: '📋' },
  { label: 'Voting & Elections', emoji: '🗳️' },
  { label: 'Justice', emoji: '⚖️' },
  { label: 'Economy', emoji: '💹' },
  { label: 'Community', emoji: '🏘️' },
];

const SEGMENT_COLORS = [
  'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400',
  'bg-cyan-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400',
];

export function SignalRecorderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentStartRef = useRef<number>(0);
  const isHoldingRef = useRef(false);

  const isPremium = user?.subscriptionStatus === 'premium';
  const durationOptions = isPremium ? DURATION_OPTIONS_PAID : DURATION_OPTIONS;

  const [state, setState] = useState<RecordingState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [duration, setDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pendingAction, setPendingAction] = useState<'post' | null>(null);
  const [newText, setNewText] = useState('');

  const totalSegmentDuration = segments.reduce((sum, s) => sum + (s.endAt - s.startAt), 0);

  const initCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      if (isPremium) {
        videoConstraints.width = { ideal: 1920 };
        videoConstraints.height = { ideal: 1080 };
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [facingMode, isPremium, toast]);

  useEffect(() => {
    initCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initCamera]);

  const elapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishRecording = useCallback(() => {
    stopTimer();
    isHoldingRef.current = false;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => setState('done');
      mr.stop();
    } else {
      setState('done');
    }
  }, [stopTimer]);

  const endSegment = useCallback((autoStop = false) => {
    if (!isHoldingRef.current && !autoStop) return;
    isHoldingRef.current = false;
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    const segStart = segmentStartRef.current;
    const segEnd = parseFloat(elapsedRef.current.toFixed(1));
    if (segEnd > segStart) {
      setSegments(segs => [...segs, { startAt: segStart, endAt: segEnd }]);
    }

    setState(s => s === 'recording' ? 'paused' : s);

    if (autoStop) {
      finishRecording();
    }
  }, [stopTimer, finishRecording]);

  const startSegment = useCallback(() => {
    if (!streamRef.current || isHoldingRef.current) return;
    isHoldingRef.current = true;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    if (!mediaRecorderRef.current) {
      const mr = new MediaRecorder(streamRef.current, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    segmentStartRef.current = elapsedRef.current;
    setState('recording');

    timerRef.current = setInterval(() => {
      const next = parseFloat((elapsedRef.current + 0.1).toFixed(1));
      if (next >= duration) {
        elapsedRef.current = duration;
        setElapsed(duration);
        endSegment(true);
        return;
      }
      elapsedRef.current = next;
      setElapsed(next);
    }, 100);
  }, [duration, endSegment]);

  const deleteLastSegment = useCallback(() => {
    if (segments.length === 0) return;
    const newSegs = segments.slice(0, -1);
    setSegments(newSegs);
    const newElapsed = newSegs.length > 0 ? newSegs[newSegs.length - 1].endAt : 0;
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);

    if (newSegs.length === 0) {
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setState('idle');
    } else {
      setState('paused');
    }
  }, [segments]);

  const discardAll = useCallback(async () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    await clearSession();
    setLocation('/mobile');
  }, [stopTimer, setLocation]);

  const handleGoEdit = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    stopTimer();
    isHoldingRef.current = false;

    const mr = mediaRecorderRef.current;
    await new Promise<void>(resolve => {
      if (!mr || mr.state === 'inactive') { resolve(); return; }
      mr.onstop = () => resolve();
      mr.stop();
    });

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const currentElapsed = elapsedRef.current;
    await clearSession();
    await saveClip({
      id: 'main',
      blob,
      duration: currentElapsed,
      timestamp: Date.now(),
    });
    await saveMetadata({
      filter,
      totalDuration: currentElapsed,
      durationLimit: duration,
    });

    streamRef.current?.getTracks().forEach(t => t.stop());
    setState('done');
    setLocation('/mobile/edit');
  }, [filter, duration, stopTimer, setLocation]);

  const handlePostDirect = () => {
    setPendingAction('post');
    setState('category');
  };

  const uploadMutation = useMutation({
    mutationFn: async (category: string) => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });

      const { getCsrfToken } = await import('@/lib/queryClient');
      const token = getCsrfToken();

      const formData = new FormData();
      formData.append('video', blob, 'signal.webm');
      formData.append('title', title);
      formData.append('duration', Math.round(elapsed).toString());
      formData.append('filter', filter);
      formData.append('category', category);
      formData.append('overlays', JSON.stringify({ texts: textOverlays, emojis: [], graphics: [] }));

      const response = await fetch('/api/mobile/signals', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { 'x-csrf-token': token } : {},
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
      toast({ title: 'Signal Posted!', description: 'Your Signal has been shared.' });
      clearSession();
      setLocation('/mobile/signals');
    },
    onError: () => {
      toast({ title: 'Upload Failed', description: 'Could not upload your Signal. Please try again.', variant: 'destructive' });
      setState('done');
    },
  });

  const handleCategoryPost = (cat: string) => {
    setSelectedCategory(cat);
    setState('uploading');
    uploadMutation.mutate(cat);
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const mins = Math.floor(s / 60);
    const remaining = s % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const totalDuration = segments.reduce((s, seg) => s + (seg.endAt - seg.startAt), 0) +
    (state === 'recording' ? elapsed - segmentStartRef.current : 0);

  const recordButtonHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      if (state === 'done' || state === 'category' || state === 'uploading') return;
      if (countdownEnabled && segments.length === 0 && state === 'idle') {
        return;
      }
      startSegment();
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      if (state === 'recording') endSegment();
    },
    onMouseDown: (e: React.MouseEvent) => {
      if (state === 'done' || state === 'category' || state === 'uploading') return;
      startSegment();
    },
    onMouseUp: () => {
      if (state === 'recording') endSegment();
    },
  };

  if (state === 'category') {
    return (
      <div className="mobile-root min-h-screen flex flex-col bg-black">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <button onClick={() => setState('done')} className="text-white/70">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold text-lg">Add a Category</h1>
        </div>

        <div className="flex-1 p-4">
          <p className="text-white/60 text-sm mb-6">Help people discover your Signal</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {SIGNAL_CATEGORIES.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => handleCategoryPost(label)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 ${
                  selectedCategory === label
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-white text-sm font-medium text-left">{label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
            <p className="text-white/50 text-xs text-center">
              🌐 This Signal will be visible to all ACP members and subject to community standards.
            </p>
          </div>

          <input
            type="text"
            placeholder="Add a title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 mb-4"
          />
        </div>
      </div>
    );
  }

  if (state === 'uploading') {
    return (
      <div className="mobile-root min-h-screen flex items-center justify-center bg-black">
        <div className="text-center p-8">
          <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Uploading your Signal...</p>
          <p className="text-white/50 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-root min-h-screen flex flex-col bg-black" data-testid="signal-recorder">
      <div className="flex-1 relative overflow-hidden">

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <button
            onClick={discardAll}
            className="side-control-button"
          >
            <X className="w-5 h-5" />
          </button>

          {(state === 'recording' || state === 'paused') && segments.length > 0 && (
            <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
              {state === 'recording' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-white text-sm font-mono">
                {formatTime(totalDuration)} / {formatTime(duration)}
              </span>
            </div>
          )}

          <div className="w-10" />
        </div>

        {/* Multi-segment progress bar */}
        <div className="absolute top-16 left-4 right-4 z-20 h-1.5 rounded-full bg-white/20 flex gap-0.5 overflow-hidden">
          {segments.map((seg, i) => {
            const pct = ((seg.endAt - seg.startAt) / duration) * 100;
            return (
              <div
                key={i}
                className={`h-full rounded-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
          {state === 'recording' && (
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${((elapsed - segmentStartRef.current) / duration) * 100}%` }}
            />
          )}
        </div>

        {/* Camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: FILTERS[filter],
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Text overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute pointer-events-none text-overlay"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              fontSize: overlay.fontSize,
              color: overlay.color,
              background: overlay.background,
            }}
          >
            {overlay.content}
          </div>
        ))}

        {/* Side controls */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          <button onClick={() => initCamera()} className="side-control-button">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCountdownEnabled(v => !v)}
            className={`side-control-button ${countdownEnabled ? 'bg-red-500' : ''}`}
          >
            <Timer className="w-5 h-5" />
          </button>
          <button onClick={() => setShowFilters(v => !v)} className="side-control-button">
            <Sparkles className="w-5 h-5" />
          </button>
          <button onClick={() => setShowTextEditor(v => !v)} className="side-control-button">
            <Type className="w-5 h-5" />
          </button>
        </div>

        {/* Filter strip */}
        {showFilters && (
          <div className="absolute bottom-36 left-0 right-0 z-20 px-4">
            <div className="flex gap-2 justify-center">
              {(Object.keys(FILTERS) as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    filter === f ? 'bg-red-500 text-white' : 'bg-black/60 text-white/80'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text editor */}
        {showTextEditor && (
          <div className="absolute bottom-36 left-4 right-4 z-20">
            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Add text overlay..."
                className="flex-1 bg-black/70 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-white/40 text-sm"
              />
              <button
                onClick={() => {
                  if (!newText.trim()) return;
                  setTextOverlays(t => [...t, {
                    id: Date.now().toString(),
                    content: newText,
                    x: 50,
                    y: 40,
                    fontSize: 22,
                    color: '#ffffff',
                  }]);
                  setNewText('');
                  setShowTextEditor(false);
                }}
                className="px-3 py-2 bg-red-500 rounded-xl text-white text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-0 right-0 z-20">
          {/* Duration selector (only when no segments recorded yet) */}
          {segments.length === 0 && state === 'idle' && (
            <div className="flex justify-center mb-4">
              <div className="flex gap-1 bg-black/50 rounded-full p-1">
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
          )}

          {/* Done action row */}
          {state === 'done' && (
            <div className="flex justify-center gap-6 mb-6 px-8">
              <button
                onClick={discardAll}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Delete</span>
              </button>
              <button
                onClick={handleGoEdit}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Edit</span>
              </button>
              <button
                onClick={handlePostDirect}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">Post</span>
              </button>
            </div>
          )}

          {/* Record row */}
          {state !== 'done' && (
            <div className="flex items-center justify-center gap-8">
              {/* Delete last segment */}
              <button
                onClick={deleteLastSegment}
                disabled={segments.length === 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  segments.length > 0 ? 'bg-white/20 text-white' : 'bg-white/5 text-white/20'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Record button */}
              <button
                {...recordButtonHandlers}
                className={`relative w-20 h-20 rounded-full border-4 flex items-center justify-center select-none transition-all ${
                  state === 'recording'
                    ? 'border-red-500 bg-red-500 scale-95'
                    : 'border-white bg-white/10'
                }`}
                style={{ touchAction: 'none' }}
                data-testid="record-button"
              >
                <div className={`rounded-full transition-all ${
                  state === 'recording' ? 'w-8 h-8 bg-white rounded-sm' : 'w-14 h-14 bg-red-500 rounded-full'
                }`} />
              </button>

              {/* Done button */}
              <button
                onClick={finishRecording}
                disabled={segments.length === 0 && state !== 'recording'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  segments.length > 0 || state === 'recording'
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/20'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
