import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function AcpLogoSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-label="Anti-Corruption Party Logo"
      role="img"
    >
      <defs>
        <radialGradient id="acp-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#4a5fa8" />
          <stop offset="100%" stopColor="#1e2d6b" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#acp-bg)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <rect x="14" y="20" width="20" height="2.5" rx="1.25" fill="#B22234" />
      <rect x="14" y="25.5" width="20" height="2.5" rx="1.25" fill="white" />
      <rect x="14" y="31" width="20" height="2.5" rx="1.25" fill="#B22234" />
      <rect x="14" y="14" width="8" height="10" rx="0" fill="#3C3B6E" />
      <circle cx="17" cy="17" r="1" fill="white" />
      <circle cx="20" cy="17" r="1" fill="white" />
      <circle cx="17" cy="21" r="1" fill="white" />
      <circle cx="20" cy="21" r="1" fill="white" />
      <text x="24" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif" letterSpacing="0.5">ACP</text>
    </svg>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-gradient-to-r from-[#3C3B6E]/90 via-[#1a1a4a]/95 to-[#3C3B6E]/90 backdrop-blur-2xl shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex h-18 py-3 items-center justify-between">
          <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity group">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:blur-lg transition-all" />
              <AcpLogoSvg className="relative h-12 w-12 rounded-full border-2 border-white/40 shadow-lg" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">
                Anti-Corruption Party
              </span>
              <span className="text-sm text-white/70 font-medium tracking-wide">
                Truth. Transparency. Accountability.
              </span>
            </div>
          </Link>

          <Link href="/auth">
            <Button 
              className="relative bg-gradient-to-r from-[#B22234] to-[#D4343F] hover:from-[#8B1A28] hover:to-[#B22234] text-white font-bold px-8 py-3 rounded-xl shadow-xl border border-white/30 transition-all hover:scale-105 hover:shadow-2xl overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
              <span className="relative">Log In to ACP</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
