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
    <nav className="sticky top-16 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              activeCategory === 'all'
                ? "bg-[#B22234] text-white shadow-md"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            All
          </button>
          
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeCategory === category.id
                    ? "bg-[#B22234] text-white shadow-md"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
