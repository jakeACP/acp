import { useLocation, Link } from "wouter";
import { Home, ChevronLeft, Compass } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

export function MobileNotFoundPage() {
  const [location, navigate] = useLocation();

  return (
    <div className="mobile-root flex items-center justify-center" data-testid="mobile-not-found-page">
      <div className="flex flex-col items-center px-8 text-center max-w-xs">
        {/* Animated lock-out icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{
            background: "rgba(230,57,58,0.1)",
            border: "2px solid rgba(230,57,58,0.25)",
            boxShadow: "0 0 40px rgba(230,57,58,0.15)",
          }}
        >
          <Compass className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-white font-bold text-2xl mb-2">Page Not Found</h1>
        <p className="text-white/50 text-sm mb-2 leading-relaxed">
          The page <span className="text-white/70 font-mono text-xs">{location}</span> doesn't exist in the ACP mobile app.
        </p>
        <p className="text-white/40 text-xs mb-8">
          If you followed a link from outside the app, it may point to a desktop page. You can continue browsing below.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Link href="/mobile">
            <button
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, rgba(230,57,58,0.25), rgba(59,130,246,0.15))",
                color: "#fff",
                border: "1px solid rgba(230,57,58,0.35)",
              }}
            >
              <Home className="w-4 h-4" />
              Go to Home
            </button>
          </Link>

          <button
            onClick={() => navigate(-1 as any)}
            className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
