import { useState } from "react";
import { useLocation, Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vote, MapPin, User, CheckCircle, Clock, Loader2, Search, X } from "lucide-react";
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

interface AddressMatch {
  matchedAddress: string;
  latitude: number;
  longitude: number;
  zipCode: string;
  stateCode: string;
  city: string | null;
}

export default function ElectionsPage() {
  usePageMeta({
    title: "Elections",
    description: "Track candidates, find your representatives, and explore election races on the ACP Democracy platform.",
  });

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [addressMatches, setAddressMatches] = useState<AddressMatch[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressMatch | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: candidates = [], isLoading: candidatesLoading, isError: candidatesError } = useQuery<CandidateRunning[]>({
    queryKey: ["/api/public/candidates-running"],
  });

  const validateAddress = async () => {
    const enteredAddress = address.trim();
    if (enteredAddress.length < 8) {
      toast({ title: "Enter a complete street address", description: "Include the street, city, and state.", variant: "destructive" });
      return;
    }
    setIsValidating(true);
    setSelectedAddress(null);
    setAddressMatches([]);
    try {
      const response = await fetch(`/api/elections/validate-address?address=${encodeURIComponent(enteredAddress)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not verify address");
      if (!data.matches?.length) {
        toast({
          title: "We couldn't verify that address",
          description: "Check the street number, street name, city, state, and ZIP code, then try again.",
          variant: "destructive",
        });
        return;
      }
      setAddressMatches(data.matches);
    } catch (error: any) {
      toast({ title: "Address verification failed", description: error.message, variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) {
      toast({ title: "Verify and select your address first", variant: "destructive" });
      return;
    }

    const query = new URLSearchParams({
      address: selectedAddress.stateCode === "MN" ? selectedAddress.matchedAddress : selectedAddress.zipCode,
      displayAddress: selectedAddress.matchedAddress,
      state: selectedAddress.stateCode,
      zip: selectedAddress.zipCode,
    });
    if (selectedAddress.stateCode === "MN") {
      query.set("lat", String(selectedAddress.latitude));
      query.set("lng", String(selectedAddress.longitude));
    }
    navigate(`/elections/positions?${query.toString()}`);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Find Your Elections — Anti-Corruption Party",
    "description": "Verify your address to see elected offices and candidates running near you.",
    "url": typeof window !== "undefined" ? `${window.location.origin}/elections` : "/elections",
    "publisher": { "@type": "Organization", "name": "Anti-Corruption Party" },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            Verify your home address to see the elected offices representing you and the candidates running for each seat.
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative w-full">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSelectedAddress(null);
                  setAddressMatches([]);
                }}
                placeholder="Enter Address"
                autoComplete="street-address"
                aria-label="Enter your full address"
                className="w-full pl-9 pr-4 h-12 text-base rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
              />
            </div>

            {!selectedAddress && (
              <Button type="button" variant="outline" size="lg" className="w-full h-12" onClick={validateAddress} disabled={isValidating || address.trim().length < 8}>
                {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {isValidating ? "Checking Address…" : "Verify Address"}
              </Button>
            )}

            {addressMatches.length > 0 && !selectedAddress && (
              <div className="rounded-md border bg-card p-2 text-left" role="listbox" aria-label="Verified address matches">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Select the correct verified address</p>
                {addressMatches.map((match) => (
                  <button
                    type="button"
                    key={`${match.matchedAddress}-${match.latitude}`}
                    onClick={() => {
                      setSelectedAddress(match);
                      setAddress(match.matchedAddress);
                      setAddressMatches([]);
                    }}
                    className="flex w-full items-start gap-2 rounded px-2 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{match.matchedAddress}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedAddress && (
              <div className="flex items-start justify-between gap-3 rounded-md border border-green-300 bg-green-50 p-3 text-left dark:border-green-800 dark:bg-green-950/30">
                <div className="flex min-w-0 gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-200">Verified address</p>
                    <p className="text-sm text-green-800 dark:text-green-300">{selectedAddress.matchedAddress}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedAddress(null)} aria-label="Change address">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full h-12" disabled={!selectedAddress}>
              Find My Elections
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6">
            Your verified address is used only for this election lookup and is not stored.
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
