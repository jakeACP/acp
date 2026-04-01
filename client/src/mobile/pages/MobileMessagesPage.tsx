import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Hash, ArrowLeft, Send, User,
  Plus, Lock, Globe, Clock
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import "../mobile-theme.css";

interface Conversation {
  partnerId: string;
  lastMessageContent: string;
  lastMessageTime: string;
  isRead: boolean;
  lastSenderId: string;
  partner: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  memberCount: number | null;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function getInitials(firstName: string | null, lastName: string | null, username: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return username[0].toUpperCase();
}

function getDisplayName(firstName: string | null, lastName: string | null, username: string) {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return username;
}

function ChatView({
  partnerId,
  partnerName,
  isChannel,
  onBack,
}: {
  partnerId: string;
  partnerName: string;
  isChannel: boolean;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = isChannel
    ? [`/api/channels/${partnerId}/messages`]
    : ["/api/conversations", partnerId];

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey,
    refetchInterval: 5000,
    enabled: !!partnerId,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (isChannel) {
        return apiRequest(`/api/channels/${partnerId}/messages`, "POST", { content });
      }
      return apiRequest("/api/messages", "POST", { recipientId: partnerId, content });
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey });
      if (!isChannel) queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) sendMutation.mutate(text.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--glass-bg, rgba(5,11,27,0.97))" }}>
      <div className="glass-top-bar flex items-center gap-3 px-4">
        <button onClick={onBack} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C3B6E] to-[#B22234] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {isChannel ? <Hash className="w-4 h-4" /> : partnerName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {isChannel ? `#${partnerName}` : partnerName}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && (
          <div className="text-center text-white/40 text-sm py-8">Loading messages…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center text-white/40 text-sm py-8">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-[#3C3B6E] text-white rounded-br-sm"
                    : "bg-white/10 text-white rounded-bl-sm"
                }`}
              >
                <p className="leading-snug break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/50 text-right" : "text-white/40"}`}>
                  {msg.createdAt ? formatTime(msg.createdAt) : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-white/5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30 h-9 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || sendMutation.isPending}
          className="bg-[#3C3B6E] hover:bg-[#4d4c8a] text-white border-0 h-9 w-9 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

export function MobileMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<"dms" | "channels">("dms");
  const [chat, setChat] = useState<{ id: string; name: string; isChannel: boolean } | null>(null);

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: channels = [], isLoading: chansLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels/user"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  if (chat) {
    return (
      <ChatView
        partnerId={chat.id}
        partnerName={chat.name}
        isChannel={chat.isChannel}
        onBack={() => setChat(null)}
      />
    );
  }

  return (
    <div className="mobile-root" data-testid="mobile-messages-page">
      <MobileTopBar title="MESSAGES" subtitle="DMs & Channels" />

      <div className="flex-1 overflow-y-auto pb-24">
        {!authLoading && !user ? (
          <div className="text-center py-16 px-6 space-y-3">
            <MessageCircle className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-white/70 font-semibold">Sign in to view messages</p>
            <Link href="/auth">
              <Button className="bg-[#3C3B6E] hover:bg-[#4d4c8a] text-white border-0 mt-2">
                Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex border-b border-white/10 sticky top-0 z-10 bg-[rgba(5,11,27,0.9)] backdrop-blur-sm">
              <button
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  tab === "dms" ? "text-white border-b-2 border-[#3C3B6E]" : "text-white/50"
                }`}
                onClick={() => setTab("dms")}
              >
                <MessageCircle className="w-4 h-4" />
                Direct Messages
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  tab === "channels" ? "text-white border-b-2 border-[#3C3B6E]" : "text-white/50"
                }`}
                onClick={() => setTab("channels")}
              >
                <Hash className="w-4 h-4" />
                Channels
              </button>
            </div>

            {tab === "dms" && (
              <div className="divide-y divide-white/5">
                {convsLoading && (
                  <div className="space-y-0">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3.5 w-1/3 rounded" />
                          <div className="skeleton h-3 w-2/3 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!convsLoading && conversations.length === 0 && (
                  <div className="text-center py-14 px-6 space-y-2 text-white/50">
                    <MessageCircle className="w-10 h-10 mx-auto text-white/20" />
                    <p className="text-sm">No direct messages yet</p>
                    <p className="text-xs">Start a conversation from someone's profile</p>
                  </div>
                )}
                {conversations.map((conv) => {
                  const name = getDisplayName(conv.partner.firstName, conv.partner.lastName, conv.partner.username);
                  const initials = getInitials(conv.partner.firstName, conv.partner.lastName, conv.partner.username);
                  return (
                    <button
                      key={conv.partnerId}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                      onClick={() => setChat({ id: conv.partnerId, name, isChannel: false })}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3C3B6E] to-[#B22234] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold truncate ${!conv.isRead && conv.lastSenderId !== user?.id ? "text-white" : "text-white/80"}`}>
                            {name}
                          </p>
                          <span className="text-[10px] text-white/40 flex-shrink-0 ml-2">
                            {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : ""}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${!conv.isRead && conv.lastSenderId !== user?.id ? "text-white/80 font-medium" : "text-white/40"}`}>
                          {conv.lastMessageContent}
                        </p>
                      </div>
                      {!conv.isRead && conv.lastSenderId !== user?.id && (
                        <div className="w-2 h-2 rounded-full bg-[#3C3B6E] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "channels" && (
              <div className="divide-y divide-white/5">
                {chansLoading && (
                  <div className="space-y-0">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3.5 w-1/4 rounded" />
                          <div className="skeleton h-3 w-1/2 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!chansLoading && channels.length === 0 && (
                  <div className="text-center py-14 px-6 space-y-2 text-white/50">
                    <Hash className="w-10 h-10 mx-auto text-white/20" />
                    <p className="text-sm">No channels yet</p>
                    <p className="text-xs">Join or create channels from the desktop app</p>
                  </div>
                )}
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                    onClick={() => setChat({ id: ch.id, name: ch.name, isChannel: true })}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0 border border-white/20">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white/90 truncate">
                          #{ch.name}
                        </p>
                        {ch.type === "private" ? (
                          <Lock className="w-3 h-3 text-white/40 flex-shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-white/40 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ch.memberCount != null && (
                          <span className="text-xs text-white/40">{ch.memberCount} members</span>
                        )}
                        {ch.lastMessageAt && (
                          <span className="text-xs text-white/30">· {formatDistanceToNow(new Date(ch.lastMessageAt), { addSuffix: true })}</span>
                        )}
                      </div>
                      {ch.description && (
                        <p className="text-xs text-white/40 truncate mt-0.5">{ch.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
