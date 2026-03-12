import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import {
  Globe, Newspaper, Users, BarChart3, Calendar, Heart,
  Ban, FileText, ScrollText, Building2, MessageCircleReply,
  Landmark, UserCheck, Circle, ChevronDown, ChevronUp, HandHeart
} from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/logo-tpb_1763998990798.png";
import { useState } from "react";
import { useFeedView, type FeedType } from "@/contexts/feed-view-context";

type FilterItem = {
  key: FeedType;
  label: string;
  icon: React.ElementType;
  color?: string;
};

const PRIMARY_FILTERS: FilterItem[] = [
  { key: 'all',       label: 'All Posts',  icon: Globe,             color: 'text-slate-600' },
  { key: 'news',      label: 'News',       icon: Newspaper,         color: 'text-blue-600' },
  { key: 'following', label: 'Following',  icon: Users,             color: 'text-indigo-600' },
];

const CONTENT_FILTERS: FilterItem[] = [
  { key: 'polls',       label: 'Polls',       icon: BarChart3,          color: 'text-violet-600' },
  { key: 'events',      label: 'Events',      icon: Calendar,           color: 'text-emerald-600' },
  { key: 'charities',   label: 'Charities',   icon: Heart,              color: 'text-pink-600' },
  { key: 'boycotts',    label: 'Boycotts',    icon: Ban,                color: 'text-red-600' },
  { key: 'initiatives', label: 'Initiatives', icon: FileText,           color: 'text-orange-600' },
  { key: 'petitions',   label: 'Petitions',   icon: ScrollText,         color: 'text-amber-600' },
  { key: 'unions',      label: 'Unions',      icon: Building2,          color: 'text-purple-600' },
  { key: 'debates',     label: 'Debates',     icon: MessageCircleReply, color: 'text-teal-600' },
  { key: 'volunteer',   label: 'Volunteer',   icon: HandHeart,          color: 'text-teal-600' },
];

const MY_PEOPLE_FILTERS: FilterItem[] = [
  { key: 'my-reps',       label: 'My Reps',       icon: Landmark,   color: 'text-green-700' },
  { key: 'my-candidates', label: 'My Candidates', icon: UserCheck,  color: 'text-blue-700' },
];

export function UserSidebar() {
  const { user } = useAuth();
  const { activeFeed, setActiveFeed, activeView, setActiveView, activeGroupId, setActiveGroupId } = useFeedView();
  const [showGroups, setShowGroups] = useState(true);

  const { data: userGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: friendData } = useQuery<{ friendCount: number }>({
    queryKey: ["/api/user/friends/count"],
    enabled: !!user?.id,
  });

  const { data: voteData } = useQuery<{ voteCount: number }>({
    queryKey: ["/api/user/vote-count"],
    enabled: !!user?.id,
  });

  const { data: onlineFriends = [] } = useQuery<any[]>({
    queryKey: ["/api/user/friends/online"],
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const handleFeedSelect = (key: FeedType) => {
    setActiveFeed(key);
    setActiveView("all");
    setActiveGroupId(null);
  };

  const handleGroupSelect = (groupId: string) => {
    setActiveGroupId(groupId);
    setActiveFeed('group');
    setActiveView("all");
  };

  const isActiveFeed = (key: FeedType) =>
    activeView === "all" && activeFeed === key && activeFeed !== 'group';

  const FilterButton = ({ item }: { item: FilterItem }) => {
    const Icon = item.icon;
    const active = isActiveFeed(item.key);
    return (
      <button
        onClick={() => handleFeedSelect(item.key)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : item.color}`} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3 sticky top-20">
      {/* Compact User Profile */}
      <Card className="floating-card bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary shrink-0">
                  {user?.role === "citizen" ? "Citizen" : user?.role}
                </Badge>
                <img src={logoPath} alt="ACP" className="h-3.5 w-3.5 opacity-75" />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setActiveView("votes")}
              className={`flex-1 text-center py-1.5 rounded-md text-xs transition-colors ${
                activeView === "votes" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <div className="font-bold text-sm text-foreground">{voteData?.voteCount ?? 0}</div>
              <div>Votes</div>
            </button>
            <Link href="/friends" className="flex-1 text-center py-1.5 rounded-md text-xs hover:bg-muted text-muted-foreground transition-colors">
              <div className="font-bold text-sm text-foreground">{friendData?.friendCount ?? 0}</div>
              <div>Friends</div>
            </Link>
            <button
              onClick={() => setActiveView("groups")}
              className={`flex-1 text-center py-1.5 rounded-md text-xs transition-colors ${
                activeView === "groups" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <div className="font-bold text-sm text-foreground">{userGroups.length}</div>
              <div>Groups</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Feed Filter Panel */}
      <Card className="floating-card bg-card border border-border">
        <CardContent className="p-3 space-y-1">
          {/* Primary feed types */}
          {PRIMARY_FILTERS.map(item => (
            <FilterButton key={item.key} item={item} />
          ))}

          <div className="border-t border-border my-2" />

          {/* Content types */}
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground px-3 pt-1 pb-0.5">
            Content
          </p>
          {CONTENT_FILTERS.map(item => (
            <FilterButton key={item.key} item={item} />
          ))}

          <div className="border-t border-border my-2" />

          {/* My People */}
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground px-3 pt-1 pb-0.5">
            My People
          </p>
          {MY_PEOPLE_FILTERS.map(item => (
            <FilterButton key={item.key} item={item} />
          ))}

          {/* Groups under My People */}
          {user && (
            <>
              <button
                onClick={() => setShowGroups(v => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-all duration-150 text-left"
              >
                <Users className="h-4 w-4 shrink-0 text-cyan-600" />
                <span className="flex-1 truncate">Groups</span>
                {showGroups ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showGroups && userGroups.length > 0 && (
                <div className="pl-3 space-y-0.5">
                  {userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleGroupSelect(group.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 text-left ${
                        activeFeed === 'group' && activeGroupId === group.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center shrink-0">
                        <Users className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="truncate">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {showGroups && userGroups.length === 0 && (
                <p className="text-xs text-muted-foreground px-6 py-1">No groups yet</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Friends Online (compact) */}
      {onlineFriends.length > 0 && (
        <Card className="floating-card bg-card border border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Circle className="h-2.5 w-2.5 text-green-500 fill-green-500" />
              <span className="text-xs font-semibold text-foreground">Online Now</span>
            </div>
            <div className="space-y-1.5">
              {onlineFriends.slice(0, 4).map((friend: any) => (
                <Link key={friend.id} href={`/profile/${friend.id}`}>
                  <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                    <div className="relative shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={friend.avatar || ""} />
                        <AvatarFallback className="text-[10px]">
                          {friend.firstName?.[0]}{friend.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-card" />
                    </div>
                    <span className="text-xs text-foreground truncate">
                      {friend.firstName} {friend.lastName}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
