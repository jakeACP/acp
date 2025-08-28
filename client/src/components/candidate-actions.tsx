import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface CandidateActionsProps {
  candidate: CandidateWithUser;
  currentUserId?: string;
  onSupportToggle: (candidateId: string, action: 'support' | 'unsupport') => void;
  isUpdating: boolean;
}

export function CandidateActions({ 
  candidate, 
  currentUserId, 
  onSupportToggle, 
  isUpdating 
}: CandidateActionsProps) {
  const { toast } = useToast();

  // Check support status for this candidate
  const { data: supportStatus } = useQuery<{ isSupporting: boolean }>({
    queryKey: ["/api/candidates", candidate.id, "support-status"],
    enabled: !!currentUserId,
  });

  const handleSupportToggle = () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to support candidates",
        variant: "destructive",
      });
      return;
    }

    // Check if user is trying to support their own candidacy
    if (candidate.userId === currentUserId) {
      toast({
        title: "Cannot Support Own Candidacy",
        description: "You cannot support your own candidacy",
        variant: "destructive",
      });
      return;
    }

    const action = supportStatus?.isSupporting ? 'unsupport' : 'support';
    onSupportToggle(candidate.id, action);
  };

  // Don't show support button for user's own candidacy
  if (candidate.userId === currentUserId) {
    return (
      <Button 
        variant="outline" 
        disabled 
        className="flex-1"
        data-testid={`button-own-candidate-${candidate.id}`}
      >
        Your Candidacy
      </Button>
    );
  }

  return (
    <Button 
      className="flex-1"
      variant={supportStatus?.isSupporting ? "outline" : "default"}
      onClick={handleSupportToggle}
      disabled={isUpdating || !currentUserId}
      data-testid={`button-support-toggle-${candidate.id}`}
    >
      {supportStatus?.isSupporting ? (
        <>
          <HeartOff className="h-4 w-4 mr-2" />
          {isUpdating ? "Removing..." : "Unsupport"}
        </>
      ) : (
        <>
          <Heart className="h-4 w-4 mr-2" />
          {isUpdating ? "Supporting..." : "Support"}
        </>
      )}
    </Button>
  );
}