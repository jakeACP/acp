/**
 * MobileComposePage — Unified composer for all post types.
 *
 * Step flow:  pick → compose → preview → (submit)
 *
 * Supported types:
 *   text · signal · image · article · poll · event · petition · civic
 *
 * Features:
 *  - Icon-based first screen (no clutter)
 *  - Per-type drafts auto-saved to localStorage (800 ms debounce)
 *  - Image upload with XHR progress tracking (POST /api/upload)
 *  - Inline field validation with error labels
 *  - Preview card before posting
 *  - Audience / visibility controls (public / followers / private)
 *  - Offline detection with retry
 *  - URL param ?type=xxx allows deep-link from civic pages
 */

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  X, ChevronLeft, Send, FileText, Video, Image as ImageIcon,
  BookOpen, BarChart2, Calendar, FileSignature, Shield,
  Globe, Users, Lock, Camera, Upload, Plus, Minus,
  Clock, MapPin, Link as LinkIcon, Eye, Loader2,
  AlertCircle, WifiOff, CheckCircle2, Trash2,
} from "lucide-react";
import { apiRequest, queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type ComposerType = "text" | "signal" | "image" | "article" | "poll" | "event" | "petition" | "civic";
type ComposerStep = "pick" | "compose" | "preview";
type Audience = "public" | "followers" | "private";

interface PollOption { id: string; text: string; votes: number; }

interface TextDraft { content: string; }
interface ImageDraft { caption: string; imageUrl: string; }
interface ArticleDraft { title: string; excerpt: string; body: string; featuredImage: string; }
interface PollDraft { question: string; description: string; options: string[]; endDate: string; }
interface EventDraft {
  title: string; description: string;
  location: string; address: string; city: string; state: string; zip: string;
  startDate: string; startTime: string; endDate: string; endTime: string;
  isVirtual: boolean; virtualLink: string; maxAttendees: string;
}
interface PetitionDraft { title: string; description: string; target: string; }

type AnyDraft = TextDraft | ImageDraft | ArticleDraft | PollDraft | EventDraft | PetitionDraft;

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPES = [
  { id: "text",     icon: FileText,       label: "Text Post",    sub: "Share your thoughts",  grad: "from-blue-500 to-blue-600",    border: "rgba(59,130,246,0.4)" },
  { id: "signal",   icon: Video,          label: "Signal Video", sub: "Record or upload",      grad: "from-red-500 to-pink-500",     border: "rgba(239,68,68,0.4)" },
  { id: "image",    icon: ImageIcon,      label: "Image Post",   sub: "Photo with caption",    grad: "from-green-500 to-emerald-500", border: "rgba(16,185,129,0.4)" },
  { id: "article",  icon: BookOpen,       label: "Article",      sub: "Long-form writing",     grad: "from-purple-500 to-indigo-500", border: "rgba(139,92,246,0.4)" },
  { id: "poll",     icon: BarChart2,      label: "Poll",         sub: "Ask the community",     grad: "from-violet-500 to-purple-500", border: "rgba(167,139,250,0.4)" },
  { id: "event",    icon: Calendar,       label: "Event",        sub: "Rally or meetup",       grad: "from-orange-500 to-amber-500", border: "rgba(249,115,22,0.4)" },
  { id: "petition", icon: FileSignature,  label: "Petition",     sub: "Collect signatures",    grad: "from-teal-500 to-cyan-500",    border: "rgba(20,184,166,0.4)" },
  { id: "civic",    icon: Shield,         label: "Civic Action", sub: "Whistleblower & more",  grad: "from-slate-500 to-gray-600",   border: "rgba(100,116,139,0.4)" },
] as const;

const AUDIENCE_OPTIONS: { value: Audience; icon: typeof Globe; label: string; desc: string }[] = [
  { value: "public",    icon: Globe,  label: "Public",         desc: "Visible to everyone" },
  { value: "followers", icon: Users,  label: "Followers only", desc: "Only people who follow you" },
  { value: "private",   icon: Lock,   label: "Only me",        desc: "Saved but not shared" },
];

const CIVIC_ACTIONS = [
  { emoji: "🔍", label: "Whistleblower Report", href: "/mobile/civic/whistleblower" },
  { emoji: "🌱", label: "New Initiative",        href: "/initiatives/new" },
  { emoji: "✊", label: "Start Boycott",          href: "/boycotts/new" },
  { emoji: "❤️", label: "Add Charity",            href: "/charities/new" },
];

// ─── Draft utilities ─────────────────────────────────────────────────────────

const DRAFT_PREFIX = "acp_compose_draft_";
function loadDraft<T>(type: ComposerType): T | null {
  try { return JSON.parse(localStorage.getItem(`${DRAFT_PREFIX}${type}`) ?? "null"); } catch { return null; }
}
function saveDraft(type: ComposerType, data: AnyDraft) {
  try { localStorage.setItem(`${DRAFT_PREFIX}${type}`, JSON.stringify(data)); } catch {}
}
function clearDraft(type: ComposerType) {
  try { localStorage.removeItem(`${DRAFT_PREFIX}${type}`); } catch {}
}
function hasDraft(type: ComposerType): boolean {
  return !!localStorage.getItem(`${DRAFT_PREFIX}${type}`);
}

// ─── Image upload with XHR progress ──────────────────────────────────────────

async function uploadFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  const csrfToken = await fetchCsrfToken();
  const formData = new FormData();
  formData.append("file", file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("x-csrf-token", csrfToken);
    xhr.withCredentials = true;
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).url); }
        catch { reject(new Error("Invalid upload response")); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).message ?? "Upload failed")); }
        catch { reject(new Error("Upload failed")); }
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed — check your connection")));
    xhr.send(formData);
  });
}

