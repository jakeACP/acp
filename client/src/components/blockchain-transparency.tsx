import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Shield, Hash, Clock, Users, Check, Eye, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BlockchainTransparencyProps {
  pollId?: string;
}

export function BlockchainTransparency({ pollId }: BlockchainTransparencyProps) {
  const [selectedVoteId, setSelectedVoteId] = useState<string>("");

  const { data: blockchainData } = useQuery({
    queryKey: ["/api/blockchain/summary"],
    enabled: !pollId, // Only fetch general summary if no specific poll
  });

  const { data: pollBlockchainData } = useQuery({
    queryKey: ["/api/blockchain/poll", pollId],
    enabled: !!pollId, // Only fetch poll-specific data if pollId provided
  });

  const { data: voteVerification, refetch: verifyVote } = useQuery({
    queryKey: ["/api/blockchain/verify", selectedVoteId],
    enabled: false, // Only run when manually triggered
  });

  const handleVerifyVote = () => {
    if (selectedVoteId) {
      verifyVote();
    }
  };

  const exportBlockchainData = () => {
    // Create downloadable blockchain export
    const dataToExport = pollId ? pollBlockchainData : blockchainData;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-data-${pollId || 'all'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Shield className="h-5 w-5" />
          Blockchain Transparency
          <Badge variant="outline" className="border-green-500 text-green-700">
            Verified
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          All votes are cryptographically secured and publicly verifiable on our transparent blockchain system.
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Vote Verification</TabsTrigger>
            <TabsTrigger value="blocks">Block Explorer</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Blocks</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {blockchainData?.totalBlocks || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Verified Votes</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {blockchainData?.totalVotes || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Chain Integrity</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {blockchainData?.chainVerification?.valid ? "100%" : "Error"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">How Blockchain Transparency Works</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Every vote is cryptographically hashed and stored in immutable blocks</li>
                <li>• User identities are anonymized while maintaining vote verifiability</li>
                <li>• Merkle trees ensure data integrity and tamper detection</li>
                <li>• Public audit trail allows anyone to verify election results</li>
                <li>• Distributed consensus prevents single points of failure</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Last block: {blockchainData?.lastBlockHash ? 
                  `${blockchainData.lastBlockHash.substring(0, 16)}...` : 
                  'None'
                }
              </div>
              <Button variant="outline" size="sm" onClick={exportBlockchainData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verify Vote by ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter vote ID to verify..."
                    value={selectedVoteId}
                    onChange={(e) => setSelectedVoteId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button onClick={handleVerifyVote} disabled={!selectedVoteId}>
                    <Eye className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </div>

              {voteVerification && (
                <Card className={voteVerification.verified ? "border-green-200" : "border-red-200"}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      {voteVerification.verified ? (
                        <>
                          <Check className="h-5 w-5 text-green-500" />
                          <span className="font-medium text-green-700">Vote Verified</span>
                        </>
                      ) : (
                        <>
                          <span className="h-5 w-5 text-red-500">❌</span>
                          <span className="font-medium text-red-700">Vote Not Found</span>
                        </>
                      )}
                    </div>
                    
                    {voteVerification.verified && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Block ID:</span>
                          <span className="font-mono">{voteVerification.block?.blockId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vote Hash:</span>
                          <span className="font-mono text-xs">{voteVerification.voteHash?.substring(0, 32)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Timestamp:</span>
                          <span>{new Date(voteVerification.block?.timestamp || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Vote Verification Process</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Enter your vote ID (provided when you voted)</li>
                  <li>System searches blockchain for your vote record</li>
                  <li>Cryptographic hash is recalculated and verified</li>
                  <li>Block integrity and chain consistency are checked</li>
                  <li>Your vote's inclusion and authenticity are confirmed</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blocks" className="space-y-4">
            <div className="space-y-3">
              {blockchainData?.blocks?.slice(-5).reverse().map((block: any, index: number) => (
                <Card key={block.blockId} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Block #{blockchainData.blocks.length - index}</Badge>
                          <span className="text-sm font-mono">{block.blockId}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3" />
                            <span>{block.voteCount} votes</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(block.timestamp), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-gray-500">
                        <div>Hash: {block.hash.substring(0, 16)}...</div>
                        <div>Previous: {block.previousHash.substring(0, 16)}...</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  No blocks found. Vote to create the first block!
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}