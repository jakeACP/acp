import { MapPin } from "lucide-react";

interface DistrictMapProps {
  officeName: string;
  divisionId?: string;
  state?: string;
}

export function DistrictMap({ officeName, state }: DistrictMapProps) {
  const query = encodeURIComponent(`${officeName}${state ? ` ${state}` : ""} district`);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      onClick={() => window.open(mapUrl, "_blank")}
      title="View district on Google Maps"
    >
      <MapPin className="h-5 w-5 text-slate-400" />
      <span className="text-xs text-slate-500 dark:text-slate-400 text-center px-2 leading-tight">
        View District Map
      </span>
    </div>
  );
}
