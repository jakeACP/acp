import { useLocation } from "wouter";
import { ChevronLeft, ExternalLink, Mail, MessageCircle, FileText, Shield, Book, ChevronRight } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

const LINKS = [
  { icon: Book,          label: "FAQ",                  sub: "Frequently asked questions",        href: "/faq" },
  { icon: Mail,          label: "Contact Support",      sub: "support@acpdemocracy.org",          href: "mailto:support@acpdemocracy.org" },
  { icon: MessageCircle, label: "Community Forum",      sub: "Ask other citizens for help",       href: "/groups" },
  { icon: FileText,      label: "Terms of Service",     sub: "Legal terms and conditions",         href: "/terms" },
  { icon: Shield,        label: "Privacy Policy",       sub: "How we protect your data",           href: "/privacy" },
  { icon: FileText,      label: "Community Guidelines", sub: "Rules for respectful participation", href: "/guidelines" },
];

export function MobileSettingsHelpPage() {
  const [, navigate] = useLocation();

  return (
    <div className="mobile-root" data-testid="settings-help-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Help & Support</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        <div className="glass-card p-5 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(59,91,169,0.2)" }}>
            <MessageCircle className="w-8 h-8" style={{ color: "#93c5fd" }} />
          </div>
          <p className="text-white font-semibold text-base">How can we help?</p>
          <p className="text-white/45 text-sm mt-1">
            Find answers to common questions or reach our support team directly.
          </p>
        </div>

        <div className="glass-card p-4">
          {LINKS.map(({ icon: Icon, label, sub, href }) => (
            <a key={label} href={href}
              target={href.startsWith("/") ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-3.5 active:opacity-70">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <Icon className="w-5 h-5 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-white/35 text-xs mt-0.5">{sub}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-white/20 flex-shrink-0" />
            </a>
          ))}
        </div>

        <p className="text-white/20 text-xs text-center">ACP Democracy · Built for civic transparency</p>
      </div>

      <MobileBottomNav />
    </div>
  );
}
