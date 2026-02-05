import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Heart, Coins, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [tipAmount, setTipAmount] = useState(0);

  const subscriptionMutation = useMutation({
    mutationFn: async (planData: { plan: string; amount: number; tipAmount: number }) => {
      const { getCsrfToken } = await import("@/lib/queryClient");
      const token = getCsrfToken();
      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
        credentials: "include",
        body: JSON.stringify(planData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create subscription: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ACP+ Subscription Created!",
        description: `Your ${selectedPlan} subscription is active! You received ${data.totalCredits} ACP credits.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/acp/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const planDetails = {
    monthly: {
      price: 8.99,
      credits: 9,
      duration: "month",
      savings: 0,
    },
    annual: {
      price: 79.99,
      credits: 108, // 9 x 12 months
      duration: "year", 
      savings: 27.89, // $107.88 - $79.99
    }
  };

  const selectedPlanDetails = planDetails[selectedPlan];
  const totalAmount = selectedPlanDetails.price + tipAmount;
  const totalCredits = selectedPlanDetails.credits + tipAmount; // Dollar-for-dollar tip credits

  const handleSubscribe = () => {
    subscriptionMutation.mutate({
      plan: selectedPlan,
      amount: totalAmount,
      tipAmount,
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
            <p className="text-gray-600">You need to be logged in to manage your ACP+ subscription.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">ACP+ Subscription</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Support balanced ACP party growth and eliminate the "vote for a 3rd party is a vote for the evil candidate" narrative. 
          Your subscription funds grassroots democracy and fair representation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Choose Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as "monthly" | "annual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
                <TabsTrigger value="annual" data-testid="tab-annual">Annual</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Monthly Plan</h3>
                    <Badge variant="secondary">Most Popular</Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">$8.99/month</div>
                  <p className="text-sm text-gray-600 mb-3">9 ACP credits every month</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Cancel anytime
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Immediate activation
                    </li>
                  </ul>
                </div>
              </TabsContent>
              
              <TabsContent value="annual" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Annual Plan</h3>
                    <Badge className="bg-green-600">Save $28!</Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-2">$79.99/year</div>
                  <p className="text-sm text-gray-600 mb-3">108 ACP credits (9 per month)</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Save $27.89 vs monthly
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Full year of benefits
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            {/* Voluntary Tip Section */}
            <div className="mt-6">
              <Separator className="mb-4" />
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Voluntary Tip (Optional)
                </Label>
                <p className="text-sm text-gray-600">
                  Support extra ACP party growth! Every dollar = 1 additional ACP credit.
                </p>
                <div className="flex items-center gap-2">
                  <span>$</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                    className="w-20"
                    data-testid="input-tip-amount"
                  />
                  <span className="text-sm text-gray-600">
                    = {tipAmount} extra credits
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subscription Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Plan Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3">ACP+ Benefits</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Premium profile themes & customization</li>
                  <li>• Custom backgrounds & music</li>
                  <li>• MySpace-style profile features</li>
                  <li>• Marketplace access for creations</li>
                  <li>• Direct support for ACP party growth</li>
                  <li>• Equal civic participation for all users</li>
                </ul>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{selectedPlan === "monthly" ? "Monthly" : "Annual"} Plan</span>
                  <span>${selectedPlanDetails.price}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Voluntary Tip</span>
                    <span>+${tipAmount}</span>
                  </div>
                )}
                {selectedPlan === "annual" && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Annual Savings</span>
                    <span>-$27.89</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    Total ACP Credits
                  </span>
                  <span className="font-medium text-blue-600">{totalCredits} credits</span>
                </div>
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={subscriptionMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                data-testid="button-subscribe"
              >
                {subscriptionMutation.isPending ? (
                  "Processing..."
                ) : (
                  `Subscribe for $${totalAmount.toFixed(2)}`
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                <p>Secure payment processing via Stripe</p>
                <p>100% of revenue supports balanced ACP party growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Party Growth Impact */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Supporting Balanced ACP Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">Grassroots Funding</div>
              <p className="text-sm text-gray-600">
                Your subscription directly funds grassroots organizing, volunteer coordination, and community outreach.
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">Fair Elections</div>
              <p className="text-sm text-gray-600">
                Support viable 3rd party alternatives and eliminate the "lesser evil" voting trap through balanced growth.
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">Platform Development</div>
              <p className="text-sm text-gray-600">
                Continue building democratic participation tools that empower citizens and increase transparency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}