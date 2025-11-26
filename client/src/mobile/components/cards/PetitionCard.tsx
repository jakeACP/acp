import { Link } from "wouter";
import { CheckCircle } from "lucide-react";

interface PetitionCardProps {
  petition: {
    id: string;
    title: string;
    objective?: string | null;
    targetSignatures?: number | null;
    currentSignatures?: number | null;
    isActive?: boolean | null;
  };
}

export function PetitionCard({ petition }: PetitionCardProps) {
  const progress = petition.targetSignatures 
    ? Math.min(100, Math.round((petition.currentSignatures || 0) / petition.targetSignatures * 100))
    : 0;

  return (
    <article className="glass-card p-3" data-testid={`petition-card-${petition.id}`}>
      <div className="absolute top-3 left-3 z-10">
        <span className="type-tag petition">Petition</span>
      </div>
      
      <div className="pt-8">
        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
          {petition.title}
        </h3>
        
        <p className="text-white/60 text-xs line-clamp-2 mb-3">
          {petition.objective}
        </p>
        
        <div className="petition-progress mb-2">
          <div 
            className="petition-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-white/70 text-xs">
            <span className="text-white font-semibold">
              {(petition.currentSignatures || 0).toLocaleString()}
            </span>
            {' | '}
            {(petition.targetSignatures || 0).toLocaleString()}
          </div>
          
          <div className="flex items-center gap-2">
            {petition.isActive && (
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>Official</span>
              </div>
            )}
            <Link href={`/mobile/petitions/${petition.id}/sign`}>
              <button 
                className="glass-button primary text-xs py-1.5 px-3"
                data-testid={`sign-petition-${petition.id}`}
              >
                SIGN
              </button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
