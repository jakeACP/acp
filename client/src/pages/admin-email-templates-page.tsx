import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Mail, Plus, Trash2, Edit2, Send, Eye, Code2, LayoutTemplate,
  ChevronUp, ChevronDown, Type, Image, Minus, Square, AlignCenter,
  Loader2, Clock, Users, CheckCircle2, XCircle, Copy,
} from "lucide-react";

// ── Block types ───────────────────────────────────────────────────────────────

type BlockType = "header" | "text" | "button" | "image" | "divider" | "spacer" | "footer";

interface HeaderBlock  { type: "header";  title: string; subtitle?: string; bgColor: string; }
interface TextBlock    { type: "text";    content: string; align: "left" | "center" | "right"; }
interface ButtonBlock  { type: "button";  label: string; url: string; bgColor: string; align: "left" | "center" | "right"; }
interface ImageBlock   { type: "image";   url: string; alt?: string; linkUrl?: string; }
interface DividerBlock { type: "divider"; }
interface SpacerBlock  { type: "spacer";  height: number; }
interface FooterBlock  { type: "footer";  text: string; }

type EmailBlock = HeaderBlock | TextBlock | ButtonBlock | ImageBlock | DividerBlock | SpacerBlock | FooterBlock;

function newBlock(type: BlockType): EmailBlock {
  switch (type) {
    case "header":  return { type, title: "Your Headline Here", subtitle: "", bgColor: "#1a3a5c" };
    case "text":    return { type, content: "Write your message here. This is a paragraph of body text.", align: "left" };
    case "button":  return { type, label: "Click Here", url: "https://anticorruptionparty.us", bgColor: "#1a3a5c", align: "center" };
    case "image":   return { type, url: "", alt: "", linkUrl: "" };
    case "divider": return { type };
    case "spacer":  return { type, height: 24 };
    case "footer":  return { type, text: `© ${new Date().getFullYear()} Anti-Corruption Party · noreply@anticorruptionparty.us` };
  }
}

// ── HTML renderer ─────────────────────────────────────────────────────────────

