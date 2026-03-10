import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Vote, MapPin, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ElectionsPage() {
  const [address, setAddress] = useState("");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast({ title: "Please enter an address", variant: "destructive" });
      return;
    }
    navigate(`/elections/positions?address=${encodeURIComponent(address.trim())}`);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported by your browser", variant: "destructive" });
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.display_name || `${latitude},${longitude}`;
          setAddress(addr);
          navigate(`/elections/positions?address=${encodeURIComponent(addr)}`);
        } catch {
          toast({ title: "Could not determine your address", variant: "destructive" });
        } finally {
          setIsGeolocating(false);
        }
      },
      () => {
        toast({ title: "Location access denied", variant: "destructive" });
        setIsGeolocating(false);
      }
    );
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
          <p className="text-muted-foreground text-lg mb-10">
            Enter your address to see the elected offices representing you and the candidates running for each seat.
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, Minneapolis, MN 55401"
                  className="pl-9 h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                Find My Elections
              </Button>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={handleUseMyLocation}
              disabled={isGeolocating}
            >
              {isGeolocating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Use My Location
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6">
            Your address is used only to look up your elected representatives and is not stored.
          </p>
        </div>
      </div>
    </div>
  );
}
