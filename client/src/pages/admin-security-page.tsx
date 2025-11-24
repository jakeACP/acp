import { useState } from "react";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Shield, AlertTriangle, CheckCircle, Ban, UserX, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Security & Access Control</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Monitor security, manage bans, and control access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Shield className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="bans" data-testid="tab-bans">
              <UserX className="h-4 w-4 mr-2" />
              User Bans
            </TabsTrigger>
            <TabsTrigger value="ip-blocks" data-testid="tab-ip-blocks">
              <Ban className="h-4 w-4 mr-2" />
              IP Blocks
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              <Mail className="h-4 w-4 mr-2" />
              Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Active Bans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <Lock className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                IP Blocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">Secure</div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link href="/admin/user-bans">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="h-5 w-5" />
                      User Bans
                    </CardTitle>
                    <CardDescription>
                      Manage banned users and their restrictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" data-testid="button-manage-bans">
                      Manage Bans
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/ip-blocks">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ban className="h-5 w-5" />
                      IP Blocking
                    </CardTitle>
                    <CardDescription>
                      Block malicious IP addresses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" data-testid="button-manage-ip-blocks">
                      Manage IP Blocks
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/invitations">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Invitations
                    </CardTitle>
                    <CardDescription>
                      Manage invitation codes and access
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" data-testid="button-manage-invitations">
                      Manage Invitations
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="bans">
            <Card>
              <CardHeader>
                <CardTitle>User Bans Management</CardTitle>
                <CardDescription>
                  View and manage all banned users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">User ban management interface</p>
                  <Link href="/admin/user-bans">
                    <Button data-testid="button-go-to-bans">Go to Bans Page</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ip-blocks">
            <Card>
              <CardHeader>
                <CardTitle>IP Block Management</CardTitle>
                <CardDescription>
                  View and manage blocked IP addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">IP blocking interface</p>
                  <Link href="/admin/ip-blocks">
                    <Button data-testid="button-go-to-ip-blocks">Go to IP Blocks Page</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>Invitation Management</CardTitle>
                <CardDescription>
                  Manage invitation codes and user access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Invitation management interface</p>
                  <Link href="/admin/invitations">
                    <Button data-testid="button-go-to-invitations">Go to Invitations Page</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
