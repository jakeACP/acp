import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, History, ExternalLink } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";

interface Transaction {
  id: string;
  amount: string;
  transactionType: string;
  description: string;
  status: string;
  blockchainHash?: string;
  createdAt: string;
}

export function CryptoWallet() {
  const [showHistory, setShowHistory] = useState(false);

  const { data: balance, isLoading: balanceLoading, error: balanceError } = useQuery<{ balance: string }>({
    queryKey: ["/api/user/balance"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/history"],
    enabled: showHistory,
  });

  if (balanceLoading) {
    return <LoadingSpinner />;
  }

  if (balanceError) {
    return <ErrorMessage message="Failed to load wallet data" />;
  }

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(2);
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'subscription_reward': return 'ACP+ Reward';
      case 'purchase': return 'Store Purchase';
      case 'sale': return 'Item Sale';
      case 'transfer': return 'Transfer';
      default: return type.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="crypto-wallet-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            ACP Cryptocurrency Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-yellow-600" data-testid="wallet-balance">
              ₳{balance ? formatBalance(balance.balance) : "0.00"}
            </div>
            <p className="text-sm text-gray-600">ACP Coin Balance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/subscription">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                data-testid="button-get-acp"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Get ACP+
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? "Hide" : "View"} History
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ACP+ Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 9 ACP coins monthly ($8.99/month)</li>
              <li>• Annual discount: $79.99/year (save $28!)</li>
              <li>• Access to premium profile themes</li>
              <li>• Custom backgrounds & music</li>
              <li>• MySpace-style profile customization</li>
              <li>• Marketplace access for selling creations</li>
              <li>• Support balanced ACP party growth</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {showHistory && (
        <Card data-testid="transaction-history-card">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <LoadingSpinner />
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatTransactionType(tx.transactionType)}
                        </span>
                        <Badge
                          variant={tx.status === "confirmed" ? "default" : "secondary"}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{tx.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        +₳{formatBalance(tx.amount)}
                      </div>
                      {tx.blockchainHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs p-1 h-auto"
                          data-testid={`verify-${tx.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Activate ACP+ to start earning coins!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}