import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Lock,
  GripVertical,
  ChevronDown,
  ChevronRight,
  DollarSign,
  BarChart3,
  Copy,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Category {
  id: string;
  name: string;
  amountBillions: number;
  isLocked: boolean;
  lockedTooltip?: string | null;
  sortOrder: number;
  colorHex?: string | null;
}

interface Baseline {
  id: string;
  fiscalYear: number;
  sourceName: string;
  sourceUrl?: string | null;
  totalOutlays: number;
  totalReceipts: number;
  deficit: number;
  isActive: boolean;
  sliderRangeMin: number;
  sliderRangeMax: number;
  categories: Category[];
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6b7280",
];

function formatB(v: number) {
  return `$${v.toFixed(0)}B`;
}

function CategoryEditor({
  baselineId,
  categories,
  onRefresh,
}: {
  baselineId: string;
  categories: Category[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [newForm, setNewForm] = useState({
    name: "",
    amountBillions: "",
    colorHex: PRESET_COLORS[0],
    isLocked: false,
    lockedTooltip: "",
  });
  const [showNew, setShowNew] = useState(false);

  const updateCat = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) =>
      apiRequest("PATCH", `/api/admin/budget-baselines/${baselineId}/categories/${id}`, data),
    onSuccess: () => { onRefresh(); setEditingId(null); toast({ title: "Category updated" }); },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/admin/budget-baselines/${baselineId}/categories/${id}`, {}),
    onSuccess: () => { onRefresh(); toast({ title: "Category deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const addCat = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/budget-baselines/${baselineId}/categories`, {
        name: newForm.name,
        amountBillions: parseFloat(newForm.amountBillions),
        colorHex: newForm.colorHex,
        isLocked: newForm.isLocked,
        lockedTooltip: newForm.lockedTooltip || null,
        sortOrder: categories.length,
      }),
    onSuccess: () => {
      onRefresh();
      setNewForm({ name: "", amountBillions: "", colorHex: PRESET_COLORS[0], isLocked: false, lockedTooltip: "" });
      setShowNew(false);
      toast({ title: "Category added" });
    },
    onError: () => toast({ title: "Add failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-2">
      {categories.map((cat, idx) => (
        <div key={cat.id} className="border rounded-lg">
          {editingId === cat.id ? (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editForm.name ?? cat.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount ($B)</Label>
                  <Input
                    type="number"
                    value={editForm.amountBillions ?? cat.amountBillions}
                    onChange={(e) => setEditForm((f) => ({ ...f, amountBillions: parseFloat(e.target.value) }))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-5 h-5 rounded-full border-2 ${(editForm.colorHex ?? cat.colorHex) === c ? "border-slate-900" : "border-transparent"}`}
                        style={{ background: c }}
                        onClick={() => setEditForm((f) => ({ ...f, colorHex: c }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Locked</Label>
                  <Switch
                    checked={editForm.isLocked ?? cat.isLocked}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, isLocked: v }))}
                  />
                </div>
              </div>
              {(editForm.isLocked ?? cat.isLocked) && (
                <div>
                  <Label className="text-xs">Lock Tooltip</Label>
                  <Input
                    value={editForm.lockedTooltip ?? cat.lockedTooltip ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, lockedTooltip: e.target.value }))}
                    className="h-7 text-xs"
                    placeholder="Why is this locked?"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateCat.mutate({ id: cat.id, ...editForm })}
                  disabled={updateCat.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.colorHex ?? "#94a3b8" }} />
              <span className="text-sm flex-1 truncate">{cat.name}</span>
              {cat.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{formatB(cat.amountBillions)}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => { setEditingId(cat.id); setEditForm({}); }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCat.mutate(cat.id); }}
                  disabled={deleteCat.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <div className="border border-dashed rounded-lg p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">New Category</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                className="h-7 text-xs"
                placeholder="e.g. Education"
              />
            </div>
            <div>
              <Label className="text-xs">Amount ($B)</Label>
              <Input
                type="number"
                value={newForm.amountBillions}
                onChange={(e) => setNewForm((f) => ({ ...f, amountBillions: e.target.value }))}
                className="h-7 text-xs"
                placeholder="e.g. 200"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1 flex-wrap mt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border-2 ${newForm.colorHex === c ? "border-slate-900" : "border-transparent"}`}
                  style={{ background: c }}
                  onClick={() => setNewForm((f) => ({ ...f, colorHex: c }))}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newForm.isLocked}
              onCheckedChange={(v) => setNewForm((f) => ({ ...f, isLocked: v }))}
            />
            <Label className="text-xs">Locked category</Label>
          </div>
          {newForm.isLocked && (
            <div>
              <Label className="text-xs">Lock Tooltip</Label>
              <Input
                value={newForm.lockedTooltip}
                onChange={(e) => setNewForm((f) => ({ ...f, lockedTooltip: e.target.value }))}
                className="h-7 text-xs"
                placeholder="Why is this locked?"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => addCat.mutate()}
              disabled={addCat.isPending || !newForm.name || !newForm.amountBillions}
            >
              Add Category
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => setShowNew(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Category
        </Button>
      )}
    </div>
  );
}

export default function AdminBudgetBaselinesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    fiscalYear: new Date().getFullYear(),
    sourceName: "",
    sourceUrl: "",
    totalOutlays: "",
    totalReceipts: "",
    deficit: "",
  });
  const [sliderEdits, setSliderEdits] = useState<Record<string, { min: number; max: number }>>({});
  const [cloneFiscalYear, setCloneFiscalYear] = useState<Record<string, string>>({});

  const { data: baselines = [], refetch } = useQuery<Baseline[]>({
    queryKey: ["/api/admin/budget-baselines"],
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/budget-baselines", {
        fiscalYear: createForm.fiscalYear,
        sourceName: createForm.sourceName,
        sourceUrl: createForm.sourceUrl || null,
        totalOutlays: parseFloat(createForm.totalOutlays),
        totalReceipts: parseFloat(createForm.totalReceipts),
        deficit: parseFloat(createForm.deficit),
        isActive: false,
      }),
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setCreateForm({ fiscalYear: new Date().getFullYear(), sourceName: "", sourceUrl: "", totalOutlays: "", totalReceipts: "", deficit: "" });
      toast({ title: "Baseline created" });
    },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("PATCH", `/api/admin/budget-baselines/${id}/set-active`, {}),
    onSuccess: () => { refetch(); toast({ title: "Active baseline updated" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/admin/budget-baselines/${id}`, {}),
    onSuccess: () => { refetch(); toast({ title: "Baseline deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const updateSliderMutation = useMutation({
    mutationFn: async ({ id, min, max }: { id: string; min: number; max: number }) =>
      apiRequest("PATCH", `/api/admin/budget-baselines/${id}`, { sliderRangeMin: min, sliderRangeMax: max }),
    onSuccess: () => { refetch(); toast({ title: "Slider range saved" }); },
    onError: () => toast({ title: "Failed to save slider range", variant: "destructive" }),
  });

  const cloneMutation = useMutation({
    mutationFn: async ({ id, fiscalYear }: { id: string; fiscalYear: number }) =>
      apiRequest("POST", `/api/admin/budget-baselines/${id}/clone`, { fiscalYear }),
    onSuccess: () => {
      refetch();
      toast({ title: "Baseline cloned successfully" });
    },
    onError: () => toast({ title: "Clone failed", variant: "destructive" }),
  });

  const { data: districtAverages } = useQuery<any>({
    queryKey: ["/api/admin/budget-simulations/district-averages"],
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Budget Baselines</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage fiscal year baselines for the Economic Policy Simulator
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/budget-simulator" target="_blank" rel="noopener noreferrer">
                <DollarSign className="h-4 w-4 mr-1" /> Preview Simulator
              </a>
            </Button>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Baseline
            </Button>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">New Fiscal Year Baseline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Fiscal Year</Label>
                  <Input
                    type="number"
                    value={createForm.fiscalYear}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fiscalYear: parseInt(e.target.value) }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Source Name</Label>
                  <Input
                    value={createForm.sourceName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sourceName: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="e.g. Congressional Budget Office (CBO)"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Source URL (optional)</Label>
                  <Input
                    value={createForm.sourceUrl}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Outlays ($B)</Label>
                  <Input
                    type="number"
                    value={createForm.totalOutlays}
                    onChange={(e) => setCreateForm((f) => ({ ...f, totalOutlays: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="e.g. 6752"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Receipts ($B)</Label>
                  <Input
                    type="number"
                    value={createForm.totalReceipts}
                    onChange={(e) => setCreateForm((f) => ({ ...f, totalReceipts: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="e.g. 4919"
                  />
                </div>
                <div>
                  <Label className="text-xs">Deficit ($B)</Label>
                  <Input
                    type="number"
                    value={createForm.deficit}
                    onChange={(e) => setCreateForm((f) => ({ ...f, deficit: e.target.value }))}
                    className="h-8 text-sm"
                    placeholder="e.g. 1833"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !createForm.sourceName || !createForm.totalOutlays}
                >
                  Create Baseline
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Baselines list */}
        {baselines.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No baselines found. Create one above or wait for the FY 2024 seed.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {baselines.map((bl) => {
              const isExpanded = expandedId === bl.id;
              const pieData = bl.categories.map((c) => ({
                name: c.name,
                value: c.amountBillions,
                color: c.colorHex ?? "#94a3b8",
              }));
              const total = bl.categories.reduce((s, c) => s + c.amountBillions, 0);

              return (
                <Card key={bl.id} className={bl.isActive ? "border-green-400 dark:border-green-700" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : bl.id)}
                          className="flex items-center gap-2"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <h3 className="font-semibold text-sm">FY {bl.fiscalYear} — {bl.sourceName}</h3>
                        </button>
                        {bl.isActive && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-muted-foreground hidden md:block">
                          <p>Outlays: {formatB(bl.totalOutlays)}</p>
                          <p>Deficit: {formatB(bl.deficit)}</p>
                        </div>
                        {!bl.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setActiveMutation.mutate(bl.id)}
                            disabled={setActiveMutation.isPending}
                          >
                            Set Active
                          </Button>
                        )}
                        {!bl.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500"
                            onClick={() => { if (confirm("Delete this baseline?")) deleteMutation.mutate(bl.id); }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pie chart preview */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Budget Pie Preview</p>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                {pieData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v: number, n: string) => [`$${v.toFixed(0)}B`, n]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {pieData.map((d) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                                <span className="truncate">{d.name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Outlays</p>
                              <p className="text-sm font-bold">{formatB(bl.totalOutlays)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Receipts</p>
                              <p className="text-sm font-bold">{formatB(bl.totalReceipts)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Deficit</p>
                              <p className="text-sm font-bold text-red-600">{formatB(bl.deficit)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Category editor */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                            Categories ({bl.categories.length}) — Total: {formatB(total)}
                          </p>
                          <CategoryEditor baselineId={bl.id} categories={bl.categories} onRefresh={refetch} />
                        </div>
                      </div>

                      {/* Simulator Settings */}
                      <div className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                          <Settings2 className="h-3.5 w-3.5" /> Simulator Settings
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Category Slider Range (%)</p>
                            <p className="text-[11px] text-muted-foreground">Controls how far users can adjust each spending category in the simulator.</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Label className="text-[10px] text-muted-foreground">Min %</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={sliderEdits[bl.id]?.min ?? bl.sliderRangeMin ?? -10}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value);
                                    setSliderEdits((prev) => ({
                                      ...prev,
                                      [bl.id]: { min: Number.isNaN(parsed) ? (prev[bl.id]?.min ?? bl.sliderRangeMin ?? -10) : parsed, max: prev[bl.id]?.max ?? bl.sliderRangeMax ?? 10 },
                                    }));
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-[10px] text-muted-foreground">Max %</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={sliderEdits[bl.id]?.max ?? bl.sliderRangeMax ?? 10}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value);
                                    setSliderEdits((prev) => ({
                                      ...prev,
                                      [bl.id]: { min: prev[bl.id]?.min ?? bl.sliderRangeMin ?? -10, max: Number.isNaN(parsed) ? (prev[bl.id]?.max ?? bl.sliderRangeMax ?? 10) : parsed },
                                    }));
                                  }}
                                />
                              </div>
                              <div className="flex items-end pb-0.5">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const edit = sliderEdits[bl.id];
                                    updateSliderMutation.mutate({
                                      id: bl.id,
                                      min: edit?.min ?? bl.sliderRangeMin ?? -10,
                                      max: edit?.max ?? bl.sliderRangeMax ?? 10,
                                    });
                                  }}
                                  disabled={updateSliderMutation.isPending}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Current: {bl.sliderRangeMin ?? -10}% to +{bl.sliderRangeMax ?? 10}%
                            </p>
                          </div>

                          {/* Clone baseline */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Clone as New Fiscal Year</p>
                            <p className="text-[11px] text-muted-foreground">Copy this baseline's categories and settings to a new fiscal year.</p>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-[10px] text-muted-foreground">New Fiscal Year</Label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  placeholder={String(bl.fiscalYear + 1)}
                                  value={cloneFiscalYear[bl.id] ?? ""}
                                  onChange={(e) => setCloneFiscalYear((prev) => ({ ...prev, [bl.id]: e.target.value }))}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs shrink-0"
                                onClick={() => {
                                  const fy = parseInt(cloneFiscalYear[bl.id] ?? "");
                                  if (!fy) return;
                                  if (confirm(`Clone FY ${bl.fiscalYear} as FY ${fy}?`)) {
                                    cloneMutation.mutate({ id: bl.id, fiscalYear: fy });
                                    setCloneFiscalYear((prev) => ({ ...prev, [bl.id]: "" }));
                                  }
                                }}
                                disabled={cloneMutation.isPending || !cloneFiscalYear[bl.id]}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Clone
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* District averages */}
        {districtAverages && districtAverages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> District Aggregation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">District / Location</th>
                      <th className="text-right py-2 font-medium">Submissions</th>
                      <th className="text-right py-2 font-medium">Avg Deficit</th>
                      <th className="text-left py-2 font-medium pl-4">Top Labels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtAverages.map((row: any) => (
                      <tr key={row.district} className="border-b last:border-0">
                        <td className="py-2">{row.district || "Unknown"}</td>
                        <td className="text-right py-2">{row.count}</td>
                        <td className={`text-right py-2 font-semibold ${row.avgDeficit >= 0 ? "text-red-600" : "text-green-600"}`}>
                          ${Math.abs(row.avgDeficit).toFixed(0)}B
                        </td>
                        <td className="py-2 pl-4">
                          {Object.entries(row.labelDistribution ?? {}).slice(0, 2).map(([label, count]) => (
                            <span key={label} className="inline-block mr-2 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {label}: {count as number}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
