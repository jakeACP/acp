import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function SeedButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    if (isSeeding) return;
    
    setIsSeeding(true);
    try {
      await apiRequest("POST", "/api/seed");
      
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries();
      
      toast({
        title: "Database Seeded!",
        description: "Sample content has been added to the platform. Refresh to see the new content.",
      });
    } catch (error: any) {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed database",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Button
      onClick={handleSeed}
      disabled={isSeeding}
      variant="outline"
      size="sm"
      className="mb-4"
    >
      {isSeeding ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Database className="h-4 w-4 mr-2" />
      )}
      {isSeeding ? "Adding Sample Data..." : "Add Sample Data"}
    </Button>
  );
}