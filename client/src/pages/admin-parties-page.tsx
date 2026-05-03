import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, RefreshCw, Search, ExternalLink, BarChart2 } from "lucide-react";
import { POLICY_ISSUES } from "@/lib/issue-data";

type Party = {
  id: string;
  name: string;
  acronym: string | null;
  slug: string;
  websiteUrl: string | null;
  shortDescription: string | null;
  status: string;
  compassEconomic: number | null;
  compassSocial: number | null;
  transparencyScore: number | null;
  hasFederalBallotAccess: boolean | null;
  statesWithBallotAccess: number | null;
  foundedYear: number | null;
  endorsementCount: number;
  ratingCount: number;
  averageRating: number | null;
};

const EMPTY_FORM = {
  name: "",
  acronym: "",
  slug: "",
  websiteUrl: "",
  shortDescription: "",
  fullDescription: "",
  status: "active",
  compassEconomic: "",
  compassSocial: "",
  transparencyScore: "",
  hasFederalBallotAccess: false,
  statesWithBallotAccess: "",
  foundedYear: "",
  headquartersState: "",
  membershipEstimate: "",
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMPTY_POSITION_FORM = {
  issueId: "",
  positionValue: "",
  positionLabel: "",
};

export default function AdminPartiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [positionsParty, setPositionsParty] = useState<Party | null>(null);
  const [positionForm, setPositionForm] = useState({ ...EMPTY_POSITION_FORM });

  const { data: parties = [], isLoading } = useQuery<Party[]>({
    queryKey: ["/api/parties", { sort: "alpha" }],
    queryFn: async () => {
      const res = await fetch("/api/parties?sort=alpha");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/parties/seed", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({ title: "Seed completed", description: "15 starter parties have been added." });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/parties", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Party created" });
    },
    onError: (e: any) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/admin/parties/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      setEditParty(null);
      setShowForm(false);
      toast({ title: "Party updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/parties/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      setDeleteTarget(null);
      toast({ title: "Party deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const { data: partyPositions = [] } = useQuery<any[]>({
    queryKey: ["/api/parties", positionsParty?.id, "positions"],
    queryFn: async () => {
      const res = await fetch(`/api/parties/${positionsParty!.id}/positions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!positionsParty,
  });

  const addPositionMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/admin/parties/${positionsParty!.id}/positions`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties", positionsParty?.id, "positions"] });
      setPositionForm({ ...EMPTY_POSITION_FORM });
      toast({ title: "Position saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save position", description: e.message, variant: "destructive" }),
  });

  const deletePositionMutation = useMutation({
    mutationFn: (positionId: string) => apiRequest(`/api/admin/party-positions/${positionId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties", positionsParty?.id, "positions"] });
      toast({ title: "Position deleted" });
    },
    onError: () => toast({ title: "Failed to delete position", variant: "destructive" }),
  });

  const handleAddPosition = () => {
    if (!positionForm.issueId) return;
    const issue = POLICY_ISSUES.find(i => i.id === positionForm.issueId);
    const payload: any = {
      issueId: positionForm.issueId,
      issueLabel: issue?.title ?? positionForm.issueId,
      issueCategory: issue?.category ?? null,
      positionValue: positionForm.positionValue !== "" ? parseFloat(positionForm.positionValue) : null,
      positionLabel: positionForm.positionLabel.trim() || null,
    };
    addPositionMutation.mutate(payload);
  };

  const filtered = parties.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.acronym?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditParty(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (p: Party) => {
    setEditParty(p);
    setForm({
      name: p.name || "",
      acronym: p.acronym || "",
      slug: p.slug || "",
      websiteUrl: (p.websiteUrl as string) || "",
      shortDescription: p.shortDescription || "",
      fullDescription: "",
      status: p.status || "active",
      compassEconomic: p.compassEconomic !== null ? String(p.compassEconomic) : "",
      compassSocial: p.compassSocial !== null ? String(p.compassSocial) : "",
      transparencyScore: p.transparencyScore !== null ? String(p.transparencyScore) : "",
      hasFederalBallotAccess: p.hasFederalBallotAccess ?? false,
      statesWithBallotAccess: p.statesWithBallotAccess !== null ? String(p.statesWithBallotAccess) : "",
      foundedYear: p.foundedYear !== null ? String(p.foundedYear) : "",
      headquartersState: "",
      membershipEstimate: "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload: any = {
      name: form.name.trim(),
      acronym: form.acronym.trim() || null,
      slug: form.slug.trim() || slugify(form.name),
      websiteUrl: form.websiteUrl.trim() || null,
      shortDescription: form.shortDescription.trim() || null,
      fullDescription: form.fullDescription.trim() || null,
      status: form.status,
      hasFederalBallotAccess: form.hasFederalBallotAccess,
      compassEconomic: form.compassEconomic !== "" ? parseFloat(form.compassEconomic) : null,
      compassSocial: form.compassSocial !== "" ? parseFloat(form.compassSocial) : null,
      transparencyScore: form.transparencyScore !== "" ? parseFloat(form.transparencyScore) : null,
      statesWithBallotAccess: form.statesWithBallotAccess !== "" ? parseInt(form.statesWithBallotAccess) : null,
      foundedYear: form.foundedYear !== "" ? parseInt(form.foundedYear) : null,
      headquartersState: form.headquartersState.trim() || null,
      membershipEstimate: form.membershipEstimate.trim() || null,
    };

    if (editParty) {
      updateMutation.mutate({ id: editParty.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNavigation />
      <div className="flex-1 p-6 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Political Parties</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage the parties directory</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Seed 15 Parties
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search parties..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-sm" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p>No parties found. Use "Seed 15 Parties" to populate the database.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(party => (
                  <div key={party.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{party.name}</span>
                        {party.acronym && <Badge variant="outline" className="text-xs font-mono">{party.acronym}</Badge>}
                        <Badge variant={party.status === "active" ? "secondary" : "outline"} className="text-xs capitalize">{party.status}</Badge>
                        {party.hasFederalBallotAccess && <Badge className="text-xs bg-blue-600 hover:bg-blue-600">Federal</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>/{party.slug}</span>
                        {party.foundedYear && <span>Est. {party.foundedYear}</span>}
                        <span>{party.statesWithBallotAccess ?? 0} states</span>
                        <span>Transparency: {party.transparencyScore ?? "–"}%</span>
                        <span>{party.ratingCount} ratings</span>
                        <span>{party.endorsementCount} endorsements</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={`/parties/${party.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage policy positions" onClick={() => { setPositionsParty(party); setPositionForm({ ...EMPTY_POSITION_FORM }); }}>
                        <BarChart2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(party)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(party)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditParty(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editParty ? "Edit Party" : "Add Party"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} placeholder="Democratic Party" />
            </div>
            <div className="space-y-1">
              <Label>Acronym</Label>
              <Input value={form.acronym} onChange={e => setForm(f => ({ ...f, acronym: e.target.value }))} placeholder="DEM" maxLength={10} />
            </div>
            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="democratic-party" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="historical">Historical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Website URL</Label>
              <Input value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://example.com" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Short Description</Label>
              <Textarea value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Full Description</Label>
              <Textarea value={form.fullDescription} onChange={e => setForm(f => ({ ...f, fullDescription: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-1">
              <Label>Economic Axis (-10 to +10)</Label>
              <Input type="number" min={-10} max={10} step={0.5} value={form.compassEconomic} onChange={e => setForm(f => ({ ...f, compassEconomic: e.target.value }))} placeholder="-2.5" />
            </div>
            <div className="space-y-1">
              <Label>Social Axis (-10 to +10)</Label>
              <Input type="number" min={-10} max={10} step={0.5} value={form.compassSocial} onChange={e => setForm(f => ({ ...f, compassSocial: e.target.value }))} placeholder="4.0" />
            </div>
            <div className="space-y-1">
              <Label>Transparency Score (0–100)</Label>
              <Input type="number" min={0} max={100} step={1} value={form.transparencyScore} onChange={e => setForm(f => ({ ...f, transparencyScore: e.target.value }))} placeholder="65" />
            </div>
            <div className="space-y-1">
              <Label>States With Ballot Access</Label>
              <Input type="number" min={0} max={50} value={form.statesWithBallotAccess} onChange={e => setForm(f => ({ ...f, statesWithBallotAccess: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Founded Year</Label>
              <Input type="number" min={1776} max={2100} value={form.foundedYear} onChange={e => setForm(f => ({ ...f, foundedYear: e.target.value }))} placeholder="1828" />
            </div>
            <div className="space-y-1">
              <Label>HQ State</Label>
              <Input value={form.headquartersState} onChange={e => setForm(f => ({ ...f, headquartersState: e.target.value }))} placeholder="DC" maxLength={20} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Membership Estimate</Label>
              <Input value={form.membershipEstimate} onChange={e => setForm(f => ({ ...f, membershipEstimate: e.target.value }))} placeholder="47 million registered voters" />
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.hasFederalBallotAccess} onCheckedChange={v => setForm(f => ({ ...f, hasFederalBallotAccess: v }))} />
              <Label>Federal Ballot Access (all 50 states)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditParty(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editParty ? "Save Changes" : "Create Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete all associated leaders, endorsements, positions, and ratings.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Positions Dialog */}
      <Dialog open={!!positionsParty} onOpenChange={v => { if (!v) setPositionsParty(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy Positions — {positionsParty?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing positions */}
            {partyPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No positions on record yet. Add one below.</p>
            ) : (
              <div className="divide-y divide-border border rounded-md">
                {partyPositions.map((pos: any) => (
                  <div key={pos.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pos.issueLabel || pos.issueId}</p>
                      <p className="text-xs text-muted-foreground">{pos.issueCategory || ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pos.positionLabel && (
                        <Badge variant="outline" className="text-xs">{pos.positionLabel}</Badge>
                      )}
                      {pos.positionValue !== null && (
                        <span className="text-xs text-muted-foreground">{pos.positionValue}/5</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deletePositionMutation.mutate(pos.id)}
                        disabled={deletePositionMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new position */}
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Add Position</p>
              <div className="space-y-1">
                <Label className="text-xs">Issue *</Label>
                <Select value={positionForm.issueId} onValueChange={v => setPositionForm(f => ({ ...f, issueId: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select an issue..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {POLICY_ISSUES.map(issue => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.title} <span className="text-muted-foreground text-xs">({issue.category})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Position Value (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={0.5}
                    placeholder="e.g. 4"
                    className="h-8 text-sm"
                    value={positionForm.positionValue}
                    onChange={e => setPositionForm(f => ({ ...f, positionValue: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">1 = Much Less, 5 = Much More</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position Label</Label>
                  <Input
                    placeholder="e.g. Strongly Supports"
                    className="h-8 text-sm"
                    value={positionForm.positionLabel}
                    onChange={e => setPositionForm(f => ({ ...f, positionLabel: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddPosition}
                disabled={!positionForm.issueId || addPositionMutation.isPending}
              >
                {addPositionMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Add Position
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionsParty(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
