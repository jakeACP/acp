import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { 
  Users, 
  UserPlus, 
  Contact2, 
  Mail, 
  MapPin, 
  X, 
  Check, 
  Phone,
  Share2,
  Sparkles,
  Upload,
  ChevronRight,
  UserCheck,
  Copy,
  Link2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ContactSyncModal } from "../components/ContactSyncModal";
import type { Group } from "@shared/schema";

type TabType = "suggestions" | "contacts" | "invite";

interface FriendSuggestion {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  score: number;
  reasons: string[];
  contactName?: string;
  location?: string;
  mutualCount: number;
}

interface MatchedContact {
  id: string;
  contactName: string;
  phoneLast4?: string;
  matchedUser: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  reason: string;
}

export function MobileFriendsPage() {
  useScrollLight();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"friends" | "groups">("friends");
  const [activeTab, setActiveTab] = useState<TabType>("suggestions");
  const [showContactSync, setShowContactSync] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Detect real mobile device (touch-capable) to decide whether to show native SMS option
  const isMobileDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const { data: inviteData } = useQuery<{ token: string; inviteUrl: string }>({
    queryKey: ['/api/invite/my-link'],
    staleTime: Infinity,
  });

  const emailMutation = useMutation({
    mutationFn: (email: string) => apiRequest('/api/invite/email', 'POST', { email }),
    onSuccess: () => {
      toast({ title: "Email sent!", description: "Your invite was delivered." });
      setEmailInput("");
      setShowEmailForm(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    staleTime: 60000,
  });

  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery<FriendSuggestion[]>({
    queryKey: ['/api/friends/suggestions'],
    staleTime: 60000,
  });

  const { data: matchedContacts = [], isLoading: loadingContacts } = useQuery<MatchedContact[]>({
    queryKey: ['/api/contacts/matches'],
    staleTime: 60000,
  });

  const { data: pendingRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/friends/requests'],
    staleTime: 30000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: (addresseeId: string) => 
      apiRequest('/api/friendships/request', 'POST', { addresseeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/matches'] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (suggestedUserId: string) => 
      apiRequest(`/api/suggestions/${suggestedUserId}/dismiss`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
    }
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (friendshipId: string) => 
      apiRequest(`/api/friendships/${friendshipId}/accept`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({ title: "Friend request accepted!" });
    }
  });

  const getReasonIcon = (reasons: string[]) => {
    if (reasons.includes('contact')) return <Contact2 className="w-3.5 h-3.5" />;
    if (reasons.includes('mutual_friends')) return <Users className="w-3.5 h-3.5" />;
    if (reasons.includes('location')) return <MapPin className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  const getReasonText = (suggestion: FriendSuggestion) => {
    if (suggestion.reasons.includes('contact')) {
      return suggestion.contactName || 'From your contacts';
    }
    if (suggestion.reasons.includes('mutual_friends')) {
      return `${suggestion.mutualCount} mutual friend${suggestion.mutualCount !== 1 ? 's' : ''}`;
    }
    if (suggestion.reasons.includes('location')) {
      return suggestion.location || 'Nearby';
    }
    return 'Suggested for you';
  };

  const getUserDisplay = (user: FriendSuggestion['user']) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  const getInitials = (user: FriendSuggestion['user']) => {
    if (user.firstName) return user.firstName[0].toUpperCase();
    return user.username[0].toUpperCase();
  };

  const tabs: { key: TabType; label: string; icon: typeof Users }[] = [
    { key: "suggestions", label: "Suggestions", icon: Sparkles },
    { key: "contacts", label: "Contacts", icon: Contact2 },
    { key: "invite", label: "Invite", icon: Share2 },
  ];

  return (
    <div className="mobile-root" data-testid="mobile-friends-page">
      <MobileTopBar title="COMMUNITY" subtitle="Friends & Groups" />

      {/* Main Tab Switcher */}
      <div className="px-4 mb-4">
        <div className="flex rounded-xl bg-white/5 backdrop-blur-sm p-1">
          <button
            onClick={() => setMainTab("friends")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mainTab === "friends"
                ? "bg-gradient-to-r from-red-500 to-blue-600 text-white"
                : "text-white/60"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Friends
          </button>
          <button
            onClick={() => setMainTab("groups")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mainTab === "groups"
                ? "bg-gradient-to-r from-red-500 to-blue-600 text-white"
                : "text-white/60"
            }`}
          >
            <Users className="w-4 h-4" />
            Groups
          </button>
        </div>
      </div>

      {/* Groups Tab */}
      {mainTab === "groups" && (
        <div className="px-4 pb-28 space-y-5">
          {groupsLoading ? (
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
                <article className="glass-card p-4 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      {group.image ? (
                        <img src={group.image} alt={group.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{group.name}</h3>
                      <p className="text-white/60 text-sm">{group.memberCount?.toLocaleString() || 0} members</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                  {group.description && (
                    <p className="text-white/70 text-sm mt-3 line-clamp-2">{group.description}</p>
                  )}
                </article>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Friends Tab */}
      {mainTab === "friends" && (
        <>
          {/* Pending Requests Banner */}
          {pendingRequests.length > 0 && (
            <div className="px-4 mb-3">
              <div className="glass-card p-3 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-red-400" />
                    <span className="text-white text-sm font-medium">
                      {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </div>
              </div>
            </div>
          )}

          {/* Friends Sub-Tab Navigation */}
          <div className="px-4 mb-4">
            <div className="flex rounded-xl bg-white/5 backdrop-blur-sm p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "text-white/50"
                  }`}
                  data-testid={`tab-${tab.key}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Friends Tab Content */}
          <div className="px-4 pb-28">
        {/* Suggestions Tab */}
        {activeTab === "suggestions" && (
          <div className="space-y-3">
            {/* Sync Contacts CTA */}
            {matchedContacts.length === 0 && (
              <button
                onClick={() => setShowContactSync(true)}
                className="glass-card p-4 w-full text-left"
                data-testid="sync-contacts-cta"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">Find Friends in Contacts</h3>
                    <p className="text-white/60 text-sm">
                      Securely sync to find patriots you know
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </button>
            )}

            {loadingSuggestions ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-14 h-14 rounded-full" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-32 mb-2" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                    <div className="skeleton w-20 h-8 rounded-lg" />
                  </div>
                </div>
              ))
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12 text-white/60">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No suggestions yet</p>
                <p className="text-sm">Sync your contacts or invite friends</p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.user.id}
                  className="glass-card p-4"
                  data-testid={`suggestion-${suggestion.user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/mobile/profile/${suggestion.user.id}`}>
                      <Avatar className="w-14 h-14 border-2 border-white/20">
                        <AvatarImage src={suggestion.user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-600 text-white text-lg">
                          {getInitials(suggestion.user)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/mobile/profile/${suggestion.user.id}`}>
                        <h3 className="text-white font-semibold truncate">
                          {getUserDisplay(suggestion.user)}
                        </h3>
                        <p className="text-white/50 text-sm">@{suggestion.user.username}</p>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1 text-white/60 text-xs">
                        {getReasonIcon(suggestion.reasons)}
                        <span>{getReasonText(suggestion)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dismissMutation.mutate(suggestion.user.id)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        data-testid={`dismiss-${suggestion.user.id}`}
                      >
                        <X className="w-5 h-5 text-white/40" />
                      </button>
                      <Button
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(suggestion.user.id)}
                        disabled={sendRequestMutation.isPending}
                        className="bg-gradient-to-r from-red-500 to-blue-600 text-white text-xs px-4"
                        data-testid={`add-${suggestion.user.id}`}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowContactSync(true)}
              className="glass-card p-4 w-full"
              data-testid="sync-contacts-button"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-white font-medium">
                    {matchedContacts.length > 0 ? 'Sync Again' : 'Sync Contacts'}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </div>
            </button>

            {loadingContacts ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-32 mb-2" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : matchedContacts.length === 0 ? (
              <div className="text-center py-12 text-white/60">
                <Contact2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No contacts synced</p>
                <p className="text-sm">Sync your contacts to find friends</p>
              </div>
            ) : (
              matchedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="glass-card p-4"
                  data-testid={`contact-${contact.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/mobile/profile/${contact.matchedUser.id}`}>
                      <Avatar className="w-12 h-12 border-2 border-white/20">
                        <AvatarImage src={contact.matchedUser.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-600 text-white">
                          {contact.matchedUser.firstName?.[0] || contact.matchedUser.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {contact.contactName || contact.matchedUser.username}
                      </h3>
                      <p className="text-white/50 text-sm">@{contact.matchedUser.username}</p>
                      {contact.phoneLast4 && (
                        <div className="flex items-center gap-1 mt-1 text-white/40 text-xs">
                          <Phone className="w-3 h-3" />
                          <span>***-***-{contact.phoneLast4}</span>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => sendRequestMutation.mutate(contact.matchedUser.id)}
                      disabled={sendRequestMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-blue-600 text-white text-xs"
                      data-testid={`add-contact-${contact.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === "invite" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center mb-3">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-white text-xl font-bold mb-1">Invite Patriots</h2>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Everyone who joins with your link auto-connects with you as a friend.
              </p>
            </div>

            <div className="space-y-3">
              {/* Copy Invite Link */}
              <button
                onClick={async () => {
                  const url = inviteData?.inviteUrl || window.location.origin;
                  await navigator.clipboard.writeText(url);
                  toast({ title: "Invite link copied!", description: "Share it anywhere — new members auto-friend you." });
                }}
                className="glass-card p-4 w-full text-left"
                data-testid="share-link"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Copy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold">Copy Invite Link</h3>
                    <p className="text-white/50 text-xs truncate">{inviteData?.inviteUrl || "Loading…"}</p>
                  </div>
                  <Link2 className="w-5 h-5 text-white/40 flex-shrink-0" />
                </div>
              </button>

              {/* Text Message — only on real mobile devices */}
              {isMobileDevice && (
                <button
                  onClick={() => {
                    const inviteUrl = inviteData?.inviteUrl || window.location.origin;
                    const msg = `Join me on the Anti-Corruption Party app! Create your account and we'll instantly connect as friends: ${inviteUrl}`;
                    if (navigator.share) {
                      navigator.share({ title: "Join ACP", text: msg }).catch(() => {});
                    } else {
                      window.open(`sms:?body=${encodeURIComponent(msg)}`, '_self');
                    }
                  }}
                  className="glass-card p-4 w-full text-left"
                  data-testid="sms-invite"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white font-semibold">Text Message</h3>
                      <p className="text-white/60 text-sm">Open your Messages app to send</p>
                    </div>
                    <Share2 className="w-5 h-5 text-white/40" />
                  </div>
                </button>
              )}

              {/* Email */}
              <div className="glass-card overflow-hidden">
                <button
                  onClick={() => { setShowEmailForm(v => !v); setShowSmsForm(false); }}
                  className="w-full p-4 text-left"
                  data-testid="email-invite"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white font-semibold">Email</h3>
                      <p className="text-white/60 text-sm">Send email invitation</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${showEmailForm ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {showEmailForm && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    <p className="text-white/50 text-xs mb-2 mt-3">Enter their email address</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/30 flex-1"
                      />
                      <Button
                        onClick={() => emailInput.trim() && emailMutation.mutate(emailInput.trim())}
                        disabled={emailMutation.isPending || !emailInput.trim()}
                        className="bg-gradient-to-r from-red-500 to-blue-600 text-white px-4"
                      >
                        {emailMutation.isPending ? "…" : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-4 mt-6">
              <div className="text-center">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your Invite Stats</p>
                <div className="flex justify-around">
                  <div>
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-white/60 text-xs">Invited</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-white/60 text-xs">Joined</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </>
      )}

      {/* Contact Sync Modal */}
      {showContactSync && (
        <ContactSyncModal onClose={() => setShowContactSync(false)} />
      )}

      <MobileBottomNav />
    </div>
  );
}
