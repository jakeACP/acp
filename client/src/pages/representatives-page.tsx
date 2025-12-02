import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Phone, Mail, Globe, Heart, Building2, Zap, Flag } from "lucide-react";
import { RepresentativesLoading } from "@/components/representatives-loading.tsx";

export default function RepresentativesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // ChatGPT zip code search state
  const [zipCode, setZipCode] = useState("");
  const [showZipLoading, setShowZipLoading] = useState(false);
  const [zipRepresentatives, setZipRepresentatives] = useState<any[]>([]);
  const [searchedZip, setSearchedZip] = useState("");
  
  // Flag dialog state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [selectedRepForFlag, setSelectedRepForFlag] = useState<any>(null);

  // ChatGPT zip code search functions
  const searchByZipCode = () => {
    if (!zipCode.trim()) {
      toast({
        title: "Zip Code Required",
        description: "Please enter a zip code to find representatives",
        variant: "destructive",
      });
      return;
    }

    // Validate zip code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode.trim())) {
      toast({
        title: "Invalid Zip Code",
        description: "Please enter a valid zip code (e.g., 12345 or 12345-6789)",
        variant: "destructive",
      });
      return;
    }

    setShowZipLoading(true);
    setZipRepresentatives([]);
    setSearchedZip(zipCode.trim());
  };

  const handleZipLoadingComplete = (representatives: any[], fromCache: boolean) => {
    setZipRepresentatives(representatives);
    setShowZipLoading(false);
    
    toast({
      title: fromCache ? "Representatives Loaded" : "New Representatives Found",
      description: fromCache 
        ? `Found ${representatives.length} cached representatives for ${searchedZip}`
        : `Found ${representatives.length} representatives for ${searchedZip}`,
    });
  };

  const handleZipLoadingError = (error: string) => {
    setShowZipLoading(false);
    setZipRepresentatives([]);
    
    toast({
      title: "Search Failed",
      description: error,
      variant: "destructive",
    });
  };

  const followRepresentative = useMutation({
    mutationFn: async (repData: { name: string; office: string; party?: string }) => {
      const res = await apiRequest("/api/representatives/follow", "POST", repData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Representative Followed",
        description: "You'll receive updates about this representative",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow representative",
        variant: "destructive",
      });
    },
  });

  const flagRepresentative = useMutation({
    mutationFn: async (data: { repId: string; repName: string; reason: string }) => {
      return await apiRequest("/api/flags", "POST", {
        targetId: data.repId,
        targetType: "representative",
        reason: `inaccurate_info: ${data.repName} - ${data.reason}`,
      });
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for reporting inaccurate information. An admin will review it.",
      });
      setFlagDialogOpen(false);
      setFlagReason("");
      setSelectedRepForFlag(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const handleOpenFlagDialog = (rep: any) => {
    setSelectedRepForFlag(rep);
    setFlagDialogOpen(true);
  };

  const handleSubmitFlag = () => {
    if (!flagReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please describe what information is inaccurate",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedRepForFlag) {
      flagRepresentative.mutate({
        repId: selectedRepForFlag.id || `${selectedRepForFlag.name}-${selectedRepForFlag.office}`,
        repName: selectedRepForFlag.name,
        reason: flagReason,
      });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Your Representatives</h1>
              <p className="text-slate-600 mt-2">
                Find your elected officials by searching your zip code using our AI-powered search
              </p>
            </div>
          </div>
        </div>

        {/* ChatGPT Zip Code Search */}
        <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Find Your Representatives
            </CardTitle>
            <CardDescription>
              Get comprehensive representative data powered by AI. Results are cached for instant future lookups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="zipcode" className="sr-only">Zip Code</Label>
                <Input
                  id="zipcode"
                  placeholder="Enter zip code (e.g., 12345)"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByZipCode()}
                  disabled={showZipLoading}
                />
              </div>
              <Button 
                onClick={searchByZipCode}
                disabled={showZipLoading}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {showZipLoading ? "Loading..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading Screen */}
        {showZipLoading && (
          <RepresentativesLoading
            zipCode={searchedZip}
            onComplete={handleZipLoadingComplete}
            onError={handleZipLoadingError}
          />
        )}

        {/* Results */}
        {zipRepresentatives.length > 0 && !showZipLoading && (
          <div className="space-y-6 mb-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                Representatives for: {searchedZip}
              </h2>
              <p className="text-slate-600">
                Found {zipRepresentatives.length} representatives
              </p>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-2">
                Cached for future instant access
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {zipRepresentatives.map((rep, index) => (
                <Card key={index} className="border-green-200 bg-green-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">{rep.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{rep.office}</p>
                        
                        {rep.party && (
                          <Badge variant="outline" className="mb-3">
                            {rep.party}
                          </Badge>
                        )}
                        
                        <div className="space-y-2 text-sm">
                          {rep.level && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              <span className="capitalize">{rep.level} Level</span>
                            </div>
                          )}
                          
                          {rep.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-500" />
                              <span>{rep.phone}</span>
                            </div>
                          )}
                          
                          {rep.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-500" />
                              <span>{rep.email}</span>
                            </div>
                          )}
                          
                          {rep.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-slate-500" />
                              <a 
                                href={rep.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Official Website
                              </a>
                            </div>
                          )}
                          
                          {rep.district && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-500" />
                              <span>{rep.district}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => followRepresentative.mutate({
                          name: rep.name,
                          office: rep.office,
                          party: rep.party
                        })}
                        disabled={followRepresentative.isPending}
                        data-testid={`button-follow-${index}`}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Follow
                      </Button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleOpenFlagDialog(rep)}
                        data-testid={`button-flag-${index}`}
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Report Inaccurate Information
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Flag Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Inaccurate Information</DialogTitle>
              <DialogDescription>
                {selectedRepForFlag && (
                  <>Help us keep representative data accurate. Describe what information about <strong>{selectedRepForFlag.name}</strong> is incorrect.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="flag-reason">What is inaccurate?</Label>
              <Textarea
                id="flag-reason"
                placeholder="e.g., The phone number is outdated, the party affiliation is wrong, this person no longer holds this office..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="mt-2"
                rows={4}
                data-testid="textarea-flag-reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setFlagDialogOpen(false);
                  setFlagReason("");
                  setSelectedRepForFlag(null);
                }}
                data-testid="button-cancel-flag"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFlag}
                disabled={flagRepresentative.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-submit-flag"
              >
                <Flag className="h-4 w-4 mr-1" />
                {flagRepresentative.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {zipRepresentatives.length === 0 && !showZipLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <CardTitle className="mb-2">Find Your Representatives</CardTitle>
              <CardDescription className="mb-4">
                Enter your zip code above to discover your elected officials at federal, state, and local levels
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}