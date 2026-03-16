import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Vote, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ElectionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = zipCode.trim();
    
    if (!zip) {
      toast({ title: "Please enter a ZIP code", variant: "destructive" });
      return;
    }
    
    if (!/^\d{5}$/.test(zip)) {
      toast({ title: "Please enter a valid 5-digit ZIP code", variant: "destructive" });
      return;
    }
    
    navigate(`/elections/positions?address=${encodeURIComponent(zip)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Vote className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-2">Find Your Elections</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Enter your ZIP code to see the elected offices representing you and the candidates running for each seat.
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative w-full">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter your ZIP code"
                maxLength={5}
                className="w-full pl-9 pr-4 h-12 text-base rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12">
              Find My Elections
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6">
            Your ZIP code is used only to look up your elected representatives and is not stored.
          </p>
        </div>
      </div>
    </div>
  );
}
