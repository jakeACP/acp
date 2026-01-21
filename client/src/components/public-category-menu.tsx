import { cn } from "@/lib/utils";
import { 
  Newspaper, 
  Users, 
  FileText, 
  AlertTriangle, 
  DollarSign, 
  Megaphone, 
  HelpCircle, 
  Scale, 
  FileWarning 
} from "lucide-react";

export type ArticleCategory = 
  | 'all'
  | 'current-events'
  | 'politicians'
  | 'proposals'
  | 'issues'
  | 'donors'
  | 'propaganda'
  | 'conspiracies'
  | 'legal-cases'
  | 'leaks';

interface PublicCategoryMenuProps {
  activeCategory: ArticleCategory;
  onCategoryChange: (category: ArticleCategory) => void;
}

const categories: { id: ArticleCategory; label: string; icon: typeof Newspaper }[] = [
  { id: 'current-events', label: 'Current Events', icon: Newspaper },
  { id: 'politicians', label: 'Politicians', icon: Users },
  { id: 'proposals', label: 'Proposals', icon: FileText },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'donors', label: 'Donors', icon: DollarSign },
  { id: 'propaganda', label: 'Propaganda', icon: Megaphone },
  { id: 'conspiracies', label: 'Conspiracies', icon: HelpCircle },
  { id: 'legal-cases', label: 'Legal Cases', icon: Scale },
  { id: 'leaks', label: 'Leaks', icon: FileWarning },
];

export function PublicCategoryMenu({ activeCategory, onCategoryChange }: PublicCategoryMenuProps) {
  return (
    <nav className="sticky top-[72px] z-40 w-full bg-[#1a1a2e]/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-r from-[#B22234]/10 via-transparent to-[#3C3B6E]/10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={cn(
              "flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border",
              activeCategory === 'all'
                ? "bg-gradient-to-r from-[#B22234] to-[#D4343F] text-white shadow-lg border-white/30 scale-105"
                : "text-white/80 hover:bg-white/10 border-transparent hover:border-white/20 hover:shadow-md"
            )}
          >
            All Articles
          </button>
          
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border",
                  activeCategory === category.id
                    ? "bg-gradient-to-r from-[#B22234] to-[#D4343F] text-white shadow-lg border-white/30 scale-105"
                    : "text-white/80 hover:bg-white/10 border-transparent hover:border-white/20 hover:shadow-md"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
