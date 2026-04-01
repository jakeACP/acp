import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, Vote, Star, TrendingUp, LogIn, KeyRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

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

function SignInCard() {
  const { loginMutation, verify2FAMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'sms' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeToken) {
      verify2FAMutation.mutate(
        { challengeToken, method: twoFactorMethod ?? 'totp', code: twoFactorCode },
        { onSuccess: () => setLocation("/") }
      );
    } else {
      loginMutation.mutate(
        { username, password },
        {
          onSuccess: (res) => {
            if ('requiresTwoFactor' in res && res.requiresTwoFactor) {
              setChallengeToken(res.challengeToken);
              setTwoFactorMethod(res.twoFactorMethod);
            } else {
              setLocation("/");
            }
          },
        }
      );
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <LogIn className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm">Member Sign In</h4>
        </div>

        {!challengeToken ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <Label className="text-xs text-white/70 mb-1 block">Username or Email</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-white/70 mb-1 block">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                required
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={loginMutation.isPending}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs font-semibold mt-1"
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
            <p className="text-center text-xs text-white/50 pt-1">
              No account?{" "}
              <Link href="/auth" className="text-white/80 hover:text-white underline">
                Join ACP
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-4 w-4 text-white/60" />
              <p className="text-xs text-white/80">
                {twoFactorMethod === 'sms' ? 'Enter the code sent to your phone' : 'Enter your authenticator code'}
              </p>
            </div>
            <Input
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 tracking-widest text-center"
              required
            />
            <Button
              type="submit"
              size="sm"
              disabled={verify2FAMutation.isPending}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs font-semibold"
            >
              {verify2FAMutation.isPending ? "Verifying..." : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => { setChallengeToken(null); setTwoFactorCode(""); }}
              className="w-full text-xs text-white/50 hover:text-white/80 text-center pt-1"
            >
              Back to sign in
            </button>
          </form>
        )}
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
      <SignInCard />
      
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
