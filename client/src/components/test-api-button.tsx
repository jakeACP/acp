import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function TestApiButton() {
  const { toast } = useToast();

  const testApi = async () => {
    try {
      const response = await fetch("/api/representatives/test");
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "API Test Successful",
          description: `Found ${data.sampleData?.foundOfficials || 0} officials`,
        });
      } else {
        toast({
          title: "API Test Failed",
          description: data.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "API Test Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button onClick={testApi} variant="outline" size="sm">
      Test Google Civic API
    </Button>
  );
}