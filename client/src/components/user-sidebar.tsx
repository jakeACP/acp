import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Group, User } from "@shared/schema";
import { Leaf, GraduationCap, Scale, Users, Coins, Wallet, Copy, Check, Share2, Circle } from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/logo-tpb_1763998990798.png";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function UserSidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const { data: userGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: voteData } = useQuery<{ voteCount: number }>({
    queryKey: ["/api/user/vote-count"],
    enabled: !!user?.id,
  });

  const { data: balanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/user/balance"],
    enabled: !!user?.id,
  });

  const { data: onlineFriends = [] } = useQuery<User[]>({
    queryKey: ["/api/user/friends/online"],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getGroupIcon = (category: string | null) => {
    switch (category) {
      case "climate": return <Leaf className="h-4 w-4 text-white" />;
      case "education": return <GraduationCap className="h-4 w-4 text-white" />;
      case "corruption": return <Scale className="h-4 w-4 text-white" />;
      default: return <Users className="h-4 w-4 text-white" />;
    }
  };

  const getGroupColor = (category: string | null) => {
    switch (category) {
      case "climate": return "bg-green-500";
      case "education": return "bg-blue-500";
      case "corruption": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  const personalInviteUrl = user ? `${window.location.origin}/auth?invite=${user.id}` : '';

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(personalInviteUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Your personal invitation link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card className="floating-card bg-card border border-border dark:border-border">
        <CardContent className="p-6">
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-lg font-semibold text-foreground">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
            </h3>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className="text-primary border-primary">
                {user?.role === "citizen" ? "Active Citizen" : user?.role}
              </Badge>
              <img src={logoPath} alt="ACP" className="h-5 w-5 opacity-75" title="Anti-Corruption Party Member" />
            </div>
            
            {user?.location && (
              <p className="text-xs text-muted-foreground mt-1">{user.location}</p>
            )}
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{voteData?.voteCount || 0}</p>
              <p className="text-xs text-muted-foreground">Votes Cast</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{userGroups.length}</p>
              <p className="text-xs text-muted-foreground">Groups</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Groups */}
      <Card className="floating-card bg-card border border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-base">My Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {userGroups.length > 0 ? (
            <div className="space-y-3">
              {userGroups.slice(0, 3).map((group) => (
                <div key={group.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getGroupColor(group.category)}`}>
                    {getGroupIcon(group.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount} members
                    </p>
                  </div>
                </div>
              ))}
              
              {userGroups.length > 3 && (
                <Button variant="ghost" className="w-full text-primary text-sm p-0">
                  View All Groups
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                You haven't joined any groups yet
              </p>
              <Button size="sm" className="w-full">
                Explore Groups
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friends Online */}
      <Card className="floating-card bg-card border border-border dark:border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Circle className="h-3 w-3 text-green-500 fill-green-500" />
            Friends Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineFriends.length > 0 ? (
            <div className="space-y-3">
              {onlineFriends.slice(0, 5).map((friend) => (
                <Link key={friend.id} href={`/profile/${friend.id}`}>
                  <div 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    data-testid={`friend-online-${friend.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar || ""} />
                        <AvatarFallback className="text-sm">
                          {friend.firstName?.[0]}{friend.lastName?.[0] || friend.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {friend.firstName ? `${friend.firstName} ${friend.lastName}` : friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground">Online now</p>
                    </div>
                  </div>
                </Link>
              ))}
              
              {onlineFriends.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{onlineFriends.length - 5} more online
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Circle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No friends online right now
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACP Credits Balance */}
      <Card className="floating-card-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ACP Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-foreground">
                {balanceData?.balance ? parseFloat(balanceData.balance).toFixed(2) : '0.00'}
              </span>
              <span className="text-sm text-muted-foreground font-medium">ACP</span>
            </div>
            
            <Link href="/crypto">
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Open Wallet
              </Button>
            </Link>
            
            <p className="text-xs text-muted-foreground mt-2">
              Earn credits through participation and subscriptions
            </p>
          </div>
          
          {/* Personal Invitation Section */}
          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-medium text-foreground">Invite Friends</h4>
            </div>
            
            <div className="bg-white dark:bg-card rounded-lg p-3 border border-blue-200 dark:border-blue-800 mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={personalInviteUrl}
                  readOnly
                  className="flex-1 text-xs text-muted-foreground bg-transparent border-none outline-none"
                  data-testid="input-personal-invite-url"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyInviteLink}
                  className="px-2 py-1 h-auto border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  data-testid="button-copy-invite-link"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleCopyInviteLink}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-sm"
              data-testid="button-copy-share-link"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Copy Share Link
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-2 font-medium">
              💰 Get 20 ACP Credits for each person who joins!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
