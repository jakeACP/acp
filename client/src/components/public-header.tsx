import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import acpLogo from "@assets/logo-tpb_1763998990798.png";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gradient-to-r from-[#3C3B6E] via-[#1a1a4a] to-[#3C3B6E] backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img 
              src={acpLogo} 
              alt="Anti-Corruption Party" 
              className="h-10 w-10 rounded-full border-2 border-white/20"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight">
                Anti-Corruption Party
              </span>
              <span className="text-xs text-white/60 -mt-1">
                Truth. Transparency. Accountability.
              </span>
            </div>
          </Link>

          <Link href="/auth">
            <Button 
              className="bg-[#B22234] hover:bg-[#8B1A28] text-white font-semibold px-6 py-2 rounded-lg shadow-lg border border-white/20 transition-all hover:scale-105"
            >
              Log In to ACP
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
