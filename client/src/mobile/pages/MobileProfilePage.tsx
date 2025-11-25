import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Edit3, Grid, Heart, Bookmark, Crown } from "lucide-react";
import { Link } from "wouter";
import type { SignalWithAuthor } from "@shared/schema";

export function MobileProfilePage() {
  useScrollLight();
  const { user } = useAuth();

  const { data: signals = [] } = useQuery<SignalWithAuthor[]>({
    queryKey: ['/api/mobile/signals/user', user?.id],
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const isPremium = user?.subscriptionStatus === 'premium';

  return (
    <div className="mobile-root" data-testid="mobile-profile-page">
      <MobileTopBar title="PROFILE" />

      <div className="px-4 pb-8">
        <div className="glass-card p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-gray-900">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-xl truncate">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username}
                </h2>
                {isPremium && (
                  <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded">
                    ACP+
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm">@{user?.username}</p>
              
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-white font-bold">{signals.length}</p>
                  <p className="text-white/60 text-xs">Signals</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">0</p>
                  <p className="text-white/60 text-xs">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">0</p>
                  <p className="text-white/60 text-xs">Following</p>
                </div>
              </div>
            </div>
          </div>
          
          {user?.bio && (
            <p className="text-white/80 text-sm mt-4">
              {user.bio}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <Link href="/mobile/profile/edit" className="flex-1">
              <button className="glass-button w-full text-sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            </Link>
            <Link href="/mobile/settings">
              <button className="glass-button px-4">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white border-b-2 border-red-500">
            <Grid className="w-5 h-5" />
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white/50">
            <Heart className="w-5 h-5" />
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white/50">
            <Bookmark className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {signals.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-white/60">
              <p>No signals yet</p>
              <Link href="/mobile/create">
                <button className="glass-button primary mt-4">
                  Create Your First Signal
                </button>
              </Link>
            </div>
          ) : (
            signals.map((signal) => (
              <Link key={signal.id} href={`/mobile/signals/${signal.id}`}>
                <div 
                  className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden"
                  data-testid={`profile-signal-${signal.id}`}
                >
                  {signal.thumbnailUrl ? (
                    <img 
                      src={signal.thumbnailUrl}
                      alt={signal.title || 'Signal'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-900 to-blue-900" />
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