// ─── Shared styled input/textarea ────────────────────────────────────────────

function Field({ label, error, children }: { label?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <p className="text-white/55 text-xs font-medium mb-1.5 px-0.5 uppercase tracking-wide">{label}</p>}
      {children}
      {error && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error: _e, className: _c, ...rest } = props;
  return (
    <input
      {...rest}
      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${props.error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
      }}
    />
  );
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  const { error: _e, className: _c, ...rest } = props;
  return (
    <textarea
      {...rest}
      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${props.error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
      }}
    />
  );
}

// ─── Pick screen ──────────────────────────────────────────────────────────────

function PickScreen({ onPick, onClose }: { onPick: (type: ComposerType) => void; onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="text-white font-bold text-xl">Create</h1>
          <p className="text-white/45 text-xs mt-0.5">What would you like to share?</p>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 pb-8">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const draft = hasDraft(t.id as ComposerType);
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id as ComposerType)}
              data-testid={`compose-pick-${t.id}`}
              className="relative flex flex-col items-center gap-3 p-5 rounded-3xl text-center active:scale-[0.97] transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${t.border}` }}>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{t.label}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{t.sub}</p>
              </div>
              {draft && (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(59,130,246,0.3)", color: "#93c5fd" }}>
                  Draft
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Audience sheet ───────────────────────────────────────────────────────────

function AudienceSheet({ value, onChange, onClose }: { value: Audience; onChange: (a: Audience) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full rounded-t-3xl p-5 pb-10 space-y-2"
        style={{ background: "rgba(15,22,50,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.2)" }} />
        <p className="text-white font-bold text-base mb-3">Audience</p>
        {AUDIENCE_OPTIONS.map(({ value: v, icon: Icon, label, desc }) => (
          <button key={v} onClick={() => { onChange(v); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
            style={value === v
              ? { background: "rgba(59,91,169,0.3)", border: "1px solid rgba(59,91,169,0.5)" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: value === v ? "rgba(59,91,169,0.4)" : "rgba(255,255,255,0.08)" }}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-white/45 text-xs">{desc}</p>
            </div>
            {value === v && <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Composer header ──────────────────────────────────────────────────────────

function ComposeHeader({
  typeId, audience, onBack, onPreview, onPost, isPending, isDraftSaved, onAudienceOpen,
}: {
  typeId: ComposerType; audience: Audience; onBack: () => void; onPreview: () => void;
  onPost: () => void; isPending: boolean; isDraftSaved: boolean; onAudienceOpen: () => void;
}) {
  const typeInfo = TYPES.find((t) => t.id === typeId)!;
  const AudIcon = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.icon ?? Globe;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{typeInfo.label}</p>
        {isDraftSaved && <p className="text-blue-400/70 text-[10px]">Draft saved</p>}
      </div>

      <button onClick={onAudienceOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <AudIcon className="w-3.5 h-3.5 text-white/60" />
        <span className="text-white/60 text-xs capitalize">{audience}</span>
      </button>

      <button onClick={onPreview}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Eye className="w-3.5 h-3.5 text-white/60" />
        <span className="text-white/60 text-xs">Preview</span>
      </button>

      <button onClick={onPost} disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold text-xs text-white transition-all active:scale-[0.97]"
        style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}
        data-testid="compose-post-btn">
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Post
      </button>
    </div>
  );
}

// ─── Offline banner ───────────────────────────────────────────────────────────

function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 mx-4 my-2 px-3 py-2 rounded-xl"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
      <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
      <p className="text-red-400 text-xs">You're offline — changes will be saved as a draft</p>
    </div>
  );
}

// ─── Upload progress bar ──────────────────────────────────────────────────────

function UploadProgress({ pct }: { pct: number }) {
  return (
    <div className="mx-4 mb-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-white/50 text-xs">Uploading image…</p>
        <p className="text-white/50 text-xs">{pct}%</p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "linear-gradient(to right,#E6393A,#3B5BA9)" }} />
      </div>
    </div>
  );
}

// ─── Image picker ─────────────────────────────────────────────────────────────

function ImagePicker({ preview, onFile }: { preview: string | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {preview ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden"
          style={{ background: "rgba(0,0,0,0.3)" }}>
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          <button onClick={() => ref.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}>
            Change
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(255,255,255,0.12)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)" }}>
            <Camera className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-white/70 font-medium text-sm">Tap to pick an image</p>
            <p className="text-white/35 text-xs mt-0.5">JPG, PNG, WEBP, HEIC</p>
          </div>
        </button>
      )}
    </div>
  );
}

// ─── Form: Text ───────────────────────────────────────────────────────────────

const MAX_TEXT = 5000;
function TextForm({ draft, onChange, errors }: {
  draft: TextDraft; onChange: (d: TextDraft) => void; errors: Record<string, string>;
}) {
  const remaining = MAX_TEXT - draft.content.length;
  return (
    <div className="space-y-3">
      <Field error={errors.content}>
        <StyledTextarea
          value={draft.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="What's on your mind? Use # for hashtags, @ to mention someone…"
          rows={10}
          maxLength={MAX_TEXT}
          error={!!errors.content}
          data-testid="compose-text-content"
        />
        <p className={`text-xs text-right mt-1 ${remaining < 100 ? "text-yellow-400" : "text-white/25"}`}>
          {remaining} remaining
        </p>
      </Field>
    </div>
  );
}

// ─── Form: Image ──────────────────────────────────────────────────────────────

function ImageForm({ draft, onChange, errors, localPreview, uploadPct, onFile }: {
  draft: ImageDraft; onChange: (d: ImageDraft) => void; errors: Record<string, string>;
  localPreview: string | null; uploadPct: number; onFile: (f: File) => void;
}) {
  return (
    <div className="space-y-4">
      {uploadPct > 0 && uploadPct < 100 && <UploadProgress pct={uploadPct} />}
      <Field label="Photo" error={errors.imageUrl}>
        <ImagePicker preview={localPreview ?? draft.imageUrl ?? null} onFile={onFile} />
      </Field>
      {draft.imageUrl && (
        <Field label="Caption">
          <StyledTextarea
            value={draft.caption}
            onChange={(e) => onChange({ ...draft, caption: e.target.value })}
            placeholder="Add a caption…"
            rows={3}
            data-testid="compose-image-caption"
          />
        </Field>
      )}
    </div>
  );
}

// ─── Form: Article ────────────────────────────────────────────────────────────

function ArticleForm({ draft, onChange, errors, localPreview, uploadPct, onFile }: {
  draft: ArticleDraft; onChange: (d: ArticleDraft) => void; errors: Record<string, string>;
  localPreview: string | null; uploadPct: number; onFile: (f: File) => void;
}) {
  const wordCount = draft.body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  return (
    <div className="space-y-4">
      <Field label="Title *" error={errors.title}>
        <StyledInput value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="Article headline…" maxLength={200} error={!!errors.title}
          data-testid="compose-article-title" />
      </Field>
      {uploadPct > 0 && uploadPct < 100 && <UploadProgress pct={uploadPct} />}
      <Field label="Header Image">
        <ImagePicker preview={localPreview ?? draft.featuredImage ?? null} onFile={onFile} />
      </Field>
      <Field label="Excerpt (optional)">
        <StyledTextarea value={draft.excerpt} onChange={(e) => onChange({ ...draft, excerpt: e.target.value })}
          placeholder="Brief summary shown in feed previews…" rows={2}
          data-testid="compose-article-excerpt" />
      </Field>
      <Field label="Article Body *" error={errors.body}>
        <StyledTextarea value={draft.body} onChange={(e) => onChange({ ...draft, body: e.target.value })}
          placeholder="Write your full article…" rows={12} error={!!errors.body}
          data-testid="compose-article-body" />
        <p className="text-white/25 text-xs text-right mt-1">{wordCount} words · ~{readTime} min read</p>
      </Field>
    </div>
  );
}

// ─── Form: Poll ───────────────────────────────────────────────────────────────

function PollForm({ draft, onChange, errors }: {
  draft: PollDraft; onChange: (d: PollDraft) => void; errors: Record<string, string>;
}) {
  const addOption = () => { if (draft.options.length < 6) onChange({ ...draft, options: [...draft.options, ""] }); };
  const removeOption = (i: number) => {
    if (draft.options.length > 2) onChange({ ...draft, options: draft.options.filter((_, idx) => idx !== i) });
  };
  const setOption = (i: number, val: string) => {
    const opts = [...draft.options]; opts[i] = val; onChange({ ...draft, options: opts });
  };
  return (
    <div className="space-y-4">
      <Field label="Question *" error={errors.question}>
        <StyledInput value={draft.question} onChange={(e) => onChange({ ...draft, question: e.target.value })}
          placeholder="Ask the community something…" error={!!errors.question}
          data-testid="compose-poll-question" />
      </Field>
      <Field label="Description (optional)">
        <StyledTextarea value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Provide context for the question…" rows={2} />
      </Field>
      <div>
        <p className="text-white/55 text-xs font-medium mb-2 uppercase tracking-wide">Options *</p>
        <div className="space-y-2">
          {draft.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white/40 flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}>{i + 1}</span>
              <StyledInput value={opt} onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`} data-testid={`compose-poll-opt-${i}`} />
              {draft.options.length > 2 && (
                <button onClick={() => removeOption(i)} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)" }}>
                  <Minus className="w-3.5 h-3.5 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.options && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.options}</p>}
        {draft.options.length < 6 && (
          <button onClick={addOption} className="mt-2 flex items-center gap-1.5 text-blue-400/80 text-sm font-medium"
            data-testid="compose-poll-add-option">
            <Plus className="w-3.5 h-3.5" /> Add option
          </button>
        )}
      </div>
      <Field label="End date (optional)">
        <StyledInput type="datetime-local" value={draft.endDate} onChange={(e) => onChange({ ...draft, endDate: e.target.value })}
          style={{ colorScheme: "dark" }} />
      </Field>
    </div>
  );
}

// ─── Form: Event ──────────────────────────────────────────────────────────────

function EventForm({ draft, onChange, errors }: {
  draft: EventDraft; onChange: (d: EventDraft) => void; errors: Record<string, string>;
}) {
  const set = (k: keyof EventDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...draft, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });
  return (
    <div className="space-y-4">
      <Field label="Event Title *" error={errors.title}>
        <StyledInput value={draft.title} onChange={set("title")} placeholder="Event name…"
          error={!!errors.title} data-testid="compose-event-title" />
      </Field>
      <Field label="Description">
        <StyledTextarea value={draft.description} onChange={set("description")} placeholder="Tell people what to expect…" rows={3} />
      </Field>

      {/* Virtual toggle */}
      <button onClick={() => onChange({ ...draft, isVirtual: !draft.isVirtual })}
        className="flex items-center justify-between w-full px-4 py-3 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-white/50" />
          <span className="text-white text-sm">Virtual event</span>
        </div>
        <div className="w-10 h-5 rounded-full relative transition-all"
          style={{ background: draft.isVirtual ? "#3B5BA9" : "rgba(255,255,255,0.15)" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: draft.isVirtual ? "calc(100% - 18px)" : 2 }} />
        </div>
      </button>

      {draft.isVirtual ? (
        <Field label="Meeting Link *" error={errors.virtualLink}>
          <StyledInput type="url" value={draft.virtualLink} onChange={set("virtualLink")}
            placeholder="https://zoom.us/…" error={!!errors.virtualLink} />
        </Field>
      ) : (
        <>
          <Field label="Venue *" error={errors.location}>
            <StyledInput value={draft.location} onChange={set("location")} placeholder="Venue name…"
              error={!!errors.location} data-testid="compose-event-location" />
          </Field>
          <Field label="Address">
            <StyledInput value={draft.address} onChange={set("address")} placeholder="123 Main St" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="City *" error={errors.city}>
              <StyledInput value={draft.city} onChange={set("city")} placeholder="City" error={!!errors.city} />
            </Field>
            <Field label="State *" error={errors.state}>
              <StyledInput value={draft.state} onChange={set("state")} placeholder="State" error={!!errors.state} />
            </Field>
            <Field label="ZIP">
              <StyledInput value={draft.zip} onChange={set("zip")} placeholder="12345" />
            </Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Start Date *" error={errors.startDate}>
          <StyledInput type="date" value={draft.startDate} onChange={set("startDate")}
            error={!!errors.startDate} style={{ colorScheme: "dark" }} />
        </Field>
        <Field label="Start Time *" error={errors.startTime}>
          <StyledInput type="time" value={draft.startTime} onChange={set("startTime")}
            error={!!errors.startTime} style={{ colorScheme: "dark" }} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="End Date">
          <StyledInput type="date" value={draft.endDate} onChange={set("endDate")} style={{ colorScheme: "dark" }} />
        </Field>
        <Field label="End Time">
          <StyledInput type="time" value={draft.endTime} onChange={set("endTime")} style={{ colorScheme: "dark" }} />
        </Field>
      </div>
      <Field label="Max Attendees (optional)">
        <StyledInput type="number" value={draft.maxAttendees} onChange={set("maxAttendees")}
          placeholder="Leave blank for unlimited" min="1" />
      </Field>
    </div>
  );
}

// ─── Form: Petition ───────────────────────────────────────────────────────────

function PetitionForm({ draft, onChange, errors }: {
  draft: PetitionDraft; onChange: (d: PetitionDraft) => void; errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <Field label="Petition Title *" error={errors.title}>
        <StyledInput value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="What are you demanding?" error={!!errors.title}
          maxLength={200} data-testid="compose-petition-title" />
      </Field>
      <Field label="Description *" error={errors.description}>
        <StyledTextarea value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Explain the issue and what you want changed…" rows={6}
          error={!!errors.description} data-testid="compose-petition-description" />
      </Field>
      <Field label="Signature Goal *" error={errors.target}>
        <StyledInput type="number" value={draft.target} onChange={(e) => onChange({ ...draft, target: e.target.value })}
          placeholder="e.g. 1000" min="10" error={!!errors.target}
          data-testid="compose-petition-target" />
        <p className="text-white/30 text-xs mt-1">Minimum 10 signatures</p>
      </Field>
    </div>
  );
}

// ─── Form: Civic Action ────────────────────────────────────────────────────────

function CivicForm({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div className="space-y-3">
      <div className="flex gap-2 px-1 mb-4">
        <Shield className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
        <p className="text-white/55 text-sm leading-relaxed">
          Choose a civic action below. You'll be taken to the appropriate form.
        </p>
      </div>
      {CIVIC_ACTIONS.map((a) => (
        <a key={a.label} href={a.href} target={a.href.startsWith("/mobile") ? undefined : "_blank"} rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-4 px-4 py-4 rounded-2xl active:bg-white/8 transition-all block"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-3xl">{a.emoji}</span>
          <div>
            <p className="text-white font-semibold text-sm">{a.label}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function PreviewCard({ type, draft, user, audience }: {
  type: ComposerType; draft: AnyDraft; user: any; audience: Audience;
}) {
  const AudIcon = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.icon ?? Globe;
  const now = new Date();

  const renderContent = () => {
    switch (type) {
      case "text": {
        const d = draft as TextDraft;
        return <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{d.content || <span className="text-white/25 italic">No content yet…</span>}</p>;
      }
      case "image": {
        const d = draft as ImageDraft;
        return (
          <>
            {d.imageUrl && <img src={d.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-72" />}
            {d.caption && <p className="text-white/80 text-sm mt-2">{d.caption}</p>}
          </>
        );
      }
      case "article": {
        const d = draft as ArticleDraft;
        return (
          <>
            {d.featuredImage && <img src={d.featuredImage} alt="" className="w-full rounded-xl object-cover max-h-48 mb-2" />}
            <p className="text-white font-bold text-base leading-snug">{d.title || <span className="text-white/25 italic">No title</span>}</p>
            <p className="text-white/60 text-xs mt-1">{Math.max(1, Math.ceil(d.body.split(/\s+/).filter(Boolean).length / 200))} min read</p>
            <p className="text-white/55 text-sm mt-2 line-clamp-3">{d.excerpt || d.body.slice(0, 200)}</p>
          </>
        );
      }
      case "poll": {
        const d = draft as PollDraft;
        return (
          <>
            <p className="text-white font-semibold text-sm mb-3">{d.question || <span className="text-white/25 italic">No question</span>}</p>
            {d.options.filter(Boolean).map((opt, i) => (
              <div key={i} className="mb-1.5 px-3 py-2 rounded-lg text-white/70 text-sm"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {opt || `Option ${i + 1}`}
              </div>
            ))}
          </>
        );
      }
      case "event": {
        const d = draft as EventDraft;
        return (
          <>
            <p className="text-white font-semibold text-sm mb-2">{d.title || <span className="text-white/25 italic">No title</span>}</p>
            <div className="flex items-center gap-1.5 text-white/55 text-xs mb-1">
              <Clock className="w-3 h-3" />
              {d.startDate && d.startTime ? `${d.startDate} at ${d.startTime}` : <span className="text-white/25 italic">No date set</span>}
            </div>
            <div className="flex items-center gap-1.5 text-white/55 text-xs">
              <MapPin className="w-3 h-3" />
              {d.isVirtual ? "Online Event" : [d.location, d.city, d.state].filter(Boolean).join(", ") || <span className="text-white/25 italic">No location</span>}
            </div>
          </>
        );
      }
      case "petition": {
        const d = draft as PetitionDraft;
        return (
          <>
            <p className="text-white font-semibold text-sm mb-2">{d.title || <span className="text-white/25 italic">No title</span>}</p>
            <p className="text-white/55 text-xs line-clamp-3">{d.description}</p>
            {d.target && (
              <div className="mt-2 text-xs font-semibold" style={{ color: "#3B5BA9" }}>
                Goal: {parseInt(d.target, 10).toLocaleString()} signatures
              </div>
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  const typeInfo = TYPES.find((t) => t.id === type)!;
  const TypeIcon = typeInfo.icon;

  return (
    <div className="glass-card p-4 mx-4" style={{ height: "auto" }}>
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}>
          {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{user?.displayName ?? user?.username ?? "You"}</p>
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <span>Just now</span>
            <span>·</span>
            <AudIcon className="w-3 h-3" />
            <span className="capitalize">{audience}</span>
            <span>·</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r ${typeInfo.grad}`}>{typeInfo.label}</span>
          </div>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}

// ─── Initial drafts per type ──────────────────────────────────────────────────

function initialDraft(type: ComposerType): AnyDraft {
  switch (type) {
    case "text":     return loadDraft<TextDraft>(type) ?? { content: "" };
    case "image":    return loadDraft<ImageDraft>(type) ?? { caption: "", imageUrl: "" };
    case "article":  return loadDraft<ArticleDraft>(type) ?? { title: "", excerpt: "", body: "", featuredImage: "" };
    case "poll":     return loadDraft<PollDraft>(type) ?? { question: "", description: "", options: ["", ""], endDate: "" };
    case "event":    return loadDraft<EventDraft>(type) ?? { title: "", description: "", location: "", address: "", city: "", state: "", zip: "", startDate: "", startTime: "", endDate: "", endTime: "", isVirtual: false, virtualLink: "", maxAttendees: "" };
    case "petition": return loadDraft<PetitionDraft>(type) ?? { title: "", description: "", target: "" };
    default:         return { content: "" };
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(type: ComposerType, draft: AnyDraft): Record<string, string> {
  const errs: Record<string, string> = {};
  switch (type) {
    case "text": {
      const d = draft as TextDraft;
      if (!d.content.trim()) errs.content = "Please write something";
      break;
    }
    case "image": {
      const d = draft as ImageDraft;
      if (!d.imageUrl) errs.imageUrl = "Please pick an image";
      break;
    }
    case "article": {
      const d = draft as ArticleDraft;
      if (!d.title.trim()) errs.title = "Title is required";
      if (!d.body.trim()) errs.body = "Article body is required";
      break;
    }
    case "poll": {
      const d = draft as PollDraft;
      if (!d.question.trim()) errs.question = "Question is required";
      if (d.options.filter((o) => o.trim()).length < 2) errs.options = "At least 2 options are required";
      break;
    }
    case "event": {
      const d = draft as EventDraft;
      if (!d.title.trim()) errs.title = "Title is required";
      if (!d.startDate) errs.startDate = "Start date is required";
      if (!d.startTime) errs.startTime = "Start time is required";
      if (d.isVirtual && !d.virtualLink.trim()) errs.virtualLink = "Meeting link is required";
      if (!d.isVirtual && !d.location.trim()) errs.location = "Venue is required";
      if (!d.isVirtual && !d.city.trim()) errs.city = "City is required";
      if (!d.isVirtual && !d.state.trim()) errs.state = "State is required";
      break;
    }
    case "petition": {
      const d = draft as PetitionDraft;
      if (!d.title.trim()) errs.title = "Title is required";
      if (!d.description.trim()) errs.description = "Description is required";
      const t = parseInt(d.target, 10);
      if (isNaN(t) || t < 10) errs.target = "Goal must be at least 10";
      break;
    }
  }
  return errs;
}

// ─── Root component ───────────────────────────────────────────────────────────

export function MobileComposePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Parse ?type=xxx from URL
  const initialType = useMemo<ComposerType | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type") as ComposerType | null;
    return t && TYPES.some((tt) => tt.id === t) ? t : null;
  }, []);

  const [step, setStep] = useState<ComposerStep>(initialType ? "compose" : "pick");
  const [type, setType] = useState<ComposerType | null>(initialType);
  const [draft, setDraft] = useState<AnyDraft | null>(() => initialType ? initialDraft(initialType) : null);
  const [audience, setAudience] = useState<Audience>("public");
  const [showAudience, setShowAudience] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadPct, setUploadPct] = useState(0);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Offline detection
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // Auto-save draft
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!type || !draft) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft(type, draft);
      setIsDraftSaved(true);
      setTimeout(() => setIsDraftSaved(false), 2000);
    }, 800);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [draft, type]);

  const handlePick = useCallback((t: ComposerType) => {
    if (t === "signal") { navigate("/mobile/signal-choice"); return; }
    setType(t);
    setDraft(initialDraft(t));
    setErrors({});
    setLocalImagePreview(null);
    setStep("compose");
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (step === "preview") { setStep("compose"); return; }
    setStep("pick");
    setType(null);
    setDraft(null);
  }, [step]);

  const handleClose = useCallback(() => navigate("/mobile"), [navigate]);

  // Image file handler (used by Image + Article forms)
  const handleImageFile = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setLocalImagePreview(preview);
    setUploadPct(1);
    try {
      const url = await uploadFile(file, setUploadPct);
      setUploadPct(100);
      setDraft((prev) => prev ? { ...prev, imageUrl: url, featuredImage: url } : prev);
      setTimeout(() => setUploadPct(0), 800);
    } catch (e: any) {
      setUploadPct(0);
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  // Build API payload from draft
  const buildPayload = useCallback(() => {
    if (!type || !draft) return null;
    switch (type) {
      case "text": {
        const d = draft as TextDraft;
        return { endpoint: "/api/posts", body: { content: d.content, type: "post", visibility: audience } };
      }
      case "image": {
        const d = draft as ImageDraft;
        return { endpoint: "/api/posts", body: { content: d.caption || " ", type: "post", imageUrl: d.imageUrl, visibility: audience } };
      }
      case "article": {
        const d = draft as ArticleDraft;
        const words = d.body.trim().split(/\s+/).filter(Boolean).length;
        return {
          endpoint: "/api/posts",
          body: { content: d.excerpt || d.body.slice(0, 200), title: d.title, type: "blog", articleBody: d.body, featuredImage: d.featuredImage || null, excerpt: d.excerpt || null, readingTime: Math.max(1, Math.ceil(words / 200)), visibility: audience },
        };
      }
      case "poll": {
        const d = draft as PollDraft;
        return {
          endpoint: "/api/polls",
          body: { title: d.question, description: d.description || null, options: d.options.filter(Boolean).map((t, i) => ({ id: String(i + 1), text: t, votes: 0 })), votingType: "simple", endDate: d.endDate || null },
        };
      }
      case "event": {
        const d = draft as EventDraft;
        const start = new Date(`${d.startDate}T${d.startTime}`);
        const end = d.endDate && d.endTime ? new Date(`${d.endDate}T${d.endTime}`) : null;
        return {
          endpoint: "/api/events",
          body: { title: d.title, description: d.description || null, location: d.isVirtual ? "Online" : d.location, address: d.address || null, city: d.isVirtual ? "Virtual" : d.city, state: d.isVirtual ? "Online" : d.state, zipCode: d.zip || null, startDate: start.toISOString(), endDate: end?.toISOString() || null, isVirtual: d.isVirtual, virtualLink: d.isVirtual ? d.virtualLink : null, maxAttendees: d.maxAttendees ? parseInt(d.maxAttendees, 10) : null },
        };
      }
      case "petition": {
        const d = draft as PetitionDraft;
        return { endpoint: "/api/petitions", body: { title: d.title, description: d.description, targetSignatures: parseInt(d.target, 10) } };
      }
      default: return null;
    }
  }, [type, draft, audience]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (!payload) throw new Error("Nothing to post");
      return apiRequest(payload.endpoint, "POST", payload.body);
    },
    onSuccess: () => {
      if (type) clearDraft(type);
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
      const label = TYPES.find((t) => t.id === type)?.label ?? "Post";
      toast({ title: `${label} published! 🎉` });
      navigate("/mobile");
    },
    onError: (e: Error) => toast({ title: "Post failed", description: e.message, variant: "destructive" }),
  });

  const handlePost = useCallback(() => {
    if (!type || !draft) return;
    if (isOffline) { toast({ title: "You're offline", description: "Post will be saved as draft.", variant: "destructive" }); return; }
    const errs = validate(type, draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: "Please fix the errors", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  }, [type, draft, isOffline, submitMutation, toast]);

  const handlePreview = useCallback(() => {
    if (!type || !draft) return;
    const errs = validate(type, draft);
    setErrors(errs);
    setStep("preview");
  }, [type, draft]);

  const handleClearDraft = useCallback(() => {
    if (!type) return;
    clearDraft(type);
    setDraft(initialDraft(type));
    toast({ title: "Draft cleared" });
  }, [type, toast]);

  // ── Render ──

  return (
    <div className="mobile-root" data-testid="mobile-compose-page">
      <div className="flex flex-col min-h-full pb-6">

        {/* STEP: PICK */}
        {step === "pick" && (
          <div className="overflow-y-auto flex-1">
            <PickScreen onPick={handlePick} onClose={handleClose} />
          </div>
        )}

        {/* STEP: COMPOSE */}
        {step === "compose" && type && draft && (
          <>
            <ComposeHeader
              typeId={type} audience={audience}
              onBack={handleBack} onPreview={handlePreview}
              onPost={handlePost} isPending={submitMutation.isPending}
              isDraftSaved={isDraftSaved} onAudienceOpen={() => setShowAudience(true)}
            />
            {isOffline && <OfflineBanner />}

            {/* Draft controls */}
            {hasDraft(type) && (
              <div className="flex items-center justify-between px-4 py-2 text-xs">
                <span className="text-blue-400/70 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Draft loaded
                </span>
                <button onClick={handleClearDraft}
                  className="flex items-center gap-1 text-red-400/60 hover:text-red-400"
                  data-testid="compose-clear-draft">
                  <Trash2 className="w-3 h-3" /> Clear draft
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-4 py-4">
              {type === "text" && <TextForm draft={draft as TextDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} />}
              {type === "image" && <ImageForm draft={draft as ImageDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} localPreview={localImagePreview} uploadPct={uploadPct} onFile={handleImageFile} />}
              {type === "article" && <ArticleForm draft={draft as ArticleDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} localPreview={localImagePreview} uploadPct={uploadPct} onFile={handleImageFile} />}
              {type === "poll" && <PollForm draft={draft as PollDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} />}
              {type === "event" && <EventForm draft={draft as EventDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} />}
              {type === "petition" && <PetitionForm draft={draft as PetitionDraft} onChange={(d) => { setDraft(d); setErrors({}); }} errors={errors} />}
              {type === "civic" && <CivicForm onClose={handleClose} />}
            </div>
          </>
        )}

        {/* STEP: PREVIEW */}
        {step === "preview" && type && draft && (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button onClick={() => setStep("compose")} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <p className="text-white font-bold text-sm flex-1">Preview</p>
              <button onClick={handlePost} disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}
                data-testid="compose-confirm-post-btn">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish
              </button>
            </div>

            {isOffline && <OfflineBanner />}

            <div className="overflow-y-auto flex-1 pt-4">
              <p className="text-white/35 text-xs text-center mb-4">This is how your post will appear in the feed</p>
              <PreviewCard type={type} draft={draft} user={user} audience={audience} />
              <div className="flex gap-3 px-4 mt-4">
                <button onClick={() => setStep("compose")}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/70"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Edit
                </button>
                <button onClick={handlePost} disabled={submitMutation.isPending}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}>
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Audience sheet overlay */}
      {showAudience && (
        <AudienceSheet value={audience} onChange={setAudience} onClose={() => setShowAudience(false)} />
      )}
    </div>
  );
}
