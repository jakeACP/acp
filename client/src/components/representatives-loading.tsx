import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Database, CheckCircle } from "lucide-react";

interface LoadingUpdate {
  type: 'progress' | 'candidate' | 'candidate_found' | 'complete' | 'error';
  step?: string;
  message?: string;
  progress?: number;
  name?: string;
  office?: string;
  level?: string;
  party?: string;
  representative?: any;
  representatives?: any[];
  fromCache?: boolean;
  totalFound?: number;
}

interface RepresentativesLoadingProps {
  zipCode: string;
  onComplete: (representatives: any[], fromCache: boolean) => void;
  onError: (error: string) => void;
}

export function RepresentativesLoading({ zipCode, onComplete, onError }: RepresentativesLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("Starting search...");
  const [currentStep, setCurrentStep] = useState("");
  const [foundCandidates, setFoundCandidates] = useState<Array<{ name: string; office: string; level?: string; party?: string; id?: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/representatives/zip-lookup-stream/${zipCode}`);

    eventSource.onmessage = (event) => {
      try {
        const data: LoadingUpdate = JSON.parse(event.data);
        
        switch (data.type) {
          case 'progress':
            if (data.progress !== undefined) {
              setProgress(data.progress);
            }
            if (data.message) {
              setCurrentMessage(data.message);
            }
            if (data.step) {
              setCurrentStep(data.step);
            }
            break;
            
          case 'candidate':
            if (data.name && data.office) {
              setFoundCandidates(prev => [...prev, { name: data.name!, office: data.office! }]);
              if (data.message) {
                setCurrentMessage(data.message);
              }
            }
            break;
            
          case 'candidate_found':
            if (data.representative) {
              const rep = data.representative;
              setFoundCandidates(prev => [...prev, { 
                name: rep.name, 
                office: rep.office,
                level: rep.level,
                party: rep.party,
                id: rep.id
              }]);
              if (data.message) {
                setCurrentMessage(data.message);
              }
              if (data.progress !== undefined) {
                setProgress(data.progress);
              }
            }
            break;
            
          case 'complete':
            setProgress(100);
            setCurrentMessage("Search complete!");
            setIsComplete(true);
            eventSource.close();
            if (data.representatives) {
              onComplete(data.representatives, data.fromCache || false);
            }
            break;
            
          case 'error':
            eventSource.close();
            onError(data.message || "An error occurred during the search");
            break;
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
      onError("Connection to server lost");
    };

    return () => {
      eventSource.close();
    };
  }, [zipCode, onComplete, onError]);

  const getStepIcon = () => {
    switch (currentStep) {
      case 'cache':
        return <Database className="h-5 w-5 text-blue-500" />;
      case 'searching':
      case 'analyzing':
        return <Search className="h-5 w-5 text-orange-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 space-y-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {getStepIcon()}
            Finding Representatives
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Searching zip code: {zipCode}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentMessage}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {foundCandidates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-600">Found Representatives:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {foundCandidates.map((candidate, index) => (
                  <div key={candidate.id || index} className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200 animate-in slide-in-from-top-1 duration-300">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-green-600 truncate">
                        {candidate.office}
                      </p>
                      {candidate.level && (
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                            {candidate.level}
                          </Badge>
                          {candidate.party && (
                            <Badge variant="outline" className="text-xs px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                              {candidate.party}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                      ✓ Saved
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isComplete && (
            <div className="text-center py-2">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-600 font-medium">Search completed successfully!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}