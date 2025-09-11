import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, FileText, Users, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";

interface Initiative {
  id: string;
  title: string;
  summary: string;
  status: string;
  jurisdictionId: string;
  createdBy: string;
  currentVersionId?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export default function InitiativesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");

  // Fetch initiatives
  const { data: initiatives = [], isLoading: initiativesLoading } = useQuery({
    queryKey: ["/api/initiatives", { status: statusFilter !== "all" ? statusFilter : undefined, jurisdictionId: jurisdictionFilter !== "all" ? jurisdictionFilter : undefined }],
    enabled: true
  });

  // Fetch jurisdictions for filter
  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["/api/jurisdictions"],
    enabled: true
  });

  // Filter initiatives based on search term
  const filteredInitiatives = (initiatives as Initiative[]).filter((initiative: Initiative) => 
    initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    initiative.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (initiative.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'collecting_signatures': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'qualified': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getJurisdictionName = (jurisdictionId: string) => {
    const jurisdiction = (jurisdictions as Jurisdiction[]).find((j: Jurisdiction) => j.id === jurisdictionId);
    return jurisdiction?.name || jurisdictionId;
  };

  if (initiativesLoading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Citizen Initiatives
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Propose, support, and track ballot measures in your jurisdiction
            </p>
          </div>
          {user && (
            <Button 
              onClick={() => setLocation("/initiatives/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-create-initiative"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Initiative
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search initiatives by title, summary, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="collecting_signatures">Collecting Signatures</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
                  <SelectTrigger className="w-48" data-testid="select-jurisdiction">
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jurisdictions</SelectItem>
                    {(jurisdictions as Jurisdiction[]).map((jurisdiction: Jurisdiction) => (
                      <SelectItem key={jurisdiction.id} value={jurisdiction.id}>
                        {jurisdiction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Initiatives Grid */}
        {filteredInitiatives.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No initiatives found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? "Try adjusting your search or filters" : "Be the first to create an initiative"}
              </p>
              {user && !searchTerm && (
                <Button 
                  onClick={() => setLocation("/initiatives/new")}
                  variant="outline"
                  data-testid="button-create-first-initiative"
                >
                  Create Initiative
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredInitiatives.map((initiative: Initiative) => (
              <Card key={initiative.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        <Link 
                          href={`/initiatives/${initiative.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          data-testid={`link-initiative-${initiative.id}`}
                        >
                          {initiative.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-base">
                        {initiative.summary}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(initiative.status)}>
                      {initiative.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{getJurisdictionName(initiative.jurisdictionId)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(initiative.createdAt).toLocaleDateString()}</span>
                    </div>
                    {initiative.tags && initiative.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {initiative.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}