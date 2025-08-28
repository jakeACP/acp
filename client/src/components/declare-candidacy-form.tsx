import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Plus, Trash2 } from "lucide-react";

interface DeclareCandidacyFormProps {
  onCancel: () => void;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
}

export function DeclareCandidacyForm({ onCancel }: DeclareCandidacyFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [position, setPosition] = useState("");
  const [platform, setPlatform] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [newProposal, setNewProposal] = useState({ title: "", description: "" });

  const createCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      const res = await apiRequest("/api/candidates", "POST", candidateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidacy Declared",
        description: "Your candidacy has been successfully declared!",
      });
      onCancel();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to declare candidacy",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!position.trim()) {
      toast({
        title: "Position Required",
        description: "Please specify the position you're running for",
        variant: "destructive",
      });
      return;
    }

    if (!platform.trim()) {
      toast({
        title: "Platform Required",
        description: "Please provide your campaign platform",
        variant: "destructive",
      });
      return;
    }

    const candidateData = {
      position: position.trim(),
      platform: platform.trim(),
      proposals: proposals.length > 0 ? proposals : [],
      isActive: true,
    };

    createCandidateMutation.mutate(candidateData);
  };

  const addProposal = () => {
    if (!newProposal.title.trim() || !newProposal.description.trim()) {
      toast({
        title: "Incomplete Proposal",
        description: "Please provide both title and description for the proposal",
        variant: "destructive",
      });
      return;
    }

    const proposal: Proposal = {
      id: crypto.randomUUID(),
      title: newProposal.title.trim(),
      description: newProposal.description.trim(),
    };

    setProposals([...proposals, proposal]);
    setNewProposal({ title: "", description: "" });
  };

  const removeProposal = (id: string) => {
    setProposals(proposals.filter(p => p.id !== id));
  };

  const positions = [
    "Mayor",
    "City Council Member",
    "County Commissioner",
    "School Board Member",
    "State Representative",
    "State Senator",
    "Governor",
    "U.S. Representative",
    "U.S. Senator",
    "Other"
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Declare Your Candidacy
        </CardTitle>
        <p className="text-sm text-gray-600">
          Join the democratic process by declaring your candidacy for public office
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Candidate Information</h4>
            <div className="text-sm text-blue-700">
              <p><strong>Name:</strong> {user?.firstName} {user?.lastName || user?.username}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {user?.role}</p>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position Running For *</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select the office you're running for..." />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label htmlFor="platform">Campaign Platform *</Label>
            <Textarea
              id="platform"
              placeholder="Describe your political platform, key values, and what you stand for..."
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              rows={5}
              maxLength={1500}
            />
            <p className="text-xs text-gray-500">
              {platform.length}/1500 characters
            </p>
          </div>

          {/* Proposals Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Policy Proposals</Label>
              <p className="text-sm text-gray-600">
                Add specific policy proposals or initiatives you plan to champion
              </p>
            </div>

            {/* Existing Proposals */}
            {proposals.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Your Proposals ({proposals.length})</h4>
                {proposals.map((proposal, index) => (
                  <Card key={proposal.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">
                            {index + 1}. {proposal.title}
                          </h5>
                          <p className="text-sm text-gray-600">{proposal.description}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProposal(proposal.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add New Proposal */}
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add New Proposal</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="proposalTitle">Proposal Title</Label>
                    <Input
                      id="proposalTitle"
                      placeholder="e.g., Expand Public Transportation"
                      value={newProposal.title}
                      onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="proposalDescription">Description</Label>
                    <Textarea
                      id="proposalDescription"
                      placeholder="Describe your proposal in detail..."
                      value={newProposal.description}
                      onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProposal}
                    className="w-full"
                    disabled={!newProposal.title.trim() || !newProposal.description.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Proposal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guidelines */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Candidacy Guidelines</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Be transparent about your qualifications and experience</li>
              <li>• Commit to democratic principles and peaceful transfer of power</li>
              <li>• Engage respectfully with all constituents and opposing viewpoints</li>
              <li>• Focus on policy solutions rather than personal attacks</li>
              <li>• Be available for community forums and debates</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCandidateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-declare-candidacy"
            >
              {createCandidateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Declaring...
                </>
              ) : (
                "Declare Candidacy"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}