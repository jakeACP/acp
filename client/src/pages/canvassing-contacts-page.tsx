import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, Redirect } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MapPin, Mail, Phone, User, ArrowLeft, Send, Search,
  CheckSquare, Square, ChevronDown, ChevronUp, StickyNote,
} from "lucide-react";
import type { CanvassingPin, EmailTemplate } from "@shared/schema";

const PIN_COLORS = [
  { id: "red", label: "Republican", hex: "#ef4444", border: "#b91c1c" },
  { id: "white", label: "Independent", hex: "#f1f5f9", border: "#94a3b8" },
  { id: "blue", label: "Democrat", hex: "#2563eb", border: "#1d4ed8" },
] as const;

async function getCsrfToken(): Promise<string> {
  const r = await fetch("/api/csrf-token", { credentials: "include" });
  return (await r.json()).csrfToken ?? "";
}

export default function CanvassingContactsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const canAccess = user?.role === "admin" || user?.role === "candidate" || user?.role === "state_admin";

  const { data: pins = [], isLoading: pinsLoading } = useQuery<CanvassingPin[]>({
    queryKey: ["/api/canvassing/pins"],
    enabled: canAccess,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/canvassing/email-templates"],
    enabled: canAccess,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [leanFilter, setLeanFilter] = useState<"all" | "red" | "white" | "blue">("all");
  const [templateId, setTemplateId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!user) return <Redirect to="/auth" />;
  if (!canAccess) return <Redirect to="/" />;

  const filtered = pins.filter(p => {
    if (leanFilter !== "all" && p.color !== leanFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.contactName?.toLowerCase().includes(q) ||
      p.contactEmail?.toLowerCase().includes(q) ||
      p.contactPhone?.includes(q) ||
      p.note?.toLowerCase().includes(q)
    );
  });

  const withEmail = filtered.filter(p => p.contactEmail);
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(p => n.add(p.id)); return n; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectedWithEmail = [...selected].filter(id => pins.find(p => p.id === id && p.contactEmail));

  const handleSend = async () => {
    if (!templateId) { toast({ title: "Pick a template first", variant: "destructive" }); return; }
    if (selectedWithEmail.length === 0) {
      toast({ title: "No emails to send to", description: "Select contacts that have email addresses.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const csrf = await getCsrfToken();
      const resp = await fetch("/api/canvassing/contacts/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ pinIds: [...selected], templateId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message ?? `HTTP ${resp.status}`);
      toast({
        title: `${data.sent} email${data.sent !== 1 ? "s" : ""} sent!`,
        description: data.skipped > 0 ? `${data.skipped} skipped (no email address).` : undefined,
      });
      setSelected(new Set());
      setTemplateId("");
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const lean = (c: string) => PIN_COLORS.find(x => x.id === c);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Link href="/canvassing">
          <button type="button" className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <span className="font-semibold">Canvassing Contacts</span>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">{pins.length} total</Badge>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Send bar */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Send Newsletter
          </p>
          <div className="flex gap-2">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue placeholder="Choose a template…" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 && (
                  <SelectItem value="__none__" disabled>No templates yet</SelectItem>
                )}
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              disabled={sending || !templateId || selectedWithEmail.length === 0}
              onPointerDown={handleSend}
              className="flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 active:bg-primary/80 shrink-0"
            >
              {sending ? "Sending…" : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {selectedWithEmail.length}
                </>
              )}
            </button>
          </div>
          {selected.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selected.size} selected · {selectedWithEmail.length} have email addresses
              {selected.size - selectedWithEmail.length > 0 && ` · ${selected.size - selectedWithEmail.length} will be skipped (no email)`}
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Select value={leanFilter} onValueChange={(v: any) => setLeanFilter(v)}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leans</SelectItem>
              <SelectItem value="red">Republican</SelectItem>
              <SelectItem value="white">Independent</SelectItem>
              <SelectItem value="blue">Democrat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Select all row */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-1">
            <button type="button" onPointerDown={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {allFilteredSelected
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              {allFilteredSelected ? "Deselect all" : `Select all ${filtered.length}`}
            </button>
          </div>
        )}

        {/* Contact list */}
        {pinsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{pins.length === 0 ? "No contacts yet" : "No matches"}</p>
            <p className="text-sm mt-1">{pins.length === 0 ? "Drop pins on the canvassing map to build your list." : "Try a different search or filter."}</p>
            {pins.length === 0 && (
              <Link href="/canvassing">
                <button type="button" className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  Open Map
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(pin => {
              const lc = lean(pin.color);
              const isSelected = selected.has(pin.id);
              const isExpanded = expandedId === pin.id;
              const hasDetail = pin.note || pin.contactEmail || pin.contactPhone;
              return (
                <div
                  key={pin.id}
                  className={`rounded-xl border bg-card transition-all ${isSelected ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <button type="button" onPointerDown={() => toggleOne(pin.id)} className="shrink-0">
                      {isSelected
                        ? <CheckSquare className="h-5 w-5 text-primary" />
                        : <Square className="h-5 w-5 text-muted-foreground" />}
                    </button>

                    {/* Lean dot */}
                    <span className="w-3 h-3 rounded-full border-2 shrink-0"
                      style={{ background: lc?.hex, borderColor: lc?.border }} />

                    {/* Name / email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {pin.contactName || <span className="text-muted-foreground italic">No name</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pin.contactEmail || <span className="text-orange-500">No email</span>}
                      </p>
                    </div>

                    {/* Lean badge */}
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">{lc?.label}</Badge>

                    {/* Expand toggle */}
                    {hasDetail && (
                      <button type="button" onPointerDown={() => setExpandedId(isExpanded ? null : pin.id)} className="p-1 rounded hover:bg-muted shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t pt-3 space-y-1.5 text-sm">
                      {pin.contactPhone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${pin.contactPhone}`} className="text-primary underline">{pin.contactPhone}</a>
                        </div>
                      )}
                      {pin.contactEmail && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <a href={`mailto:${pin.contactEmail}`} className="text-primary underline">{pin.contactEmail}</a>
                        </div>
                      )}
                      {pin.note && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{pin.note}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground pt-0.5">
                        📍 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)} · {new Date(pin.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
