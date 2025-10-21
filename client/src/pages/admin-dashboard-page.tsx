import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, BarChart3, Users2, Calendar, Heart } from "lucide-react";
import { AdminNavigation } from "@/components/admin-navigation";

export default function AdminDashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/admin/analytics'],
  });

  const stats = [
    {
      title: "Total Users",
      value: analytics?.userCount || 0,
      icon: Users,
      description: "Registered members",
    },
    {
      title: "Total Posts",
      value: analytics?.postCount || 0,
      icon: FileText,
      description: "Community posts",
    },
    {
      title: "Active Polls",
      value: analytics?.pollCount || 0,
      icon: BarChart3,
      description: "Voting polls",
    },
    {
      title: "Groups",
      value: analytics?.groupCount || 0,
      icon: Users2,
      description: "Community groups",
    },
    {
      title: "Events",
      value: analytics?.eventCount || 0,
      icon: Calendar,
      description: "Scheduled events",
    },
    {
      title: "Charities",
      value: analytics?.charityCount || 0,
      icon: Heart,
      description: "Active charities",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Platform analytics and insights</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(/\s/g, '-')}-count`}>
                      {stat.value.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
