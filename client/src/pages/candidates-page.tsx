import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Candidate, User } from "@shared/schema";
import { Users, UserPlus } from "lucide-react";

type CandidateWithUser = Candidate & {
  user: User;
};

export default function CandidatesPage() {
  const { data: candidates = [], isLoading } = useQuery<CandidateWithUser[]>({
    queryKey: ["/api/candidates"],
  });

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading candidates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Candidates</h1>
            <p className="text-slate-600 mt-2">
              Discover candidates who align with your values
            </p>
          </div>
          
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Declare Candidacy
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={candidate.user?.avatar || ""} />
                    <AvatarFallback>
                      {candidate.user?.firstName?.[0]}{candidate.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {candidate.user?.firstName} {candidate.user?.lastName}
                    </CardTitle>
                    <CardDescription className="text-base font-medium text-primary">
                      Running for {candidate.position}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">
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
                  <p className="text-slate-700 mb-4 line-clamp-3">
                    {candidate.platform}
                  </p>
                )}
                
                {candidate.proposals && candidate.proposals.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Key Proposals:</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
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
                  <Button className="flex-1">Support</Button>
                  <Button variant="outline">View Profile</Button>
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
              <Button>Declare Candidacy</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
