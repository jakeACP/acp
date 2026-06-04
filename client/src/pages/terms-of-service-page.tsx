import { Navigation } from "@/components/navigation";
import { ScrollText, ShieldAlert, Users, FileText, DollarSign, Bot, Gavel, Mail } from "lucide-react";

const EFFECTIVE_DATE = "June 4, 2025";
const CONTACT_EMAIL = "legal@anticorruptionparty.us";
const WEBSITE = "https://anticorruptionparty.us";

type SectionProps = { id: string; title: string; icon?: React.ElementType; children: React.ReactNode };

function Section({ id, title, icon: Icon, children }: SectionProps) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <div className="flex items-center gap-2.5 border-b border-border pb-2">
        {Icon && <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />}
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pl-1">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 pl-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

const TOC = [
  { id: "mission", label: "1. Mission of the Platform" },
  { id: "eligibility", label: "2. Eligibility" },
  { id: "accounts", label: "3. Account Responsibilities" },
  { id: "content", label: "4. User Content" },
  { id: "prohibited", label: "5. Prohibited Conduct" },
  { id: "transparency", label: "6. Political Transparency" },
  { id: "polls", label: "7. Polls, Petitions & Voting" },
  { id: "data-accuracy", label: "8. Data Accuracy Disclaimer" },
  { id: "candidates", label: "9. Candidate Profiles" },
  { id: "donations", label: "10. Donations & Contributions" },
  { id: "ai", label: "11. Artificial Intelligence" },
  { id: "moderation", label: "12. Moderation" },
  { id: "privacy", label: "13. Privacy" },
  { id: "ip", label: "14. Intellectual Property" },
  { id: "availability", label: "15. Platform Availability" },
  { id: "warranties", label: "16. Disclaimer of Warranties" },
  { id: "liability", label: "17. Limitation of Liability" },
  { id: "indemnification", label: "18. Indemnification" },
  { id: "termination", label: "19. Termination" },
  { id: "changes", label: "20. Changes to These Terms" },
  { id: "governing-law", label: "21. Governing Law" },
  { id: "contact", label: "22. Contact Information" },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-3">
            <ScrollText className="h-9 w-9 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            <strong>Anti-Corruption Party (ACP)</strong> — Effective Date: {EFFECTIVE_DATE}
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Welcome to the Anti-Corruption Party platform. These Terms of Service govern your access to
            and use of our website, applications, and services (collectively, the "Platform"). By creating
            an account or using the Platform, you agree to be bound by these Terms.
          </p>
          {/* Data accuracy callout */}
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3 mt-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Data Accuracy Notice:</strong> ACP aggregates data from public records, third-party
              sources, and user contributions. We do not guarantee that any data on the Platform is accurate,
              complete, or current. See Section 8 for the full disclaimer.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of contents — sticky sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-6 bg-muted/40 rounded-lg border border-border p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contents</p>
              {TOC.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs text-muted-foreground hover:text-foreground hover:underline py-0.5 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </aside>

          {/* Body */}
          <div className="flex-1 space-y-10">

            <Section id="mission" title="1. Mission of the Platform" icon={FileText}>
              <p>ACP is a civic engagement platform designed to help citizens:</p>
              <BulletList items={[
                "Discuss public issues and share information",
                "Participate in polls, petitions, and ranked-choice voting",
                "Organize events and community groups",
                "Support candidates and causes aligned with anti-corruption values",
                "Promote government transparency and accountability",
                "Encourage democratic participation at all levels",
              ]} />
              <p>
                ACP does not endorse any political ideology, party, candidate, religion, or movement
                except for its core mission of reducing corruption and increasing transparency in government.
              </p>
            </Section>

            <Section id="eligibility" title="2. Eligibility" icon={Users}>
              <p>To use the Platform, you must:</p>
              <BulletList items={[
                "Be at least 13 years old",
                "Comply with all applicable laws",
                "Provide accurate registration information",
                "Not be prohibited from using online services under applicable law",
              ]} />
              <p>
                Certain features — including voting verification, candidate registration, and fundraising —
                may require additional age, identity, or address verification.
              </p>
            </Section>

            <Section id="accounts" title="3. Account Responsibilities">
              <p>You are responsible for maintaining the security of your account, protecting your
                credentials, and all activity that occurs under your account.</p>
              <p>You may <strong>not</strong>:</p>
              <BulletList items={[
                "Impersonate another person or create fake identities",
                "Create accounts for automated manipulation or spam",
                "Circumvent account restrictions or bans",
                "Share your account credentials with others",
                "Register multiple accounts to evade enforcement actions",
              ]} />
              <p>ACP reserves the right to suspend or terminate accounts that violate these Terms.</p>
            </Section>

            <Section id="content" title="4. User Content" icon={FileText}>
              <p>
                You retain ownership of content you submit, including posts, comments, videos, images,
                polls, petitions, messages, and group content.
              </p>
              <p>
                By posting content, you grant ACP a worldwide, non-exclusive license to display, distribute,
                store, and process your content solely for operating and improving the Platform.
              </p>
              <p>You represent that:</p>
              <BulletList items={[
                "You own the content or have permission to post it",
                "The content does not violate any laws",
                "The content does not infringe intellectual property rights of others",
              ]} />
            </Section>

            <Section id="prohibited" title="5. Prohibited Conduct">
              <p>Users may <strong>not</strong>:</p>
              <BulletList items={[
                "Harass, threaten, or intimidate other users",
                "Promote violence, terrorism, or illegal activity",
                "Publish child exploitation material of any kind",
                "Share malware, viruses, or malicious code",
                "Engage in fraud or deceptive practices",
                "Manipulate voting or polling systems",
                "Interfere with Platform operations or circumvent security measures",
                "Use automated systems to artificially influence engagement, polls, or elections",
                "Doxx or expose private information about other individuals",
              ]} />
              <p>ACP may remove content or restrict accounts at its sole discretion.</p>
            </Section>

            <Section id="transparency" title="6. Political Transparency">
              <p>ACP exists to promote transparency and accountability in public life.</p>
              <p>Users may <strong>not</strong>:</p>
              <BulletList items={[
                "Misrepresent campaign finance information",
                "Falsify endorsements or election results",
                "Manipulate constituent feedback systems",
                "Create fake political organizations for deceptive purposes",
                "Impersonate elected officials or candidates",
              ]} />
              <p>
                Candidates and organizations using ACP tools agree to provide truthful information
                regarding their identity and public activities.
              </p>
            </Section>

            <Section id="polls" title="7. Polls, Petitions & Voting" icon={Gavel}>
              <p>
                Polls, petitions, and voting mechanisms on ACP are <strong>informational tools</strong> unless
                explicitly designated otherwise.
              </p>
              <p>ACP does <strong>not</strong> guarantee:</p>
              <BulletList items={[
                "Legal recognition of votes or petition signatures",
                "Election certification by any government body",
                "Government adoption of poll results",
              ]} />
              <p>
                ACP reserves the right to audit, remove, or invalidate activity believed to be fraudulent
                or manipulated. Ranked-choice and blockchain-verified votes are for informational and
                community governance purposes only.
              </p>
            </Section>

            <Section id="data-accuracy" title="8. Data Accuracy Disclaimer" icon={ShieldAlert}>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  ACP is not responsible for inaccurate data.
                </p>
                <p>
                  The Platform displays information drawn from public records, government databases,
                  third-party data providers (including the FEC, OpenSecrets, Quiver Quantitative, and
                  others), and user contributions. This data is provided for informational and civic
                  engagement purposes only.
                </p>
              </div>
              <p>ACP makes <strong>no warranties</strong> that information on the Platform is:</p>
              <BulletList items={[
                "Accurate, complete, or current",
                "Free from errors, omissions, or outdated records",
                "Representative of real-world financial, electoral, or legislative outcomes",
                "Suitable for use in legal, financial, or political decision-making",
              ]} />
              <p>
                Corruption grades, influence scores, campaign finance figures, candidate profiles, and
                lobbying data are <strong>estimates and community-sourced assessments</strong> — they are
                not official government ratings or legal determinations.
              </p>
              <p>
                <strong>You use all data on the Platform at your own risk.</strong> ACP, its officers,
                volunteers, and partners shall not be liable for any harm resulting from reliance on
                data displayed on the Platform.
              </p>
              <p>
                If you believe data is materially inaccurate, please contact us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                and we will review the report on a good-faith basis.
              </p>
            </Section>

            <Section id="candidates" title="9. Candidate Profiles">
              <p>
                Candidates and public officials may create or claim profiles on ACP. ACP may verify
                identities, request documentation, and display publicly available campaign finance data
                obtained from public records.
              </p>
              <p>ACP does <strong>not</strong> guarantee endorsement, certification, or electoral success
                by displaying a candidate profile on the Platform.</p>
            </Section>

            <Section id="donations" title="10. Donations & Contributions" icon={DollarSign}>
              <p>
                ACP may facilitate donations, memberships, subscriptions, fundraising campaigns, or
                political contributions. Users are responsible for complying with all applicable election,
                campaign finance, tax, and fundraising laws.
              </p>
              <p>ACP reserves the right to reject contributions, issue refunds, suspend fundraising
                activities, or verify donor identity. All payments are subject to the terms of the
                applicable payment processor (e.g., Stripe).</p>
            </Section>

            <Section id="ai" title="11. Artificial Intelligence Features" icon={Bot}>
              <p>ACP may offer AI-powered tools including content suggestions, analysis, and automated agents.</p>
              <p>AI-generated content:</p>
              <BulletList items={[
                "May be inaccurate, incomplete, or misleading",
                "Should not be considered legal, financial, medical, or professional advice",
                "Reflects algorithmic outputs and not official ACP positions",
                "Is subject to the same data accuracy limitations described in Section 8",
              ]} />
              <p>Users remain solely responsible for content created or published using AI tools.</p>
            </Section>

            <Section id="moderation" title="12. Moderation">
              <p>ACP seeks to balance free expression with community safety. ACP may remove content,
                restrict visibility, suspend accounts, or permanently ban users for conduct including
                (but not limited to): spam, fraud, manipulation, harassment, threats, doxxing,
                or other activity that harms Platform integrity.</p>
              <p>ACP is not obligated to host any particular content or maintain access for any particular user.</p>
            </Section>

            <Section id="privacy" title="13. Privacy">
              <p>
                Use of ACP is also governed by our Privacy Policy. By using the Platform, you consent
                to the collection, processing, and storage of information as described in the Privacy Policy.
              </p>
            </Section>

            <Section id="ip" title="14. Intellectual Property">
              <p>
                The ACP name, logos, branding, software, designs, and Platform features are protected
                by applicable intellectual property laws. Users may not copy ACP software, reverse
                engineer proprietary systems, or use ACP trademarks without permission.
              </p>
            </Section>

            <Section id="availability" title="15. Platform Availability">
              <p>
                ACP may modify, suspend, or discontinue any portion of the Platform at any time without
                notice. ACP does not guarantee continuous availability, error-free operation, or permanent
                access to content. You should maintain copies of any important information you store on
                the Platform.
              </p>
            </Section>

            <Section id="warranties" title="16. Disclaimer of Warranties">
              <div className="bg-muted rounded-lg px-4 py-3">
                <p>
                  The Platform is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE."</strong> ACP
                  disclaims all warranties, express or implied, including warranties of merchantability,
                  fitness for a particular purpose, non-infringement, and accuracy of information.
                  Your use of the Platform is at your own risk.
                </p>
              </div>
            </Section>

            <Section id="liability" title="17. Limitation of Liability">
              <p>
                To the fullest extent permitted by law, ACP and its officers, volunteers, employees,
                affiliates, and partners shall not be liable for indirect, consequential, incidental,
                special, or punitive damages, including lost profits, lost data, or reputational harm,
                arising from your use of the Platform.
              </p>
              <p>
                ACP's total liability shall not exceed the amount paid by the user to ACP during the
                twelve months preceding the claim.
              </p>
            </Section>

            <Section id="indemnification" title="18. Indemnification">
              <p>
                You agree to indemnify and hold harmless ACP from any claims, liabilities, damages,
                losses, and expenses (including reasonable legal fees) arising from your use of the
                Platform, your content, your violation of these Terms, or your violation of applicable laws.
              </p>
            </Section>

            <Section id="termination" title="19. Termination">
              <p>
                ACP may terminate or suspend accounts at any time for violations of these Terms or
                conduct harmful to the Platform or its community. Users may delete their accounts at
                any time via account settings. Certain information may be retained as required by law
                or for legitimate operational purposes.
              </p>
            </Section>

            <Section id="changes" title="20. Changes to These Terms">
              <p>
                ACP may update these Terms periodically. We will notify users of material changes by
                posting a notice on the Platform. Continued use of the Platform after changes become
                effective constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section id="governing-law" title="21. Governing Law" icon={Gavel}>
              <p>
                These Terms shall be governed by the laws of the State of Minnesota, without regard to
                conflict-of-law principles. Any disputes shall be resolved in the state or federal courts
                located in Minnesota.
              </p>
            </Section>

            <Section id="contact" title="22. Contact Information" icon={Mail}>
              <p><strong>Anti-Corruption Party (ACP)</strong></p>
              <p>
                Website:{" "}
                <a href={WEBSITE} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline">
                  {WEBSITE}
                </a>
              </p>
              <p>
                Email:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}
                  className="text-blue-600 dark:text-blue-400 underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </Section>

            {/* Footer acknowledgement */}
            <div className="bg-muted/50 border border-border rounded-lg px-5 py-4 text-sm text-muted-foreground">
              By using ACP, you acknowledge that you have read, understood, and agreed to these Terms of Service.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
