import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserMinus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface FriendshipStatus {
  status: string;
}

interface FollowButtonProps {
  userId: string;
  username?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function FollowButton({
  userId,
  username,
  size = "default",
  variant = "outline",
  className = "",
}: FollowButtonProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const enabled = !!currentUser && !!userId && userId !== currentUser.id;

  const { data: friendshipStatus } = useQuery<FriendshipStatus>({
    queryKey: ["/api/friendships/status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/friendships/status/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get friendship status");
      return res.json();
    },
    enabled,
    staleTime: 30000,
  });

  const { data: followStatus, isLoading: statusLoading } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/follow/status", userId],
    queryFn: async () => {
      const res = await fetch(`/api/follow/status/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get follow status");
      return res.json();
    },
    enabled,
    staleTime: 30000,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/follow", "POST", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "following"] });
      }
      toast({
        title: "Following",
        description: username ? `You are now following ${username}.` : "You are now following this user.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/follow/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "following"] });
      }
      toast({
        title: "Unfollowed",
        description: username ? `You unfollowed ${username}.` : "Unfollowed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow user",
        variant: "destructive",
      });
    },
  });

  if (!currentUser || userId === currentUser.id) {
    return null;
  }

  const isFriend = friendshipStatus?.status === "accepted";

  if (isFriend) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        data-testid={`button-following-friend-${userId}`}
      >
        <UserCheck className="h-4 w-4" />
        <span className="ml-2">Following</span>
      </Button>
    );
  }

  const isLoading = statusLoading || followMutation.isPending || unfollowMutation.isPending;
  const isFollowing = followStatus?.isFollowing ?? false;

  if (isFollowing) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => unfollowMutation.mutate()}
        disabled={isLoading}
        data-testid={`button-unfollow-${userId}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserMinus className="h-4 w-4" />
        )}
        <span className="ml-2">Unfollow</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => followMutation.mutate()}
      disabled={isLoading}
      data-testid={`button-follow-${userId}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      <span className="ml-2">Follow</span>
    </Button>
  );
}
