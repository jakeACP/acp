import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Hash,
  Clock,
  Link2,
  Database,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function BlockchainTransparency() {
  const [searchHash, setSearchHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const { data: chainSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/blockchain/summary"],
  });

  const { data: recentBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["/api/blockchain/recent-blocks"],
  });

  const handleVerifyVote = async () => {
    if (!searchHash.trim()) return;
    
    try {
      const response = await fetch(`/api/blockchain/verify/${searchHash}`);
      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({ error: "Failed to verify vote hash" });
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Shield className="h-5 w-5" />
          Blockchain Transparency System
          <Badge variant="outline" className="border-green-500 text-green-700">
            Beta
          </Badge>
        </CardTitle>
        <p className="text-sm text-green-700">
          All votes are cryptographically secured and publicly verifiable on our transparent blockchain
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Chain Summary</TabsTrigger>
            <TabsTrigger value="verify">Verify Vote</TabsTrigger>
            <TabsTrigger value="blocks">Recent Blocks</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {summaryLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : chainSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Blocks</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{chainSummary.totalBlocks}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Total Votes</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{chainSummary.totalVotes}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Chain Status</span>
                    </div>
                    <Badge variant={chainSummary.isValid ? "default" : "destructive"}>
                      {chainSummary.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Link2 className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Chain Height</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{chainSummary.chainHeight}</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Blockchain Not Available</h3>
                  <p className="text-gray-500">Blockchain data is currently being initialized</p>
                </CardContent>
              </Card>
            )}

            {chainSummary && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Latest Block Hash</h4>
                  <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
                    {chainSummary.latestBlockHash}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This hash represents the latest block in our voting blockchain
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="verify" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Verify Your Vote</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your vote hash to verify it's recorded correctly on the blockchain
                </p>
                
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter vote hash (e.g., 0x1234...)"
                      value={searchHash}
                      onChange={(e) => setSearchHash(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleVerifyVote} className="bg-green-600 hover:bg-green-700">
                    <Eye className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>

            {verificationResult && (
              <Card>
                <CardContent className="p-4">
                  {verificationResult.error ? (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Verification Failed</span>
                    </div>
                  ) : verificationResult.verified ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Vote Verified Successfully</span>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-green-800 mb-2">Vote Details:</p>
                        <div className="space-y-1 text-sm text-green-700">
                          <p><strong>Block Index:</strong> {verificationResult.block.index}</p>
                          <p><strong>Timestamp:</strong> {new Date(verificationResult.block.timestamp).toLocaleString()}</p>
                          <p><strong>Block Hash:</strong> <span className="font-mono text-xs">{verificationResult.block.hash}</span></p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Vote hash not found</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="blocks" className="space-y-4">
            {blocksLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : recentBlocks && recentBlocks.length > 0 ? (
              <div className="space-y-3">
                {recentBlocks.map((block: any, index: number) => (
                  <Card key={block.index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Block #{block.index}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(block.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Votes:</span>
                          <span className="font-medium">{block.votes?.length || 0}</span>
                        </div>
                        
                        <div>
                          <span className="text-gray-600">Hash:</span>
                          <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs break-all">
                            {block.hash}
                          </div>
                        </div>
                        
                        {index > 0 && (
                          <div>
                            <span className="text-gray-600">Previous Hash:</span>
                            <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs break-all">
                              {block.previousHash}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No blocks found</h3>
                  <p className="text-gray-500">The blockchain will show recent voting activity</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}