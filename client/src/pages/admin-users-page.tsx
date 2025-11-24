import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Globe } from "lucide-react";

export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: [`/api/admin/users?limit=${limit}&offset=${page * limit}`],
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600 text-white';
      case 'moderator':
        return 'bg-blue-600 text-white';
      case 'candidate':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">
            View all registered users with IP tracking information
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="space-y-4">
              {users.map((user: any) => (
                <Card key={user.id} data-testid={`card-user-${user.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          {user.firstName || ''} {user.lastName || ''} (@{user.username})
                        </CardTitle>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                          {user.subscriptionStatus && user.subscriptionStatus !== 'free' && (
                            <Badge className="bg-green-600 text-white">
                              ACP+ {user.subscriptionStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Email:</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">User ID:</p>
                        <p className="text-sm font-mono text-muted-foreground">{user.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Registered:</p>
                        <p className="text-sm text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Seen:</p>
                        <p className="text-sm text-muted-foreground">
                          {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      
                      <div className="md:col-span-2 border-t pt-4 mt-2">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          IP Address Tracking
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Registration IP</p>
                            <p className="text-sm font-mono">
                              {user.registrationIp || 'N/A'}
                            </p>
                            {user.registrationCountry && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Country: {user.registrationCountry}
                              </p>
                            )}
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Last Login IP</p>
                            <p className="text-sm font-mono">
                              {user.lastLoginIp || 'N/A'}
                            </p>
                            {user.lastLoginCountry && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Country: {user.lastLoginCountry}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center px-3">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
