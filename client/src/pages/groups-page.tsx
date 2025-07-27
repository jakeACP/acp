import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { Users, Plus } from "lucide-react";

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "climate": return "bg-green-100 text-green-800";
      case "education": return "bg-blue-100 text-blue-800";
      case "corruption": return "bg-red-100 text-red-800";
      case "healthcare": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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
          
          <Button className="flex items-center gap-2">
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
                    <Users className="h-4 w-4 mr-2" />
                    {group.memberCount} members
                  </div>
                  
                  <Button size="sm">Join Group</Button>
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
            <Button>Create First Group</Button>
          </div>
        )}
      </div>
    </div>
  );
}
