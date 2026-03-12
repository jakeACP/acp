import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Vote, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google: any;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById("google-maps-script");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export default function ElectionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [mapsError, setMapsError] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/config/google-maps-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.key) setMapsKey(data.key);
        else setMapsError(true);
      })
      .catch(() => setMapsError(true));
  }, []);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      types: ["address"],
      fields: ["formatted_address", "geometry", "address_components"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address) {
        setVerifiedAddress(place.formatted_address);
        setInputValue(place.formatted_address);
      }
    });
    autocompleteRef.current = autocomplete;
  }, []);

  useEffect(() => {
    if (!mapsKey) return;
    loadGoogleMapsScript(mapsKey)
      .then(() => initAutocomplete())
      .catch(() => setMapsError(true));
  }, [mapsKey, initAutocomplete]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      toast({ title: "Please enter an address", variant: "destructive" });
      return;
    }
    if (!verifiedAddress) {
      toast({
        title: "Please select a verified address from the dropdown to continue.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/elections/positions?address=${encodeURIComponent(verifiedAddress)}`);
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

          if (window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results: any[], status: string) => {
                setIsGeolocating(false);
                if (status === "OK" && results[0]) {
                  const addr = results[0].formatted_address;
                  setVerifiedAddress(addr);
                  setInputValue(addr);
                  navigate(`/elections/positions?address=${encodeURIComponent(addr)}`);
                } else {
                  toast({ title: "Could not determine your address", variant: "destructive" });
                }
              }
            );
          } else {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const addr = data.display_name || `${latitude},${longitude}`;
            setIsGeolocating(false);
            setVerifiedAddress(addr);
            setInputValue(addr);
            navigate(`/elections/positions?address=${encodeURIComponent(addr)}`);
          }
        } catch {
          setIsGeolocating(false);
          toast({ title: "Could not determine your address", variant: "destructive" });
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
          <p className="text-muted-foreground text-lg mb-2">
            Enter your address to see the elected offices representing you and the candidates running for each seat.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            We use your address to find your exact congressional district, state legislature district, and local offices.
            Your address is never stored.
          </p>

          {mapsError && (
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Address lookup is temporarily unavailable. You can still type an address manually.
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative w-full">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setVerifiedAddress(null);
                }}
                placeholder="Enter your address to find your representatives..."
                autoComplete="off"
                className="w-full pl-9 pr-4 h-12 text-base rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12">
              Find My Elections
            </Button>

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
