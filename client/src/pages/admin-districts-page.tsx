import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Search, Map, Users, UserCheck, Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const DISTRICT_TYPES = [
  "congressional", "state_senate", "state_house", "county", "city",
  "school", "judicial", "special",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function AdminDistrictsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (typeFilter !== "all") params.set("districtType", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");
    params.set("offset", "0");
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<{ districts: any[]; total: number }>({
    queryKey: ["/api/admin/districts", search, stateFilter, typeFilter, statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/districts?${buildQuery()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch districts");
      return res.json();
    },
  });

  const districts = data?.districts ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Districts
                </CardTitle>
                <CardDescription>
                  Manage political and geographic district boundaries. AI-assisted boundary drafting available.
                </CardDescription>
              </div>
              <Link href="/admin/districts/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New District
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search districts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DISTRICT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats summary */}
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Showing {districts.length} of {data?.total ?? 0} districts
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">Loading districts...</div>
            ) : districts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <Map className="h-10 w-10 text-slate-300" />
                <p>No districts found. Create your first district to get started.</p>
                <Link href="/admin/districts/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" /> New District
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="text-center">
                        <Users className="h-4 w-4 inline" /> Users
                      </TableHead>
                      <TableHead className="text-center">
                        <UserCheck className="h-4 w-4 inline" /> Candidates
                      </TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {districts.map(d => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => navigate(`/admin/districts/${d.id}`)}
                      >
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>
                          <span className="capitalize text-xs">{d.districtType?.replace(/_/g, " ")}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{d.state}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status] ?? ""}`}>
                            {d.status?.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {d.confidenceScore != null ? (
                            <span className={`text-xs ${d.confidenceScore >= 0.7 ? "text-green-600" : d.confidenceScore >= 0.4 ? "text-amber-600" : "text-red-500"}`}>
                              {Math.round(d.confidenceScore * 100)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">{d.userCount ?? 0}</TableCell>
                        <TableCell className="text-center text-sm">{d.candidateCount ?? 0}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {d.updatedAt ? format(new Date(d.updatedAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
