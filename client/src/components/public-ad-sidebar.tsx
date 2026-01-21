import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Vote, Bell, Star, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface AdCardProps {
  title: string;
  description: string;
  icon: typeof Users;
  buttonText: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

function AdCard({ title, description, icon: Icon, buttonText, variant = 'primary' }: AdCardProps) {
  const bgColors = {
    primary: 'bg-gradient-to-br from-[#3C3B6E] to-[#1a1a4a]',
    secondary: 'bg-gradient-to-br from-[#B22234] to-[#8B1A28]',
    accent: 'bg-gradient-to-br from-slate-800 to-slate-900',
  };

  return (
    <Card className={`${bgColors[variant]} border-0 text-white overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm">{title}</h4>
        </div>
        <p className="text-xs text-white/80 mb-4 leading-relaxed">
          {description}
        </p>
        <Link href="/auth">
          <Button 
            size="sm" 
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs font-semibold"
          >
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function PublicAdSidebarLeft() {
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
      <AdCard
        title="Join the Movement"
        description="Become a member of the Anti-Corruption Party and help fight for transparency in government."
        icon={Users}
        buttonText="Sign Up Free"
        variant="primary"
      />
      
      <AdCard
        title="Verified Voter Status"
        description="Get verified as a voter to participate in official polls and elections."
        icon={Shield}
        buttonText="Get Verified"
        variant="secondary"
      />
      
      <AdCard
        title="Your Voice Matters"
        description="Vote on issues that matter to you. Every vote is recorded on blockchain for transparency."
        icon={Vote}
        buttonText="Start Voting"
        variant="accent"
      />
      
      <Link href="/auth">
        <Card className="bg-gradient-to-br from-[#B22234] to-[#8B1A28] border border-white/20 hover:scale-105 transition-transform cursor-pointer">
          <CardContent className="p-4 text-center">
            <p className="text-white font-bold text-lg">
              Join ACP +
            </p>
          </CardContent>
        </Card>
      </Link>
    </aside>
  );
}

export function PublicAdSidebarRight() {
  return (
    <aside className="hidden xl:block w-64 flex-shrink-0 space-y-4">
      <AdCard
        title="Stay Informed"
        description="Get real-time notifications on breaking political news and corruption exposés."
        icon={Bell}
        buttonText="Enable Alerts"
        variant="accent"
      />
      
      <AdCard
        title="Premium Access"
        description="Unlock exclusive investigative reports and behind-the-scenes content."
        icon={Star}
        buttonText="Go Premium"
        variant="secondary"
      />
      
      <AdCard
        title="Trending Topics"
        description="See what issues are being discussed most by the community right now."
        icon={TrendingUp}
        buttonText="View Trends"
        variant="primary"
      />
      
      <Link href="/auth">
        <Card className="bg-gradient-to-br from-[#B22234] to-[#8B1A28] border border-white/20 hover:scale-105 transition-transform cursor-pointer">
          <CardContent className="p-4 text-center">
            <p className="text-white font-bold text-lg">
              Join ACP +
            </p>
          </CardContent>
        </Card>
      </Link>
    </aside>
  );
}
