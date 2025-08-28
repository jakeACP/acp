import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Users, UserPlus, Eye } from "lucide-react";
import { DeclareCandidacyForm } from "@/components/declare-candidacy-form";
import { CandidateActions } from "@/components/candidate-actions";
import { PageLoading } from "@/components/page-loading";

interface CandidateWithUser {
  id: string;
  userId: string;
  position: string;
  platform?: string;
  proposals: { id: string; title: string; description: string }[];
  endorsements: number;
  isActive: boolean;
  createdAt: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export default function CandidatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeclareCandidacy, setShowDeclareCandidacy] = useState(false);

  const { data: candidates = [], isLoading } = useQuery<CandidateWithUser[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: userCandidate } = useQuery<CandidateWithUser>({
    queryKey: ["/api/candidates/user", user?.id],
    enabled: !!user?.id,
  });

  const supportMutation = useMutation({
    mutationFn: async ({ candidateId, action }: { candidateId: string; action: 'support' | 'unsupport' }) => {
      if (action === 'support') {
        return apiRequest(`/api/candidates/${candidateId}/support`, "POST");
      } else {
        return apiRequest(`/api/candidates/${candidateId}/support`, "DELETE");
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", variables.candidateId, "support-status"] });
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

  const getDisplayName = (candidate: CandidateWithUser) => {
    const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
    return fullName || candidate.username;
  };

  const getInitials = (candidate: CandidateWithUser) => {
    const firstName = candidate.firstName || candidate.username.charAt(0);
    const lastName = candidate.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (showDeclareCandidacy) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DeclareCandidacyForm onCancel={() => setShowDeclareCandidacy(false)} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoading title="Loading Candidates..." description="Fetching candidate profiles and support information" />;
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Candidates</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Discover candidates who align with your values
            </p>
          </div>
          
          {userCandidate ? (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Running for {userCandidate.position}
            </Badge>
          ) : (
            <Button 
              onClick={() => setShowDeclareCandidacy(true)}
              className="flex items-center gap-2"
              data-testid="button-declare-candidacy"
            >
              <UserPlus className="h-4 w-4" />
              Declare Candidacy
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {getInitials(candidate)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {getDisplayName(candidate)}
                    </CardTitle>
                    <CardDescription className="text-base font-medium text-primary">
                      Running for {candidate.position}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {candidate.endorsements} supporters
                      </span>
                    </div>
                  </div>
                  
                  <Badge variant="secondary">
                    {candidate.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {candidate.platform && (
                  <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-3">
                    {candidate.platform}
                  </p>
                )}
                
                {candidate.proposals && candidate.proposals.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Key Proposals:</h4>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {candidate.proposals.slice(0, 3).map((proposal) => (
                        <li key={proposal.id} className="flex items-start">
                          <span className="text-primary mr-2">•</span>
                          {proposal.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <CandidateActions 
                    candidate={candidate}
                    currentUserId={user?.id}
                    onSupportToggle={(candidateId, action) => 
                      supportMutation.mutate({ candidateId, action })
                    }
                    isUpdating={supportMutation.isPending}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/candidates/${candidate.id}`)}
                    data-testid={`button-view-profile-${candidate.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {candidates.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <CardTitle className="mb-2">No candidates yet</CardTitle>
              <CardDescription className="mb-4">
                Be the first to declare your candidacy for public office
              </CardDescription>
              <Button 
                onClick={() => setShowDeclareCandidacy(true)}
                data-testid="button-declare-candidacy-empty"
              >
                Declare Candidacy
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}