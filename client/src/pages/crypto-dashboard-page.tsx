import { CryptoWallet } from "@/components/crypto-wallet";
import { PremiumStore } from "@/components/premium-store";
import { Navigation } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, ShoppingCart, TrendingUp } from "lucide-react";

export default function CryptoDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ACP Cryptocurrency Dashboard</h1>
          <p className="text-gray-600">
            Manage your ACP coins, purchase premium profile customizations, and explore the marketplace
          </p>
        </div>

        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="wallet" className="flex items-center gap-2" data-testid="tab-wallet">
              <Coins className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2" data-testid="tab-store">
              <ShoppingCart className="h-4 w-4" />
              Premium Store
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <CryptoWallet />
          </TabsContent>

          <TabsContent value="store">
            <PremiumStore />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₳125.50</div>
                  <p className="text-xs text-gray-500">+12.5% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Items Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-gray-500">+8 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Community Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8★</div>
                  <p className="text-xs text-gray-500">Based on 45 reviews</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Blockchain Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Blockchain Status: Active</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      All your transactions are cryptographically secured and publicly verifiable
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Latest Block:</span>
                      <div className="font-mono">#1,247</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Verified Transactions:</span>
                      <div className="font-mono">89</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}