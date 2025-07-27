import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Group } from "@shared/schema";
import { Users, Plus, UserPlus, UserMinus } from "lucide-react";
import { CreateGroupForm } from "@/components/create-group-form";

export default function GroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: userGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id,
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
      toast({
        title: "Joined Group",
        description: "You've successfully joined the group!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/leave`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
      toast({
        title: "Left Group",
        description: "You've left the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  const isUserInGroup = (groupId: string) => {
    return userGroups.some(group => group.id === groupId);
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "climate": return "bg-green-100 text-green-800";
      case "education": return "bg-blue-100 text-blue-800";
      case "corruption": return "bg-red-100 text-red-800";
      case "healthcare": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (showCreateGroup) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CreateGroupForm onCancel={() => setShowCreateGroup(false)} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading groups...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Political Groups</h1>
            <p className="text-slate-600 mt-2">
              Connect with communities working on issues you care about
            </p>
          </div>
          
          <Button 
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {group.description}
                    </CardDescription>
                  </div>
                  {group.category && (
                    <Badge className={getCategoryColor(group.category)}>
                      {group.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-slate-600">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{group.memberCount || 0} members</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isUserInGroup(group.id) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => leaveGroupMutation.mutate(group.id)}
                        disabled={leaveGroupMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <UserMinus className="h-3 w-3 mr-1" />
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinGroupMutation.mutate(group.id)}
                        disabled={joinGroupMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No groups yet</h3>
            <p className="text-slate-600 mb-4">
              Be the first to create a political group in your community
            </p>
            <Button onClick={() => setShowCreateGroup(true)}>Create First Group</Button>
          </div>
        )}
      </div>
    </div>
  );
}
