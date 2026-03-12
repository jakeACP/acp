import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, FileText, Users, MapPin, Edit, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";

interface Initiative {
  id: string;
  title: string;
  summary: string;
  fullTextMd?: string;
  status: string;
  jurisdictionId: string;
  createdBy: string;
  initiativeType?: string;
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

export default function InitiativeDetailPage() {
  const { id: initiativeId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: initiative, isLoading: isLoadingInitiative } = useQuery<Initiative>({
    queryKey: ["/api/initiatives", initiativeId],
    enabled: !!initiativeId,
  });

  const { data: jurisdictions = [] } = useQuery<Jurisdiction[]>({
    queryKey: ["/api/jurisdictions"],
    enabled: true
  });

  if (!initiativeId) {
    return (
      <div className="max-w-6xl mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Initiative not found</p>
            <Link href="/initiatives">
              <Button className="mt-4" data-testid="button-browse-initiatives">
                Browse Initiatives
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingInitiative) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        </div>
      </div>
    );
  }

  if (!initiative) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-6xl mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Initiative not found</p>
            <Link href="/initiatives">
              <Button className="mt-4" data-testid="button-browse-initiatives">
                Browse Initiatives
              </Button>
            </Link>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

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
    const jurisdiction = jurisdictions.find((j: Jurisdiction) => j.id === jurisdictionId);
    return jurisdiction?.name || jurisdictionId;
  };

  const canEdit = user && initiative.createdBy === user.id;

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/initiatives")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Initiatives
            </Button>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button 
                variant="outline"
                onClick={() => setLocation(`/initiatives/edit/${initiative.id}`)}
                data-testid="button-edit-initiative"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Initiative Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-3" data-testid="text-initiative-title">
                  {initiative.title}
                </CardTitle>
                <CardDescription className="text-lg">
                  {initiative.summary}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(initiative.status)} data-testid="badge-status">
                {initiative.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Tags */}
            {initiative.tags && initiative.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-4">
                {initiative.tags.map((tag) => (
                  <Badge key={tag} variant="outline" data-testid={`tag-${tag}`}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-jurisdiction">{getJurisdictionName(initiative.jurisdictionId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span data-testid="text-type">
                  {initiative.initiativeType?.replace('_', ' ').toLowerCase() || 'statute'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-created-date">
                  Created {new Date(initiative.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Separator />

            {/* Full Text */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Full Initiative Text</h3>
              <div 
                className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-6 rounded-lg"
                data-testid="text-full-initiative"
              >
                <div className="whitespace-pre-wrap">
                  {initiative.fullTextMd || "No full text provided."}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              {initiative.status === 'collecting_signatures' && (
                <Button className="bg-green-600 hover:bg-green-700 text-white" data-testid="button-sign">
                  <Users className="w-4 h-4 mr-2" />
                  Sign Petition
                </Button>
              )}
              {initiative.status === 'qualified' && (
                <Button variant="outline" data-testid="button-learn-more">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Learn How to Vote
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}