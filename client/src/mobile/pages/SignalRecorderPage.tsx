import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  RefreshCw, 
  Timer, 
  Sparkles, 
  Type, 
  Smile,
  ChevronLeft,
  Check
} from "lucide-react";

type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'reviewing';
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

interface EmojiOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const FILTERS: Record<Filter, string> = {
  none: '',
  vivid: 'contrast(1.1) saturate(1.2)',
  mono: 'grayscale(1)',
  cool: 'contrast(1.05) saturate(1.05) hue-rotate(-10deg)',
  warm: 'contrast(1.05) saturate(1.1) hue-rotate(10deg) brightness(1.05)',
};

export function SignalRecorderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<RecordingState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [duration, setDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [filter, setFilter] = useState<Filter>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [emojiOverlays, setEmojiOverlays] = useState<EmojiOverlay[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');

  const isPremium = user?.subscriptionStatus === 'premium';
  const maxDuration = isPremium ? 300 : 60;

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please check permissions.",
          variant: "destructive",
        });
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [facingMode, toast]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setState('reviewing');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setState('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= duration - 1) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [duration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleRecordPress = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'paused') {
      if (countdownEnabled && countdown > 0) {
        setState('countdown');
        let count = countdown;
        const countdownTimer = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(countdownTimer);
            startRecording();
          }
        }, 1000);
      } else {
        startRecording();
      }
    }
  };

  const flipCamera = async () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setState('idle');
    setElapsed(0);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!recordedBlob) throw new Error('No recording');

      const formData = new FormData();
      formData.append('video', recordedBlob, 'signal.webm');
      formData.append('title', title);
      formData.append('duration', elapsed.toString());
      formData.append('filter', filter);
      formData.append('overlays', JSON.stringify({
        texts: textOverlays,
        emojis: emojiOverlays,
        graphics: [],
      }));

      const { getCsrfToken } = await import("@/lib/queryClient");
      const token = getCsrfToken();
      const response = await fetch('/api/mobile/signals', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { 'x-csrf-token': token } : {},
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
      toast({
        title: "Signal Posted!",
        description: "Your Signal has been shared.",
      });
      setLocation('/mobile/signals');
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Could not upload your Signal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const progress = (elapsed / duration) * 100;

  if (state === 'reviewing' && recordedBlob) {
    return (
      <div className="mobile-root min-h-screen flex flex-col" data-testid="signal-review">
        <div className="flex items-center justify-between p-4">
          <button onClick={discardRecording} className="text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold">Review Signal</h1>
          <button 
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending}
            className="text-red-500 font-bold"
          >
            {uploadMutation.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="recorder-frame mb-4">
            <video 
              src={URL.createObjectURL(recordedBlob)}
              className="w-full h-full object-cover"
              style={{ filter: FILTERS[filter] }}
              controls
              autoPlay
              loop
              playsInline
            />
          </div>

          <input
            type="text"
            placeholder="Add a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/50 mb-4"
            data-testid="signal-title-input"
          />

          <div className="flex gap-3">
            <button 
              onClick={discardRecording}
              className="glass-button"
            >
              Discard
            </button>
            <button 
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
              className="glass-button primary flex items-center gap-2"
              data-testid="post-signal-button"
            >
              <Check className="w-4 h-4" />
              {uploadMutation.isPending ? 'Posting...' : 'Post Signal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-root min-h-screen flex flex-col" data-testid="signal-recorder">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <button 
            onClick={() => setLocation('/mobile')}
            className="side-control-button"
          >
            <X className="w-5 h-5" />
          </button>
          
          {state === 'recording' && (
            <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-mono">
                {formatTime(elapsed)} / {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        <div className="recorder-frame mx-4 mt-16">
          {state === 'recording' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-10">
              <div 
                className="h-full bg-red-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              filter: FILTERS[filter],
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
            }}
          />

          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="text-overlay"
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

          {emojiOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="emoji-overlay"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                fontSize: overlay.size,
              }}
            >
              {overlay.emoji}
            </div>
          ))}

          <div className="absolute right-3 top-1/2 -translate-y-1/2 side-controls z-10">
            <button onClick={flipCamera} className="side-control-button">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCountdownEnabled(!countdownEnabled)}
              className={`side-control-button ${countdownEnabled ? 'bg-red-500' : ''}`}
            >
              <Timer className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="side-control-button"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowTextEditor(!showTextEditor)}
              className="side-control-button"
            >
              <Type className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="side-control-button"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="absolute bottom-20 left-0 right-0 px-4">
              <div className="flex gap-2 justify-center">
                {(Object.keys(FILTERS) as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium ${
                      filter === f 
                        ? 'bg-red-500 text-white' 
                        : 'bg-black/50 text-white/80'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-0 right-0">
          <div className="flex justify-center mb-4">
            <div className="duration-selector">
              <button
                onClick={() => setDuration(15)}
                className={`duration-option ${duration === 15 ? 'active' : ''}`}
              >
                15s
              </button>
              <button
                onClick={() => setDuration(60)}
                className={`duration-option ${duration === 60 ? 'active' : ''}`}
              >
                60s
              </button>
              {isPremium && (
                <button
                  onClick={() => setDuration(300)}
                  className={`duration-option ${duration === 300 ? 'active' : ''}`}
                >
                  5m
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleRecordPress}
              className={`record-button ${state === 'recording' ? 'recording' : ''}`}
              data-testid="record-button"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
