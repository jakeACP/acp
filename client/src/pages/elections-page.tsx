import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vote, MapPin, User, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface CandidateRunning {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  claimRequestStatus: string | null;
  isVerified: boolean | null;
  officeSought: string | null;
  targetPositionLevel: string | null;
  targetPositionJurisdiction: string | null;
}

export default function ElectionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState("");

  const { data: candidates = [], isLoading: candidatesLoading, isError: candidatesError } = useQuery<CandidateRunning[]>({
    queryKey: ["/api/public/candidates-running"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = zipCode.trim();
    
    if (!zip) {
      toast({ title: "Please enter a ZIP code", variant: "destructive" });
      return;
    }
    
    if (!/^\d{5}$/.test(zip)) {
      toast({ title: "Please enter a valid 5-digit ZIP code", variant: "destructive" });
      return;
    }
    
    navigate(`/elections/positions?address=${encodeURIComponent(zip)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Vote className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-2">Find Your Elections</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Enter your ZIP code to see the elected offices representing you and the candidates running for each seat.
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative w-full">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter your ZIP code"
                maxLength={5}
                className="w-full pl-9 pr-4 h-12 text-base rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12">
              Find My Elections
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6">
            Your ZIP code is used only to look up your elected representatives and is not stored.
          </p>
        </div>

        {/* Candidates Running Directory */}
        <div className="w-full max-w-4xl mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Candidates Running</h2>
            <p className="text-muted-foreground">
              Community members who have declared their candidacy for public office.
            </p>
          </div>

          {candidatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : candidatesError ? (
            <div className="text-center py-16 text-muted-foreground">
              <Vote className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Could not load candidates</p>
              <p className="text-sm mt-1">Please try refreshing the page.</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Vote className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No candidates declared yet</p>
              <p className="text-sm mt-1">Be the first to run for office in your community.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <Link key={candidate.id} href={`/politicians/${candidate.id}`}>
                  <div className="rounded-lg border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-3">
                      {candidate.photoUrl ? (
                        <img
                          src={candidate.photoUrl}
                          alt={candidate.fullName}
                          className="h-12 w-12 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                          {candidate.fullName}
                        </p>
                        {candidate.claimRequestStatus === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                            <CheckCircle className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" /> Pending Review
                          </span>
                        )}
                      </div>
                    </div>

                    {candidate.officeSought && (
                      <p className="text-sm text-foreground/80 mb-2 leading-snug">
                        Running for:{" "}
                        <span className="font-medium">{candidate.officeSought}</span>
                        {candidate.targetPositionJurisdiction && (
                          <span className="text-muted-foreground"> · {candidate.targetPositionJurisdiction}</span>
                        )}
                      </p>
                    )}

                    {candidate.party && (
                      <Badge variant="secondary" className="text-xs">
                        {candidate.party}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
