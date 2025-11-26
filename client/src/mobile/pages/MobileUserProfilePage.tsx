import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, UserCheck, MapPin, Calendar, Users } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

interface UserProfile extends Partial<User> {
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export function MobileUserProfilePage() {
  useScrollLight();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute("/mobile/profile/:userId");
  const userId = params?.userId;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: mutualData } = useQuery<{ mutualCount: number }>({
    queryKey: ['/api/friends/mutual', userId],
    enabled: !!userId && !!currentUser,
    staleTime: 60000,
  });
  const mutualCount = mutualData?.mutualCount || 0;

  const sendRequestMutation = useMutation({
    mutationFn: () => apiRequest('/api/friendships/request', 'POST', { addresseeId: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  });

  const getDisplayName = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    return profile?.username || 'User';
  };

  const getInitials = () => {
    if (profile?.firstName) return profile.firstName[0].toUpperCase();
    return profile?.username?.[0]?.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="mobile-root" data-testid="mobile-user-profile-loading">
        <MobileTopBar title="PROFILE" />
        <div className="px-4 pt-4">
          <div className="glass-card p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-white/10 rounded w-32" />
                <div className="h-4 bg-white/10 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mobile-root" data-testid="mobile-user-profile-not-found">
        <MobileTopBar title="PROFILE" />
        <div className="px-4 pt-4 text-center">
          <div className="glass-card p-6">
            <p className="text-white/70">User not found</p>
            <Link href="/mobile">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="mobile-root" data-testid="mobile-user-profile-page">
      <div className="sticky top-0 z-40 p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(59, 130, 246, 0.95) 100%)' }}>
        <Link href="/mobile/friends">
          <button className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors" data-testid="back-button">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </Link>
        <h1 className="text-white font-bold text-lg tracking-wider">PROFILE</h1>
      </div>

      <div className="px-4 pb-8">
        <div className="glass-card p-6 mb-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-white/20">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-600 text-white text-2xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-xl truncate">
                {getDisplayName()}
              </h2>
              <p className="text-white/60 text-sm">@{profile.username}</p>
              
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-white font-bold">{profile.postsCount || 0}</p>
                  <p className="text-white/60 text-xs">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">{profile.followersCount || 0}</p>
                  <p className="text-white/60 text-xs">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">{profile.followingCount || 0}</p>
                  <p className="text-white/60 text-xs">Following</p>
                </div>
              </div>
            </div>
          </div>
          
          {profile.bio && (
            <p className="text-white/80 text-sm mt-4">
              {profile.bio}
            </p>
          )}

          {profile.location && (
            <div className="flex items-center gap-2 mt-3 text-white/60 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {typeof mutualCount === 'number' && mutualCount > 0 && (
            <div className="flex items-center gap-2 mt-2 text-white/60 text-sm">
              <Users className="w-4 h-4" />
              <span>{mutualCount} mutual friend{mutualCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          {profile.createdAt && (
            <div className="flex items-center gap-2 mt-2 text-white/60 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          )}

          {currentUser && userId !== currentUser.id && (
            <Button
              onClick={() => sendRequestMutation.mutate()}
              disabled={sendRequestMutation.isPending}
              className="w-full mt-4 bg-gradient-to-r from-red-500 to-blue-600 text-white"
              data-testid="add-friend-button"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
