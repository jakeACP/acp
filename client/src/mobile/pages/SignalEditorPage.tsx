import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

export function SignalEditorPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="mobile-root min-h-screen flex flex-col bg-black">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={() => setLocation('/mobile/create')} className="text-white/70">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-lg">Edit Signal</h1>
      </div>
      <div className="flex-1 flex items-center justify-center text-white/40">
        <p>Timeline editor coming soon</p>
      </div>
    </div>
  );
}
