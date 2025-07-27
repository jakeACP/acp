import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { Leaf, GraduationCap, Scale, Users } from "lucide-react";

export function UserSidebar() {
  const { user } = useAuth();
  
  const { data: userGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id,
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

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-lg font-semibold text-slate-900">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
            </h3>
            
            <Badge variant="outline" className="text-primary border-primary">
              {user?.role === "citizen" ? "Active Citizen" : user?.role}
            </Badge>
            
            {user?.location && (
              <p className="text-xs text-slate-500 mt-1">{user.location}</p>
            )}
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">127</p>
              <p className="text-xs text-slate-500">Votes Cast</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{userGroups.length}</p>
              <p className="text-xs text-slate-500">Groups</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Groups */}
      <Card>
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
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500">
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
              <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-3">
                You haven't joined any groups yet
              </p>
              <Button size="sm" className="w-full">
                Explore Groups
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
