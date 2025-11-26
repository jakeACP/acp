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
  UserCheck
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ContactSyncModal } from "../components/ContactSyncModal";

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
  const [activeTab, setActiveTab] = useState<TabType>("suggestions");
  const [showContactSync, setShowContactSync] = useState(false);

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
      <MobileTopBar title="FRIENDS" subtitle="Connect with Patriots" />

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

      {/* Tab Navigation */}
      <div className="px-4 mb-4">
        <div className="flex rounded-xl bg-white/5 backdrop-blur-sm p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-red-500 to-blue-600 text-white"
                  : "text-white/60"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
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
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center mb-4">
                <Share2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">
                Invite Patriots
              </h2>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Share the movement with friends and family. Together we're stronger.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join the Anti-Corruption Party',
                      text: 'Join me on the ACP social platform to fight corruption and build a better democracy!',
                      url: window.location.origin,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.origin);
                    toast({ title: "Link copied to clipboard!" });
                  }
                }}
                className="glass-card p-4 w-full"
                data-testid="share-link"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold">Share Link</h3>
                    <p className="text-white/60 text-sm">Send invite via any app</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </button>

              <a
                href={`sms:?&body=Join me on the Anti-Corruption Party app! ${window.location.origin}`}
                className="glass-card p-4 block"
                data-testid="sms-invite"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold">Text Message</h3>
                    <p className="text-white/60 text-sm">Invite via SMS</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </a>

              <a
                href={`mailto:?subject=Join the Anti-Corruption Party&body=Join me on the ACP social platform to fight corruption and build a better democracy! ${window.location.origin}`}
                className="glass-card p-4 block"
                data-testid="email-invite"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold">Email</h3>
                    <p className="text-white/60 text-sm">Send email invitation</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </div>
              </a>
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

      {/* Contact Sync Modal */}
      {showContactSync && (
        <ContactSyncModal onClose={() => setShowContactSync(false)} />
      )}

      <MobileBottomNav />
    </div>
  );
}
