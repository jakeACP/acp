import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Users, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Group } from "@shared/schema";

export function MobileGroupsPage() {
  useScrollLight();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    staleTime: 60000,
  });

  return (
    <div className="mobile-root" data-testid="mobile-groups-page">
      <MobileTopBar title="GROUPS" subtitle="Find Your Community" />

      <div className="px-4 pb-8 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No groups yet</p>
            <p className="text-sm">Create or join a group to get started</p>
          </div>
        ) : (
          groups.map((group) => (
            <Link key={group.id} href={`/mobile/groups/${group.id}`}>
              <article 
                className="glass-card p-4 cursor-pointer" 
                data-testid={`group-card-${group.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
                    {group.image ? (
                      <img 
                        src={group.image} 
                        alt={group.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {group.name}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {group.memberCount?.toLocaleString() || 0} members
                    </p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
                
                {group.description && (
                  <p className="text-white/70 text-sm mt-3 line-clamp-2">
                    {group.description}
                  </p>
                )}
              </article>
            </Link>
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
