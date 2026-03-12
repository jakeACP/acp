import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { FriendButton } from "@/components/friend-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Heart, HeartOff, Users, Calendar, FileText, MapPin, Mail } from "lucide-react";
import { format } from "date-fns";

interface CandidateWithUser {
  id: string;
  userId: string;
  position: string;
  platform: string;
  proposals: { id: string; title: string; description: string }[];
  endorsements: number;
  isActive: boolean;
  createdAt: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

interface User {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export default function CandidateProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get candidate ID from URL
  const candidateId = window.location.pathname.split('/').pop() || '';

  const { data: candidate, isLoading } = useQuery<CandidateWithUser>({
    queryKey: ["/api/candidates", candidateId],
    enabled: !!candidateId,
  });

  const { data: supportStatus } = useQuery<{ isSupporting: boolean }>({
    queryKey: ["/api/candidates", candidateId, "support-status"],
    enabled: !!candidateId && !!user,
  });

  const { data: supporters = [] } = useQuery<User[]>({
    queryKey: ["/api/candidates", candidateId, "supporters"],
    enabled: !!candidateId,
  });

  const supportMutation = useMutation({
    mutationFn: async ({ action }: { action: 'support' | 'unsupport' }) => {
      if (action === 'support') {
        return apiRequest(`/api/candidates/${candidateId}/support`, "POST");
      } else {
        return apiRequest(`/api/candidates/${candidateId}/support`, "DELETE");
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidateId, "support-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidateId, "supporters"] });
      
      toast({
        title: variables.action === 'support' ? "Support Added" : "Support Removed",
        description: variables.action === 'support' 
          ? "You're now supporting this candidate!" 
          : "You're no longer supporting this candidate.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update support",
        variant: "destructive",
      });
    },
  });

  const handleSupportToggle = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to support candidates",
        variant: "destructive",
      });
      return;
    }

    const action = supportStatus?.isSupporting ? 'unsupport' : 'support';
    supportMutation.mutate({ action });
  };

  const getDisplayName = (candidate: CandidateWithUser) => {
    const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
    return fullName || candidate.username;
  };

  const getInitials = (candidate: CandidateWithUser) => {
    const firstName = candidate.firstName || candidate.username.charAt(0);
    const lastName = candidate.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Candidate Not Found</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">The candidate you're looking for doesn't exist.</p>
            <Button 
              onClick={() => setLocation('/candidates')}
              className="mt-4"
            >
              Back to Candidates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnCandidacy = user?.id === candidate.userId;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/candidates')}
            data-testid="button-back-to-candidates"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Button>
        </div>

        {/* Candidate Header Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(candidate)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{getDisplayName(candidate)}</CardTitle>
                  <CardDescription className="text-lg font-medium">
                    Running for {candidate.position}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {candidate.endorsements} supporters
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Since {format(new Date(candidate.createdAt), "MMM yyyy")}
                    </Badge>
                  </div>
                </div>
              </div>

              {!isOwnCandidacy && (
                <div className="flex gap-2">
                  <FriendButton 
                    userId={candidate.userId}
                    username={candidate.username}
                    variant="outline"
                  />
                  <Button
                    onClick={handleSupportToggle}
                    disabled={supportMutation.isPending}
                    variant={supportStatus?.isSupporting ? "outline" : "default"}
                    className="flex items-center gap-2"
                    data-testid="button-support-toggle"
                  >
                    {supportStatus?.isSupporting ? (
                      <>
                        <HeartOff className="h-4 w-4" />
                        Unsupport
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        Support
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Platform */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Campaign Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                  {candidate.platform || "No platform statement provided."}
                </p>
              </CardContent>
            </Card>

            {/* Policy Proposals */}
            {candidate.proposals && candidate.proposals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Policy Proposals</CardTitle>
                  <CardDescription>
                    {candidate.proposals.length} proposal{candidate.proposals.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.proposals.map((proposal, index) => (
                    <div key={proposal.id} className="border-l-4 border-primary pl-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {index + 1}. {proposal.title}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {proposal.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>@{candidate.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.position} Candidate</span>
                </div>
              </CardContent>
            </Card>

            {/* Supporters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Supporters ({supporters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supporters.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No supporters yet.</p>
                ) : (
                  <div className="space-y-2">
                    {supporters.slice(0, 10).map((supporter) => (
                      <div key={supporter.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {supporter.firstName?.charAt(0) || supporter.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {`${supporter.firstName || ''} ${supporter.lastName || ''}`.trim() || supporter.username}
                        </span>
                      </div>
                    ))}
                    {supporters.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {supporters.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Support</span>
                  <span className="font-medium">{candidate.endorsements}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Campaign Started</span>
                  <span className="font-medium">{format(new Date(candidate.createdAt), "MMM dd, yyyy")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Proposals</span>
                  <span className="font-medium">{candidate.proposals?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}