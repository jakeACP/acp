import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  clearSession, saveClip, getClips, deleteLastClip, saveMetadata,
  type ClipEntry,
} from "@/mobile/lib/clipSession";
import {
  X, RefreshCw, Timer, Sparkles, Type, Smile,
  Trash2, Check, Edit3, Upload, ChevronLeft,
} from "lucide-react";

type RecordingState = 'idle' | 'countdown' | 'recording' | 'between' | 'done' | 'category' | 'uploading';
type Filter = 'none' | 'vivid' | 'mono' | 'cool' | 'warm';

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

const EMOJI_OPTIONS = ['🔥', '✊', '🏛️', '⚖️', '💰', '🗳️', '📢', '🇺🇸', '❌', '✅'];

interface TextOverlay {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

interface SegmentUI {
  clipId: string;
  duration: number;
}

export function SignalRecorderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentMRRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef(0);
  const segmentStartRef = useRef(0);
  const isHoldingRef = useRef(false);
  const isCountdownHoldingRef = useRef(false);
  const isInitialized = useRef(false);

  const isPremium = user?.subscriptionStatus === 'premium';
  const durationOptions = isPremium ? DURATION_OPTIONS_PAID : DURATION_OPTIONS;

  const [state, setState] = useState<RecordingState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [duration, setDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [segments, setSegments] = useState<SegmentUI[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newText, setNewText] = useState('');

  const hydrateFromIDB = useCallback(async () => {
    const clips = await getClips();
    if (clips.length > 0) {
      const totalElapsed = clips.reduce((s, c) => s + c.duration, 0);
      elapsedRef.current = totalElapsed;
      setElapsed(totalElapsed);
      setSegments(clips.map(c => ({ clipId: c.id, duration: c.duration })));
      setState('between');
    }
  }, []);

  const initCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: facingMode },
      };
      if (!isPremium) {
        videoConstraints.width = { ideal: 1280 };
        videoConstraints.height = { ideal: 720 };
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
    if (!isInitialized.current) {
      isInitialized.current = true;
      hydrateFromIDB();
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [initCamera]);

  const handleFlipCamera = useCallback(() => {
    setFacingMode(m => m === 'user' ? 'environment' : 'user');
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopCurrentClip = useCallback(async (autoFinish = false) => {
    if (!isHoldingRef.current && !autoFinish) return;
    isHoldingRef.current = false;
    stopTimer();

    const mr = currentMRRef.current;
    const clipDuration = parseFloat((elapsedRef.current - segmentStartRef.current).toFixed(1));

    if (!mr || mr.state === 'inactive') {
      if (autoFinish) setState('done');
      else setState('between');
      return;
    }

    await new Promise<void>(resolve => {
      mr.onstop = async () => {
        if (clipDuration > 0.2 && currentChunksRef.current.length > 0) {
          const blob = new Blob(currentChunksRef.current, { type: 'video/webm' });
          const clipId = `clip-${Date.now()}`;
          await saveClip({ id: clipId, blob, duration: clipDuration, timestamp: Date.now() });
          setSegments(prev => [...prev, { clipId, duration: clipDuration }]);
        }
        currentMRRef.current = null;
        currentChunksRef.current = [];
        resolve();
      };
      mr.stop();
    });

    if (autoFinish) {
      setState('done');
    } else {
      setState('between');
    }
  }, [stopTimer]);

  const startActualRecording = useCallback(() => {
    if (!streamRef.current) return;
    isHoldingRef.current = true;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    currentChunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) currentChunksRef.current.push(e.data);
    };
    currentMRRef.current = mr;
    mr.start(100);
    segmentStartRef.current = elapsedRef.current;
    setState('recording');

    timerRef.current = setInterval(() => {
      const next = parseFloat((elapsedRef.current + 0.1).toFixed(1));
      if (next >= duration) {
        elapsedRef.current = duration;
        setElapsed(duration);
        stopCurrentClip(true);
        return;
      }
      elapsedRef.current = next;
      setElapsed(next);
    }, 100);
  }, [duration, stopCurrentClip]);

  const handleHoldStart = useCallback(() => {
    if (state === 'done' || state === 'category' || state === 'uploading' || state === 'countdown') return;
    if (state !== 'idle' && state !== 'between') return;

    if (countdownEnabled && segments.length === 0) {
      let count = 3;
      isCountdownHoldingRef.current = true;
      setCountdown(count);
      setState('countdown');
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          if (isCountdownHoldingRef.current) {
            startActualRecording();
          } else {
            setState('idle');
          }
        } else {
          setCountdown(count);
        }
      }, 1000);
      return;
    }

    startActualRecording();
  }, [state, countdownEnabled, segments.length, startActualRecording]);

  const handleHoldEnd = useCallback(() => {
    isCountdownHoldingRef.current = false;
    if (state === 'recording') {
      stopCurrentClip(false);
    }
    if (state === 'countdown' && countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setState('idle');
    }
  }, [state, stopCurrentClip]);

  const handleFinishPress = useCallback(() => {
    if (state === 'recording') {
      stopCurrentClip(true);
    } else if (segments.length > 0) {
      setState('done');
    }
  }, [state, segments.length, stopCurrentClip]);

  useEffect(() => {
    const btn = recordButtonRef.current;
    if (!btn) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleHoldStart();
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleHoldEnd();
    };

    btn.addEventListener('touchstart', onTouchStart, { passive: false });
    btn.addEventListener('touchend', onTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      btn.removeEventListener('touchstart', onTouchStart);
      btn.removeEventListener('touchend', onTouchEnd);
      btn.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleHoldStart, handleHoldEnd]);

  const deleteLastSegment = useCallback(async () => {
    if (segments.length === 0) return;
    await deleteLastClip();
    const updatedClips = await getClips();
    const newElapsed = updatedClips.reduce((sum, c) => sum + c.duration, 0);
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);
    setSegments(updatedClips.map(c => ({ clipId: c.id, duration: c.duration })));
    if (updatedClips.length === 0) {
      setState('idle');
    } else {
      setState('between');
    }
  }, [segments]);

  const discardAndGoChoice = useCallback(async () => {
    stopTimer();
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (currentMRRef.current && currentMRRef.current.state !== 'inactive') {
      currentMRRef.current.stop();
    }
    currentMRRef.current = null;
    currentChunksRef.current = [];
    streamRef.current?.getTracks().forEach(t => t.stop());
    await clearSession();
    setLocation('/mobile/signal-choice');
  }, [stopTimer, setLocation]);

  const exitRecorder = useCallback(async () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
    await clearSession();
    setLocation('/mobile');
  }, [stopTimer, setLocation]);

  const handleGoEdit = useCallback(async () => {
    const clips = await getClips();
    if (clips.length === 0) return;

    await saveMetadata({
      filter,
      totalDuration: elapsedRef.current,
      durationLimit: duration,
      category: selectedCategory || undefined,
      clipIds: clips.map(c => c.id),
      clipDurations: clips.map(c => c.duration),
    });

    streamRef.current?.getTracks().forEach(t => t.stop());
    setLocation('/mobile/edit');
  }, [filter, duration, selectedCategory, setLocation]);

  const uploadMutation = useMutation({
    mutationFn: async (category: string) => {
      const clips = await getClips();
      if (clips.length === 0) throw new Error('No clips recorded');

      const { getCsrfToken } = await import('@/lib/queryClient');
      const token = getCsrfToken();

      const formData = new FormData();
      clips.forEach((clip, i) => {
        formData.append(`clip_${i}`, clip.blob, `clip_${i}.webm`);
      });
      formData.append('clipCount', clips.length.toString());
      formData.append('title', title);
      formData.append('duration', Math.round(elapsedRef.current).toString());
      formData.append('filter', filter);
      formData.append('category', category);
      formData.append('overlays', JSON.stringify({ texts: textOverlays }));

      const response = await fetch('/api/mobile/signals/stitch', {
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
    onError: (err: any) => {
      toast({ title: 'Upload Failed', description: err.message || 'Could not upload your Signal.', variant: 'destructive' });
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
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
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
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-white/60 text-sm mb-4">Help people discover your Signal</p>
          <input
            type="text"
            placeholder="Add a title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 mb-4"
          />
          <div className="grid grid-cols-2 gap-3 mb-6">
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
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-white/50 text-xs text-center">
              🌐 This Signal will be visible to all ACP members.
            </p>
          </div>
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
          <button onClick={exitRecorder} className="side-control-button">
            <X className="w-5 h-5" />
          </button>

          {(state !== 'idle' && state !== 'countdown') && (
            <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
              {state === 'recording' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <span className="text-white text-sm font-mono">
                {formatTime(elapsed)} / {formatTime(duration)}
              </span>
            </div>
          )}

          <div className="w-10" />
        </div>

        {/* Multi-segment progress bar */}
        <div className="absolute top-16 left-4 right-4 z-20 h-1.5 rounded-full bg-white/20 flex gap-0.5 overflow-hidden">
          {segments.map((seg, i) => (
            <div
              key={seg.clipId}
              className={`h-full rounded-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
              style={{ width: `${(seg.duration / duration) * 100}%` }}
            />
          ))}
          {state === 'recording' && (
            <div
              className="h-full rounded-full bg-red-500"
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

        {/* Countdown overlay */}
        {state === 'countdown' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="text-white font-black text-9xl opacity-90 drop-shadow-2xl animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* Text overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute pointer-events-none font-bold drop-shadow-lg"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              fontSize: overlay.fontSize,
              color: overlay.color,
            }}
          >
            {overlay.content}
          </div>
        ))}

        {/* Side controls */}
        <div className="absolute right-3 top-24 z-20 flex flex-col gap-3">
          <button onClick={handleFlipCamera} className="side-control-button" title="Flip camera">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCountdownEnabled(v => !v)}
            className={`side-control-button ${countdownEnabled ? 'bg-red-500 border-red-400' : ''}`}
            title="Countdown"
          >
            <Timer className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowFilters(v => !v); setShowTextEditor(false); setShowEmojiPicker(false); }}
            className={`side-control-button ${showFilters ? 'bg-purple-500' : ''}`}
            title="Filters"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowTextEditor(v => !v); setShowFilters(false); setShowEmojiPicker(false); }}
            className={`side-control-button ${showTextEditor ? 'bg-blue-500' : ''}`}
            title="Text"
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowEmojiPicker(v => !v); setShowFilters(false); setShowTextEditor(false); }}
            className={`side-control-button ${showEmojiPicker ? 'bg-yellow-500' : ''}`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Filter strip */}
        {showFilters && (
          <div className="absolute bottom-44 left-0 right-0 z-20 px-4">
            <div className="flex gap-2 justify-center flex-wrap">
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

        {/* Text overlay editor */}
        {showTextEditor && (
          <div className="absolute bottom-44 left-4 right-4 z-20">
            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Add text..."
                className="flex-1 bg-black/70 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-white/40 text-sm"
              />
              <button
                onClick={() => {
                  if (!newText.trim()) return;
                  setTextOverlays(t => [...t, {
                    id: Date.now().toString(),
                    content: newText,
                    x: 25,
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

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-44 left-4 right-4 z-20">
            <div className="flex gap-2 justify-center flex-wrap bg-black/70 rounded-2xl p-3 border border-white/10">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setTextOverlays(t => [...t, {
                      id: Date.now().toString(),
                      content: emoji,
                      x: 30 + Math.random() * 40,
                      y: 20 + Math.random() * 40,
                      fontSize: 36,
                      color: '#ffffff',
                    }]);
                    setShowEmojiPicker(false);
                  }}
                  className="text-3xl hover:scale-110 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-0 right-0 z-20">
          {/* Duration selector (only while no clips recorded) */}
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

          {/* Done state action sheet */}
          {state === 'done' && (
            <div className="flex justify-center gap-6 mb-6 px-8">
              <button onClick={discardAndGoChoice} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Delete</span>
              </button>
              <button onClick={handleGoEdit} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Edit</span>
              </button>
              <button onClick={() => setState('category')} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">Post</span>
              </button>
            </div>
          )}

          {/* Recording controls row */}
          {state !== 'done' && (
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={deleteLastSegment}
                disabled={segments.length === 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  segments.length > 0 ? 'bg-white/20 text-white' : 'bg-white/5 text-white/20'
                }`}
                data-testid="delete-last-segment"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                ref={recordButtonRef}
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                className={`relative w-20 h-20 rounded-full border-4 flex items-center justify-center select-none transition-all ${
                  state === 'recording'
                    ? 'border-red-500 bg-red-500/10 scale-95'
                    : 'border-white bg-white/10'
                }`}
                style={{ touchAction: 'none', userSelect: 'none' }}
                data-testid="record-button"
              >
                <div className={`transition-all ${
                  state === 'recording'
                    ? 'w-8 h-8 bg-red-500 rounded-sm'
                    : 'w-14 h-14 bg-red-500 rounded-full'
                }`} />
              </button>

              <button
                onClick={handleFinishPress}
                disabled={segments.length === 0 && state !== 'recording'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  segments.length > 0 || state === 'recording'
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/20'
                }`}
                data-testid="finish-button"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          )}

          {(state === 'idle' || state === 'between') && (
            <p className="text-white/40 text-xs text-center mt-3">
              {state === 'idle' ? 'Hold to record' : 'Hold to record next clip'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
