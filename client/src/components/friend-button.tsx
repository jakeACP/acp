import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Check, 
  X, 
  MoreHorizontal,
  Loader2
} from "lucide-react";

interface FriendshipStatus {
  status: string;
  friendshipId?: string;
  isRequester?: boolean;
}

interface FriendButtonProps {
  userId: string;
  username?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  showLabel?: boolean;
  className?: string;
}

export function FriendButton({ 
  userId, 
  username,
  size = "default", 
  variant = "default",
  showLabel = true,
  className = ""
}: FriendButtonProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: friendshipStatus, isLoading: statusLoading } = useQuery<FriendshipStatus>({
    queryKey: ["/api/friendships/status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/friendships/status/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get friendship status");
      return res.json();
    },
    enabled: !!currentUser && !!userId && userId !== currentUser.id,
    staleTime: 30000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/friendships/request", "POST", { addresseeId: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friendships/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      toast({
        title: "Friend request sent",
        description: username ? `Friend request sent to ${username}` : "Friend request sent!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/accept`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friendships/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request accepted",
        description: username ? `You are now friends with ${username}!` : "You are now friends!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/reject`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friendships/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request declined",
        description: "The friend request has been declined.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline friend request",
        variant: "destructive",
      });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/cancel`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friendships/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      toast({
        title: "Friend request cancelled",
        description: "Your friend request has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel friend request",
        variant: "destructive",
      });
    },
  });

  const unfriendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/friends/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friendships/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      setIsOpen(false);
      toast({
        title: "Friend removed",
        description: username ? `${username} has been removed from your friends.` : "Friend removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend",
        variant: "destructive",
      });
    },
  });

  if (!currentUser || userId === currentUser.id) {
    return null;
  }

  const isLoading = statusLoading || 
    sendRequestMutation.isPending || 
    acceptRequestMutation.isPending || 
    declineRequestMutation.isPending || 
    cancelRequestMutation.isPending || 
    unfriendMutation.isPending;

  const status = friendshipStatus?.status || 'none';
  const friendshipId = friendshipStatus?.friendshipId;
  const isRequester = friendshipStatus?.isRequester;

  if (status === 'accepted') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={size} 
            className={`${className}`}
            data-testid={`button-friends-${userId}`}
          >
            <UserCheck className="h-4 w-4 text-green-600" />
            {showLabel && <span className="ml-2">Friends</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => unfriendMutation.mutate()}
            className="text-destructive focus:text-destructive"
            data-testid={`button-unfriend-${userId}`}
          >
            <UserX className="h-4 w-4 mr-2" />
            Unfriend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === 'pending' && isRequester) {
    return (
      <Button 
        variant="secondary" 
        size={size}
        className={className}
        onClick={() => friendshipId && cancelRequestMutation.mutate(friendshipId)}
        disabled={isLoading}
        data-testid={`button-cancel-request-${userId}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        {showLabel && <span className="ml-2">Request Sent</span>}
      </Button>
    );
  }

  if (status === 'pending' && !isRequester) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Button 
          variant="default" 
          size={size}
          onClick={() => friendshipId && acceptRequestMutation.mutate(friendshipId)}
          disabled={isLoading}
          data-testid={`button-accept-request-${userId}`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-2">Accept</span>}
        </Button>
        <Button 
          variant="outline" 
          size={size}
          onClick={() => friendshipId && declineRequestMutation.mutate(friendshipId)}
          disabled={isLoading}
          data-testid={`button-decline-request-${userId}`}
        >
          <X className="h-4 w-4" />
          {showLabel && <span className="ml-2">Decline</span>}
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant={variant}
      size={size}
      className={className}
      onClick={() => sendRequestMutation.mutate()}
      disabled={isLoading}
      data-testid={`button-add-friend-${userId}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">Add Friend</span>}
    </Button>
  );
}
