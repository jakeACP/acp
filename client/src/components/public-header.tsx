import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import acpLogo from "@assets/logo-tpb_1763998990798.png";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-gradient-to-r from-[#3C3B6E]/90 via-[#1a1a4a]/95 to-[#3C3B6E]/90 backdrop-blur-2xl shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex h-18 py-3 items-center justify-between">
          <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity group">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:blur-lg transition-all" />
              <img 
                src={acpLogo} 
                alt="Anti-Corruption Party" 
                className="relative h-12 w-12 rounded-full border-2 border-white/40 shadow-lg"
              />
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
