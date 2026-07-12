import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "@/components/navigation";
import { Users, Search, ArrowLeft, UserCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FriendButton } from "@/components/friend-button";

interface FriendEntry {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface ProfileUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export default function UserFriendsPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");

  const { data: profileUser, isLoading: profileLoading } = useQuery<ProfileUser>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: friends = [], isLoading: friendsLoading } = useQuery<FriendEntry[]>({
    queryKey: ["/api/users", userId, "friends"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/friends`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });

  const filtered = friends.filter((f) => {
    const q = search.toLowerCase();
    return (
      !q ||
      f.username?.toLowerCase().includes(q) ||
      f.firstName?.toLowerCase().includes(q) ||
      f.lastName?.toLowerCase().includes(q)
    );
  });

  const displayName = profileUser
    ? profileUser.firstName
      ? `${profileUser.firstName}${profileUser.lastName ? " " + profileUser.lastName : ""}`
      : profileUser.username
    : "User";

  const isOwnProfile = currentUser && currentUser.id === userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/profile/${userId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            {profileLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <h1 className="text-xl font-bold">
                {isOwnProfile ? "Your Friends" : `${displayName}'s Friends`}
              </h1>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {friendsLoading ? (
                <Skeleton className="h-4 w-20 inline-block" />
              ) : (
                `${friends.length} ${friends.length === 1 ? "friend" : "friends"}`
              )}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search friends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {friendsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                {search ? (
                  <p className="text-gray-500">No friends match "{search}"</p>
                ) : (
                  <p className="text-gray-500">
                    {isOwnProfile ? "You haven't added any friends yet." : `${displayName} hasn't added any friends yet.`}
                  </p>
                )}
                {isOwnProfile && !search && (
                  <Link href="/friends">
                    <Button variant="outline" className="mt-4">
                      Find Friends
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((friend) => {
                  const name = friend.firstName
                    ? `${friend.firstName}${friend.lastName ? " " + friend.lastName : ""}`
                    : friend.username;
                  return (
                    <div
                      key={friend.userId}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Link href={`/profile/${friend.userId}`}>
                        <Avatar className="h-12 w-12 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all">
                          <AvatarImage src={friend.avatar} alt={friend.username} />
                          <AvatarFallback className="text-sm font-medium">
                            {friend.firstName?.[0] || friend.username?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${friend.userId}`}>
                          <p className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer truncate">
                            {name}
                          </p>
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{friend.username}
                        </p>
                      </div>
                      {currentUser && currentUser.id !== friend.userId && (
                        <FriendButton userId={friend.userId} username={friend.username} size="sm" />
                      )}
                      {currentUser && currentUser.id === friend.userId && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          <UserCheck className="h-3 w-3 mr-1" />
                          You
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {isOwnProfile && (
          <div className="mt-4 text-center">
            <Link href="/friends">
              <Button variant="outline" size="sm">
                Manage Friends & Requests
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