function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map(b => {
    switch (b.type) {
      case "header": return `
        <tr><td style="background:${b.bgColor};padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${b.title}</h1>
          ${b.subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${b.subtitle}</p>` : ""}
        </td></tr>`;
      case "text": return `
        <tr><td style="padding:20px 40px;">
          <p style="margin:0;color:#333333;font-size:15px;line-height:1.7;text-align:${b.align};">${b.content.replace(/\n/g, "<br/>")}</p>
        </td></tr>`;
      case "button": return `
        <tr><td style="padding:8px 40px 20px;text-align:${b.align};">
          <a href="${b.url}" style="display:inline-block;background:${b.bgColor};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">${b.label}</a>
        </td></tr>`;
      case "image": return `
        <tr><td style="padding:16px 40px;text-align:center;">
          ${b.linkUrl ? `<a href="${b.linkUrl}">` : ""}
          <img src="${b.url}" alt="${b.alt || ""}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
          ${b.linkUrl ? `</a>` : ""}
        </td></tr>`;
      case "divider": return `
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #eeeeee;margin:8px 0;" /></td></tr>`;
      case "spacer": return `<tr><td style="height:${b.height}px;line-height:${b.height}px;">&nbsp;</td></tr>`;
      case "footer": return `
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#aaaaaa;font-size:12px;">${b.text}</p>
        </td></tr>`;
    }
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:100%;">
        ${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Block editor ──────────────────────────────────────────────────────────────

function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const inp = (label: string, value: string, key: string, type = "text") => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type} value={value}
        onChange={e => onChange({ ...block, [key]: e.target.value } as EmailBlock)}
        className="h-7 text-xs"
      />
    </div>
  );

  switch (block.type) {
    case "header": return (
      <div className="space-y-2 p-3">
        {inp("Title", block.title, "title")}
        {inp("Subtitle", block.subtitle || "", "subtitle")}
        <div className="space-y-1">
          <Label className="text-xs">Background color</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={block.bgColor} onChange={e => onChange({ ...block, bgColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border border-border" />
            <Input value={block.bgColor} onChange={e => onChange({ ...block, bgColor: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
      </div>
    );
    case "text": return (
      <div className="space-y-2 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Content</Label>
          <Textarea value={block.content} rows={4} className="text-xs"
            onChange={e => onChange({ ...block, content: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alignment</Label>
          <Select value={block.align} onValueChange={v => onChange({ ...block, align: v as any })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
    case "button": return (
      <div className="space-y-2 p-3">
        {inp("Button label", block.label, "label")}
        {inp("URL", block.url, "url")}
        <div className="space-y-1">
          <Label className="text-xs">Button color</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={block.bgColor} onChange={e => onChange({ ...block, bgColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border border-border" />
            <Input value={block.bgColor} onChange={e => onChange({ ...block, bgColor: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alignment</Label>
          <Select value={block.align} onValueChange={v => onChange({ ...block, align: v as any })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
    case "image": return (
      <div className="space-y-2 p-3">
        {inp("Image URL", block.url, "url")}
        {inp("Alt text", block.alt || "", "alt")}
        {inp("Link URL (optional)", block.linkUrl || "", "linkUrl")}
      </div>
    );
    case "spacer": return (
      <div className="space-y-1 p-3">
        <Label className="text-xs">Height (px)</Label>
        <Input type="number" value={block.height} min={4} max={120}
          onChange={e => onChange({ ...block, height: Number(e.target.value) })} className="h-7 text-xs w-24" />
      </div>
    );
    case "footer": return (
      <div className="space-y-1 p-3">
        {inp("Footer text", block.text, "text")}
      </div>
    );
    case "divider": return <p className="text-xs text-muted-foreground p-3">A horizontal divider line — no settings.</p>;
  }
}

// ── Block card in the list ────────────────────────────────────────────────────

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  header: Type, text: AlignCenter, button: Square,
  image: Image, divider: Minus, spacer: Minus, footer: AlignCenter,
};
const BLOCK_LABELS: Record<BlockType, string> = {
  header: "Header", text: "Text", button: "Button",
  image: "Image", divider: "Divider", spacer: "Spacer", footer: "Footer",
};

function BlockCard({ block, index, total, onMove, onDelete, onChange }: {
  block: EmailBlock; index: number; total: number;
  onMove: (dir: -1 | 1) => void; onDelete: () => void; onChange: (b: EmailBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = BLOCK_ICONS[block.type];
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium flex-1">{BLOCK_LABELS[block.type]}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={index === 0}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onMove(1); }} disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950 text-red-500 ml-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && <BlockEditor block={block} onChange={onChange} />}
    </div>
  );
}

// ── Send blast modal ──────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "premium", label: "Premium members only" },
  { value: "free", label: "Free accounts only" },
  { value: "citizen", label: "Citizens only" },
  { value: "candidate", label: "Candidates only" },
  { value: "admin", label: "Admins only" },
];

function SendBlastModal({ template, open, onClose }: {
  template: any; open: boolean; onClose: () => void;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [subjectOverride, setSubjectOverride] = useState(template?.subject || "");

  useEffect(() => { setSubjectOverride(template?.subject || ""); }, [template]);

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/email-blast-recipients", filter],
    queryFn: () => fetch(`/api/admin/email-blast-recipients?filter=${filter}`, { credentials: "include" }).then(r => r.json()),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/email-templates/${template.id}/send`, { filter, subjectOverride }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Blast sent!", description: `${data.sent} emails sent${data.failed > 0 ? `, ${data.failed} failed` : ""}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-blast-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      onClose();
    },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-500" /> Send Email Blast
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Subject line</Label>
            <Input value={subjectOverride} onChange={e => setSubjectOverride(e.target.value)} />
            <p className="text-xs text-muted-foreground">Defaults to the template subject. Override if needed.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Recipients</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
            <Users className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {countData ? `${countData.count} recipient${countData.count !== 1 ? "s" : ""}` : "Calculating…"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This will send a real email to every matching user via SendGrid. This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !countData || countData.count === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send to {countData?.count ?? "…"} recipients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BLOCK_TOOLBAR: { type: BlockType; icon: React.ElementType; label: string }[] = [
  { type: "header", icon: Type, label: "Header" },
  { type: "text", icon: AlignCenter, label: "Text" },
  { type: "button", icon: Square, label: "Button" },
  { type: "image", icon: Image, label: "Image" },
  { type: "divider", icon: Minus, label: "Divider" },
  { type: "spacer", icon: Minus, label: "Spacer" },
  { type: "footer", icon: AlignCenter, label: "Footer" },
];

const CATEGORIES = ["general", "newsletter", "announcement", "onboarding", "fundraising", "event", "alert"];

const DEFAULT_BLOCKS: EmailBlock[] = [
  { type: "header", title: "Anti-Corruption Party", subtitle: "Fighting for transparency and accountability", bgColor: "#1a3a5c" },
  { type: "text", content: "Write your message here...", align: "left" },
  { type: "button", label: "Learn More", url: "https://anticorruptionparty.us", bgColor: "#1a3a5c", align: "center" },
  { type: "footer", text: `© ${new Date().getFullYear()} Anti-Corruption Party · noreply@anticorruptionparty.us` },
];

export default function AdminEmailTemplatesPage() {
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"build" | "html" | "preview">("build");
  const [blocks, setBlocks] = useState<EmailBlock[]>(DEFAULT_BLOCKS);
  const [htmlOverride, setHtmlOverride] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [category, setCategory] = useState("general");
  const [isDirty, setIsDirty] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const { data: blastLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/email-blast-logs"],
  });

  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;

  // Load template into editor
  function loadTemplate(t: any) {
    setSelectedId(t.id);
    setName(t.name);
    setSubject(t.subject);
    setPreviewText(t.previewText || "");
    setCategory(t.category || "general");
    setBlocks(t.blocks && Array.isArray(t.blocks) ? t.blocks : DEFAULT_BLOCKS);
    setHtmlOverride(null);
    setIsDirty(false);
    setEditorTab("build");
  }

  const generatedHtml = useMemo(() => blocksToHtml(blocks), [blocks]);
  const finalHtml = htmlOverride !== null ? htmlOverride : generatedHtml;

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/email-templates", data),
    onSuccess: async (res: any) => {
      const t = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      loadTemplate(t);
      setShowNewForm(false);
      setNewName("");
      toast({ title: "Template created" });
    },
    onError: () => toast({ title: "Create failed", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/admin/email-templates/${selectedId}`, {
      name, subject, previewText, category,
      blocks, bodyHtml: finalHtml, bodyText: subject,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setIsDirty(false);
      toast({ title: "Saved" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email-templates/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setSelectedId(null);
      toast({ title: "Deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  function addBlock(type: BlockType) {
    setBlocks(prev => [...prev, newBlock(type)]);
    setIsDirty(true);
    setHtmlOverride(null);
  }

  function updateBlock(i: number, b: EmailBlock) {
    setBlocks(prev => prev.map((x, j) => j === i ? b : x));
    setIsDirty(true);
    setHtmlOverride(null);
  }

  function removeBlock(i: number) {
    setBlocks(prev => prev.filter((_, j) => j !== i));
    setIsDirty(true);
    setHtmlOverride(null);
  }

  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
    setIsDirty(true);
    setHtmlOverride(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Email Template Builder</h1>
              <p className="text-sm text-muted-foreground">Design and send email blasts via SendGrid</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNewForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Left: template list ── */}
          <aside className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Templates ({templates.length})</p>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No templates yet.<br />Create one to get started.
              </div>
            ) : (
              <div className="space-y-1.5">
                {templates.map(t => (
                  <button key={t.id} onClick={() => loadTemplate(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      selectedId === t.id
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                        : "border-border hover:border-blue-200 hover:bg-muted/50"
                    }`}>
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{t.category}</Badge>
                      {t.sendCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">{t.sendCount} sent</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent blast logs summary */}
            {blastLogs.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Blasts</p>
                {blastLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-muted/30 rounded border border-border">
                    {log.status === "sent" ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> :
                     log.status === "failed" ? <XCircle className="h-3 w-3 text-red-500 shrink-0" /> :
                     <Clock className="h-3 w-3 text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{log.subject}</p>
                      <p className="text-muted-foreground">{log.sentCount} sent</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── Right: editor ── */}
          <main>
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center h-80 border border-dashed border-border rounded-xl text-muted-foreground gap-3">
                <LayoutTemplate className="h-12 w-12 opacity-20" />
                <p className="font-medium">Select a template to edit</p>
                <Button size="sm" variant="outline" onClick={() => setShowNewForm(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> New Template
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toolbar row */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input value={name} onChange={e => { setName(e.target.value); setIsDirty(true); }}
                      className="font-semibold text-sm h-8" placeholder="Template name" />
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty && <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Unsaved</Badge>}
                    <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(selectedId!)}
                      className="text-red-500 hover:text-red-700 border-red-200 h-8">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-8">
                      {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" onClick={() => setSendOpen(true)} className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="h-3.5 w-3.5" /> Send Blast
                    </Button>
                  </div>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Subject line</Label>
                    <Input value={subject} onChange={e => { setSubject(e.target.value); setIsDirty(true); }} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={category} onValueChange={v => { setCategory(v); setIsDirty(true); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Preview text <span className="text-muted-foreground">(shown in inbox before opening)</span></Label>
                    <Input value={previewText} onChange={e => { setPreviewText(e.target.value); setIsDirty(true); }} className="h-8 text-sm" placeholder="Short preview text…" />
                  </div>
                </div>

                {/* Main editor tabs */}
                <Tabs value={editorTab} onValueChange={v => setEditorTab(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="build" className="text-xs gap-1.5 h-7"><LayoutTemplate className="h-3.5 w-3.5" />Build</TabsTrigger>
                    <TabsTrigger value="html" className="text-xs gap-1.5 h-7"><Code2 className="h-3.5 w-3.5" />HTML</TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs gap-1.5 h-7"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
                  </TabsList>

                  {/* ── BUILD TAB ── */}
                  <TabsContent value="build" className="mt-3">
                    {/* Add-block toolbar */}
                    <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-muted/40 rounded-lg border border-border">
                      <span className="text-xs text-muted-foreground self-center mr-1">Add:</span>
                      {BLOCK_TOOLBAR.map(b => (
                        <Button key={b.type} size="sm" variant="outline" onClick={() => addBlock(b.type)}
                          className="h-7 text-xs gap-1 px-2.5">
                          <b.icon className="h-3 w-3" />{b.label}
                        </Button>
                      ))}
                    </div>
                    {blocks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                        Add blocks above to build your email
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blocks.map((block, i) => (
                          <BlockCard key={i} block={block} index={i} total={blocks.length}
                            onMove={dir => moveBlock(i, dir)}
                            onDelete={() => removeBlock(i)}
                            onChange={b => updateBlock(i, b)} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── HTML TAB ── */}
                  <TabsContent value="html" className="mt-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground flex-1">
                          {htmlOverride !== null
                            ? "Editing raw HTML — changes here won't sync back to the block builder."
                            : "Auto-generated from blocks. Edit to override."}
                        </p>
                        {htmlOverride !== null && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setHtmlOverride(null); setIsDirty(true); }}>
                            Reset to blocks
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          onClick={() => { navigator.clipboard.writeText(finalHtml); toast({ title: "Copied!" }); }}>
                          <Copy className="h-3 w-3" />Copy
                        </Button>
                      </div>
                      <Textarea
                        value={finalHtml}
                        rows={28}
                        className="font-mono text-xs"
                        onChange={e => { setHtmlOverride(e.target.value); setIsDirty(true); }}
                      />
                    </div>
                  </TabsContent>

                  {/* ── PREVIEW TAB ── */}
                  <TabsContent value="preview" className="mt-3">
                    <div className="border border-border rounded-lg overflow-hidden bg-[#f4f4f5]">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Email preview — {subject || "(no subject)"}</span>
                      </div>
                      <iframe
                        title="Email preview"
                        srcDoc={finalHtml}
                        className="w-full h-[600px] border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* New template dialog */}
      <Dialog open={showNewForm} onOpenChange={v => !v && setShowNewForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Template name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Monthly Newsletter" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: newName.trim(),
                subject: newName.trim(),
                category: "general",
                blocks: DEFAULT_BLOCKS,
                bodyHtml: blocksToHtml(DEFAULT_BLOCKS),
              })}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send blast modal */}
      <SendBlastModal
        template={selectedTemplate}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
      />
    </div>
  );
}
