import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  Search, User, Building2, BookOpen, Lightbulb, HandshakeIcon, Award,
  ClipboardList, Pencil,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia",
];

const JURISDICTION_LEVELS = ["Federal","State","County","City/Township","Special District"];
const OFFICE_TITLES = [
  "U.S. Senator","U.S. Representative","Governor","Lieutenant Governor",
  "State Senator","State Representative","Attorney General","Secretary of State",
  "Treasurer","Auditor","Mayor","City Council Member","County Commissioner",
  "Sheriff","Judge","School Board Member","Other",
];
const PARTIES = [
  "Anti-Corruption Party","Democratic","Republican","Green","Libertarian","Independent","Other",
];
const POLICY_TOPICS = [
  "Economy","Healthcare","Climate & Environment","Education","Public Safety",
  "Housing","Veterans","Immigration","Infrastructure","Criminal Justice Reform",
  "Campaign Finance Reform","Other",
];
const ACP_PLEDGES = [
  "I will not accept money from corporate PACs, Super PACs, or dark-money groups.",
  "I will not accept money from registered federal or state lobbyists.",
  "I will publicly disclose all campaign donors and bundlers raising $10,000 or more.",
  "I commit to full financial transparency including personal financial disclosures.",
  "I support term-limits legislation to end career politicians.",
  "I will hold regular open town halls accessible to all constituents without press restrictions.",
  "I will co-sponsor or vote in support of campaign finance reform legislation.",
];
const ELECTION_YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));

const TOTAL_STEPS = 8;
const STEP_LABELS = [
  "Duplicate Check",
  "Account Info",
  "Office & Campaign",
  "Your Story",
  "Policy Platform",
  "ACP Pledge",
  "Endorsements",
  "Review & Submit",
];

// ─── Schemas ─────────────────────────────────────────────────────────────────
const duplicateSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  state: z.string().optional(),
});

const accountSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const officeSchema = z.object({
  officeTitle: z.string().min(1, "Required"),
  customOfficeTitle: z.string().optional(),
  jurisdictionLevel: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  district: z.string().optional(),
  party: z.string().optional(),
  electionYear: z.string().min(1, "Required"),
  campaignWebsite: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  campaignSlogan: z.string().max(140).optional(),
});

const storySchema = z.object({
  whyRunning: z.string().min(20, "At least 20 characters required"),
  biography: z.string().min(100, "Biography must be at least 100 characters"),
  professionalBackground: z.string().optional(),
  politicalHistory: z.string().optional(),
});

const policyItemSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  description: z.string().min(10, "At least 10 characters required"),
});

type AccountInfo = z.infer<typeof accountSchema>;
type DuplicateInfo = z.infer<typeof duplicateSchema>;
type OfficeDetails = z.infer<typeof officeSchema>;
type YourStory = z.infer<typeof storySchema>;
type PolicyItem = z.infer<typeof policyItemSchema>;

interface DuplicateMatch {
  id: string;
  fullName: string;
  party?: string;
  photoUrl?: string;
  profileType?: string;
  handle?: string;
  office?: string;
  officeAddress?: string;
}

interface Sig {
  id: string;
  name: string;
  category?: string;
  tag?: string;
  isAce?: boolean;
  sentiment?: string;
}

interface SubmitResponse {
  candidateId?: string;
  politicianId?: string;
}

// ─── Progress Header ─────────────────────────────────────────────────────────
function StepProgress({ step, onGoTo }: { step: number; onGoTo?: (s: number) => void }) {
  const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Step {step + 1} of {TOTAL_STEPS}: <span className="text-foreground">{STEP_LABELS[step]}</span>
        </span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="hidden md:flex justify-between mt-3 gap-1">
        {STEP_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => onGoTo && i < step && onGoTo(i)}
            className={`text-xs px-1 text-center flex-1 transition-colors ${
              i === step
                ? "text-primary font-semibold"
                : i < step
                ? "text-green-600 dark:text-green-400 cursor-pointer hover:underline"
                : "text-muted-foreground"
            }`}
          >
            {i < step ? "✓" : label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 0: Duplicate Check ──────────────────────────────────────────────────
function StepDuplicateCheck({
  defaultValues,
  onNext,
  onMatchSelected,
}: {
  defaultValues: Partial<DuplicateInfo>;
  onNext: (matchId: string | null, searchedName: string) => void;
  onMatchSelected: (id: string | null) => void;
}) {
  const form = useForm<DuplicateInfo>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { fullName: "", state: "", ...defaultValues },
  });

  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<DuplicateMatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async (data: DuplicateInfo) => {
    setLoading(true);
    setSelected(null);
    onMatchSelected(null);
    try {
      const params = new URLSearchParams({ name: data.fullName });
      if (data.state) params.set("state", data.state);
      const res = await fetch(`/api/run-for-office/check-duplicate?${params}`, { credentials: "include" });
      const json = await res.json();
      setResults(Array.isArray(json) ? json : []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const name = form.getValues("fullName");
    onNext(selected, name);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <Search className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Profile Duplicate Check</h3>
          <p className="text-sm text-muted-foreground">
            We'll search existing politician profiles by your name and state to avoid creating a duplicate. If a match exists, you can link your candidacy to it.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(doSearch)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Full Legal Name *</FormLabel>
                <FormControl><Input placeholder="Jane Marie Smith" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State (optional — narrows results)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Any state" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search Existing Profiles
          </Button>
        </form>
      </Form>

      {searched && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          {results.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">No existing profiles found — we'll create a new one for you.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Possible matches found. Select "This is me" if applicable, or continue to create a new profile.</p>
              </div>
              <div className="space-y-2">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      const next = selected === r.id ? null : r.id;
                      setSelected(next);
                      onMatchSelected(next);
                    }}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      selected === r.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.fullName} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.party, r.profileType, r.handle ? `@${r.handle}` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {selected === r.id
                      ? <Badge variant="default" className="shrink-0">This is me</Badge>
                      : <span className="text-xs text-muted-foreground shrink-0">Select</span>
                    }
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {selected
              ? "You've selected an existing profile. We'll link your candidacy to it."
              : "No match selected — a new profile will be created."}
          </p>
        </div>
      )}

      <div className="pt-2">
        <Button
          className="w-full"
          disabled={!searched}
          onClick={handleNext}
        >
          {!searched ? "Search First to Continue" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        {!searched && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            You must search before proceeding, even if you plan to create a new profile.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Account Info ─────────────────────────────────────────────────────
function StepAccount({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<AccountInfo>;
  onNext: (data: AccountInfo) => void;
  onBack: () => void;
}) {
  const form = useForm<AccountInfo>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", state: "", city: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Account Information</h3>
            <p className="text-sm text-muted-foreground">Pre-filled from your account where available. Update as needed.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl><Input placeholder="Jane" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl><Input placeholder="Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Email *</FormLabel>
            <FormControl><Input type="email" placeholder="jane@smithforsenate.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone (optional)</FormLabel>
            <FormControl><Input type="tel" placeholder="(555) 000-0000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="state" render={({ field }) => (
            <FormItem>
              <FormLabel>Home State</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City / Town</FormLabel>
              <FormControl><Input placeholder="Springfield" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="avatarUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Headshot / Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
            <FormControl>
              <Input type="url" placeholder="https://example.com/your-photo.jpg" {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Paste a direct link to a professional headshot. You can upload a photo after account creation.
            </p>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          <Button type="submit" className="flex-1">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Step 2: Office & Campaign ────────────────────────────────────────────────
function StepOffice({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<OfficeDetails>;
  onNext: (data: OfficeDetails) => void;
  onBack: () => void;
}) {
  const form = useForm<OfficeDetails>({
    resolver: zodResolver(officeSchema),
    defaultValues: {
      officeTitle: "", customOfficeTitle: "", jurisdictionLevel: "",
      state: "", district: "", party: "",
      electionYear: String(new Date().getFullYear() + 1),
      campaignWebsite: "", campaignSlogan: "",
      ...defaultValues,
    },
  });
  const officeTitle = form.watch("officeTitle");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Office & Campaign Details</h3>
            <p className="text-sm text-muted-foreground">Tell us what office you're seeking and your campaign basics.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="officeTitle" render={({ field }) => (
            <FormItem>
              <FormLabel>Office Sought *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select office…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {OFFICE_TITLES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          {officeTitle === "Other" && (
            <FormField control={form.control} name="customOfficeTitle" render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Office *</FormLabel>
                <FormControl><Input placeholder="e.g. Water District Director" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
          <FormField control={form.control} name="jurisdictionLevel" render={({ field }) => (
            <FormItem>
              <FormLabel>Jurisdiction Level *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select level…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {JURISDICTION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="state" render={({ field }) => (
            <FormItem>
              <FormLabel>State *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="district" render={({ field }) => (
            <FormItem>
              <FormLabel>District / County (optional)</FormLabel>
              <FormControl><Input placeholder="e.g. District 14" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="party" render={({ field }) => (
            <FormItem>
              <FormLabel>Party Affiliation</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select party…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {PARTIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="electionYear" render={({ field }) => (
            <FormItem>
              <FormLabel>Election Year *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select year…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {ELECTION_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="campaignWebsite" render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Website (optional)</FormLabel>
            <FormControl><Input type="url" placeholder="https://smithforsenate.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="campaignSlogan" render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Slogan (optional)</FormLabel>
            <FormControl><Input placeholder="Fighting corruption, one vote at a time." maxLength={140} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          <Button type="submit" className="flex-1">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Step 3: Your Story ───────────────────────────────────────────────────────
function StepStory({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<YourStory>;
  onNext: (data: YourStory) => void;
  onBack: () => void;
}) {
  const form = useForm<YourStory>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      whyRunning: "", biography: "", professionalBackground: "", politicalHistory: "",
      ...defaultValues,
    },
  });
  const bioValue = form.watch("biography") || "";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Your Story</h3>
            <p className="text-sm text-muted-foreground">Help voters understand who you are and why you're running.</p>
          </div>
        </div>
        <FormField control={form.control} name="biography" render={({ field }) => (
          <FormItem>
            <FormLabel>Biography * <span className="text-muted-foreground font-normal">(min 100 characters)</span></FormLabel>
            <FormControl>
              <Textarea
                placeholder="Born and raised in Springfield, I have spent the last 15 years working as a public school teacher and community organizer…"
                className="min-h-[120px]"
                {...field}
              />
            </FormControl>
            <div className="flex justify-between">
              <FormMessage />
              <span className={`text-xs ml-auto ${bioValue.length < 100 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}>
                {bioValue.length}/100+
              </span>
            </div>
          </FormItem>
        )} />
        <FormField control={form.control} name="whyRunning" render={({ field }) => (
          <FormItem>
            <FormLabel>Why Are You Running? *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="I'm running because our community deserves honest representation that puts people over corporations…"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="professionalBackground" render={({ field }) => (
          <FormItem>
            <FormLabel>Professional Background (optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="10 years as a small business owner, former union organizer…"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="politicalHistory" render={({ field }) => (
          <FormItem>
            <FormLabel>Political History / Prior Offices (optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Served on the City Planning Commission 2018–2022; ran for State Senate in 2020…"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          <Button type="submit" className="flex-1">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Step 4: Policy Platform ──────────────────────────────────────────────────
const MIN_POLICIES = 5;

function StepPolicy({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: PolicyItem[];
  onNext: (data: PolicyItem[]) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<PolicyItem[]>(
    defaultValues.length >= MIN_POLICIES
      ? defaultValues
      : Array.from({ length: MIN_POLICIES }, (_, i) => defaultValues[i] || { topic: "", description: "" })
  );
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  const validate = () => {
    if (items.length < MIN_POLICIES) {
      alert(`Please add at least ${MIN_POLICIES} policy positions.`);
      return false;
    }
    const errs: Record<number, Record<string, string>> = {};
    items.forEach((item, i) => {
      const result = policyItemSchema.safeParse(item);
      if (!result.success) {
        errs[i] = {};
        for (const e of result.error.errors) {
          errs[i][e.path[0] as string] = e.message;
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const update = (i: number, field: keyof PolicyItem, val: string) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Policy Platform</h3>
          <p className="text-sm text-muted-foreground">
            Add at least {MIN_POLICIES} key policy positions. Choose a topic label and describe your stance.
          </p>
        </div>
      </div>

      {items.length < MIN_POLICIES && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">Minimum {MIN_POLICIES} policy positions required.</p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Policy Position {i + 1}</span>
              {items.length > MIN_POLICIES && (
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  className="text-destructive hover:text-destructive h-7"
                >
                  Remove
                </Button>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Topic *</label>
              <Select value={item.topic} onValueChange={(v) => update(i, "topic", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select topic…" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors[i]?.topic && <p className="text-sm text-destructive mt-1">{errors[i].topic}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Your Position *</label>
              <Textarea
                placeholder="Describe your stance and what you'll do if elected…"
                value={item.description}
                onChange={(e) => update(i, "description", e.target.value)}
                className="mt-1 min-h-[80px]"
              />
              {errors[i]?.description && <p className="text-sm text-destructive mt-1">{errors[i].description}</p>}
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button" variant="outline" onClick={() => setItems((p) => [...p, { topic: "", description: "" }])}
        className="w-full"
      >
        + Add Another Policy Position
      </Button>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Button className="flex-1" onClick={() => { if (validate()) onNext(items); }}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: ACP Pledge ───────────────────────────────────────────────────────
function StepAcpPledge({
  defaultChecked,
  defaultVideoUrl,
  onNext,
  onBack,
}: {
  defaultChecked: boolean[];
  defaultVideoUrl: string;
  onNext: (checked: boolean[], videoUrl: string) => void;
  onBack: () => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(
    ACP_PLEDGES.map((_, i) => defaultChecked[i] ?? false)
  );
  const [videoUrl, setVideoUrl] = useState(defaultVideoUrl || "");
  const [videoError, setVideoError] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => idx === i ? !v : v));

  const handleNext = () => {
    setTriedSubmit(true);
    if (!allChecked) return;
    if (videoUrl && !videoUrl.startsWith("http")) {
      setVideoError("Must be a valid URL");
      return;
    }
    setVideoError("");
    onNext(checked, videoUrl);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <Award className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Anti-Corruption Pledge</h3>
          <p className="text-sm text-muted-foreground">
            Check each commitment below. All must be agreed to in order to proceed and earn an ACP badge.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3">
        <p className="text-sm font-semibold text-primary">Check each pledge item to confirm your commitment:</p>
        {ACP_PLEDGES.map((pledge, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
              checked[i] ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : "border-border bg-background"
            }`}
          >
            <Checkbox
              id={`pledge-${i}`}
              checked={checked[i]}
              onCheckedChange={() => toggle(i)}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor={`pledge-${i}`} className="text-sm leading-relaxed cursor-pointer">
              {pledge}
            </label>
          </div>
        ))}
      </div>

      {triedSubmit && !allChecked && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          You must check all pledge items to proceed.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Pledge Video URL <span className="text-muted-foreground font-normal">(optional — required for ACE badge review)</span>
        </label>
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=your-pledge-video"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        {videoError && <p className="text-sm text-destructive">{videoError}</p>}
        <p className="text-xs text-muted-foreground">
          Record a short video of yourself reading this pledge aloud and paste the URL. Submitting a video will trigger an ACE badge review.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Button className="flex-1" onClick={handleNext}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 6: Party Endorsements ───────────────────────────────────────────────
function StepEndorsements({
  defaultSelected,
  onNext,
  onBack,
}: {
  defaultSelected: string[];
  onNext: (sigIds: string[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const [search, setSearch] = useState("");

  const { data: sigs = [], isLoading } = useQuery<Sig[]>({
    queryKey: ["/api/run-for-office/parties-and-sigs"],
  });

  const toggle = (id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = sigs.filter(
    (s) => s.name?.toLowerCase().includes(search.toLowerCase()) ||
           s.category?.toLowerCase().includes(search.toLowerCase()) ||
           s.tag?.toLowerCase().includes(search.toLowerCase())
  );

  const prioritized = [
    ...filtered.filter((s) => s.isAce),
    ...filtered.filter((s) => !s.isAce && s.sentiment === "positive"),
    ...filtered.filter((s) => !s.isAce && s.sentiment !== "positive"),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <HandshakeIcon className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Party & Endorsement Requests</h3>
          <p className="text-sm text-muted-foreground">
            Select organizations you'd like to seek endorsements from. This is optional and can be updated later.
          </p>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg">
          {Array.from(selected).map((id) => {
            const sig = sigs.find((s) => s.id === id);
            return sig ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                {sig.name}
                <button onClick={() => toggle(id)} className="ml-1 hover:text-destructive leading-none">×</button>
              </Badge>
            ) : null;
          })}
        </div>
      )}

      <Input
        placeholder="Search organizations, categories…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {prioritized.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No organizations match your search.</p>
          )}
          {prioritized.map((sig) => (
            <button
              key={sig.id}
              type="button"
              onClick={() => toggle(sig.id)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-md border transition-colors ${
                selected.has(sig.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{sig.name}</p>
                  {sig.isAce && <Badge variant="default" className="text-xs py-0 h-4">ACE</Badge>}
                  {sig.sentiment === "positive" && !sig.isAce && (
                    <Badge variant="secondary" className="text-xs py-0 h-4">{sig.category}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{sig.category}</p>
              </div>
              {selected.has(sig.id) && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Button className="flex-1" onClick={() => onNext(Array.from(selected))}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 7: Review & Submit ──────────────────────────────────────────────────
function StepReview({
  matchedProfileId,
  accountInfo,
  officeDetails,
  yourStory,
  policyPlatform,
  pledgeChecked,
  pledgeVideoUrl,
  endorsementSigIds,
  sigs,
  onGoTo,
  onSubmit,
  isSubmitting,
  onBack,
}: {
  matchedProfileId: string | null;
  accountInfo: Partial<AccountInfo>;
  officeDetails: Partial<OfficeDetails>;
  yourStory: Partial<YourStory>;
  policyPlatform: PolicyItem[];
  pledgeChecked: boolean[];
  pledgeVideoUrl: string;
  endorsementSigIds: string[];
  sigs: Sig[];
  onGoTo: (step: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  onBack: () => void;
}) {
  const sections = [
    {
      label: "Duplicate Check",
      step: 0,
      rows: [
        { label: "Matched Profile", value: matchedProfileId ? `Linked to existing profile (ID: ${matchedProfileId})` : "Creating new profile" },
      ],
    },
    {
      label: "Account Info",
      step: 1,
      rows: [
        { label: "Name", value: `${accountInfo.firstName || ""} ${accountInfo.lastName || ""}`.trim() || "—" },
        { label: "Email", value: accountInfo.email || "—" },
        { label: "Phone", value: accountInfo.phone || "—" },
        { label: "Location", value: [accountInfo.city, accountInfo.state].filter(Boolean).join(", ") || "—" },
      ],
    },
    {
      label: "Office & Campaign",
      step: 2,
      rows: [
        { label: "Office", value: officeDetails.officeTitle === "Other" ? (officeDetails.customOfficeTitle || "—") : (officeDetails.officeTitle || "—") },
        { label: "Jurisdiction", value: officeDetails.jurisdictionLevel || "—" },
        { label: "State", value: officeDetails.state || "—" },
        { label: "District", value: officeDetails.district || "—" },
        { label: "Party", value: officeDetails.party || "—" },
        { label: "Election Year", value: officeDetails.electionYear || "—" },
        { label: "Website", value: officeDetails.campaignWebsite || "—" },
        { label: "Slogan", value: officeDetails.campaignSlogan || "—" },
      ],
    },
    {
      label: "Your Story",
      step: 3,
      rows: [
        { label: "Biography", value: yourStory.biography ? `${yourStory.biography.slice(0, 120)}…` : "—" },
        { label: "Why Running", value: yourStory.whyRunning ? `${yourStory.whyRunning.slice(0, 100)}…` : "—" },
      ],
    },
    {
      label: "Policy Platform",
      step: 4,
      rows: policyPlatform.map((p, i) => ({ label: p.topic || `Policy ${i + 1}`, value: p.description.slice(0, 80) + "…" })),
    },
    {
      label: "ACP Pledge",
      step: 5,
      rows: [
        { label: "All Items Agreed", value: pledgeChecked.every(Boolean) ? "Yes ✓" : "No — go back to complete" },
        { label: "Video URL", value: pledgeVideoUrl || "None provided" },
      ],
    },
    {
      label: "Endorsements Requested",
      step: 6,
      rows: [
        {
          label: "Organizations",
          value: endorsementSigIds.length === 0
            ? "None selected"
            : endorsementSigIds.map((id) => sigs.find((s) => s.id === id)?.name || id).join(", "),
        },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Review & Submit</h3>
          <p className="text-sm text-muted-foreground">Please review all details before submitting your candidacy.</p>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
              <span className="text-sm font-semibold">{section.label}</span>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => onGoTo(section.step)}
                className="h-7 text-xs text-primary"
              >
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            </div>
            <div className="divide-y divide-border">
              {section.rows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
                  <span className="text-muted-foreground font-medium col-span-1">{row.label}</span>
                  <span className="col-span-2 break-words">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
        By submitting, you confirm all information is accurate and you agree to the Anti-Corruption Pledge. Your profile will be pending admin review before full activation.
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
            : <>Submit My Candidacy <ChevronRight className="ml-2 h-4 w-4" /></>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RunForOfficePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [step, setStep] = useState(0);

  // Step data
  const [matchedProfileId, setMatchedProfileId] = useState<string | null>(null);
  const [searchedName, setSearchedName] = useState("");
  const [accountInfo, setAccountInfo] = useState<Partial<AccountInfo>>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });
  const [officeDetails, setOfficeDetails] = useState<Partial<OfficeDetails>>({});
  const [yourStory, setYourStory] = useState<Partial<YourStory>>({});
  const [policyPlatform, setPolicyPlatform] = useState<PolicyItem[]>([]);
  const [pledgeChecked, setPledgeChecked] = useState<boolean[]>(ACP_PLEDGES.map(() => false));
  const [pledgeVideoUrl, setPledgeVideoUrl] = useState("");
  const [endorsementSigIds, setEndorsementSigIds] = useState<string[]>([]);

  const { data: sigs = [] } = useQuery<Sig[]>({
    queryKey: ["/api/run-for-office/parties-and-sigs"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/run-for-office/submit", {
        matchedProfileId,
        accountInfo,
        officeDetails,
        yourStory,
        policyPlatform,
        acpPledge: { videoUrl: pledgeVideoUrl, pledgeChecked },
        endorsementSigIds,
      });
      return res.json();
    },
    onSuccess: async (data: SubmitResponse) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Candidacy Submitted!",
        description: "Your candidacy has been submitted and is pending review.",
      });
      if (data?.candidateId) {
        navigate(`/candidates/${data.candidateId}`);
      } else if (data?.politicianId) {
        navigate(`/politicians/${data.politicianId}`);
      } else {
        navigate("/profile");
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (s: number) => setStep(s);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Run For Office</h1>
          <p className="text-muted-foreground mt-1">
            Complete all steps to announce your candidacy on the Anti-Corruption Party platform.
          </p>
        </div>

        <StepProgress step={step} onGoTo={goTo} />

        <Card className="shadow-sm">
          <CardContent className="p-6 sm:p-8">
            {step === 0 && (
              <StepDuplicateCheck
                defaultValues={{ fullName: searchedName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }}
                onNext={(matchId, name) => {
                  setMatchedProfileId(matchId);
                  setSearchedName(name);
                  goNext();
                }}
                onMatchSelected={setMatchedProfileId}
              />
            )}

            {step === 1 && (
              <StepAccount
                defaultValues={accountInfo}
                onNext={(data) => { setAccountInfo(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {step === 2 && (
              <StepOffice
                defaultValues={officeDetails}
                onNext={(data) => { setOfficeDetails(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {step === 3 && (
              <StepStory
                defaultValues={yourStory}
                onNext={(data) => { setYourStory(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {step === 4 && (
              <StepPolicy
                defaultValues={policyPlatform}
                onNext={(data) => { setPolicyPlatform(data); goNext(); }}
                onBack={goBack}
              />
            )}

            {step === 5 && (
              <StepAcpPledge
                defaultChecked={pledgeChecked}
                defaultVideoUrl={pledgeVideoUrl}
                onNext={(checked, url) => {
                  setPledgeChecked(checked);
                  setPledgeVideoUrl(url);
                  goNext();
                }}
                onBack={goBack}
              />
            )}

            {step === 6 && (
              <StepEndorsements
                defaultSelected={endorsementSigIds}
                onNext={(ids) => { setEndorsementSigIds(ids); goNext(); }}
                onBack={goBack}
              />
            )}

            {step === 7 && (
              <StepReview
                matchedProfileId={matchedProfileId}
                accountInfo={accountInfo}
                officeDetails={officeDetails}
                yourStory={yourStory}
                policyPlatform={policyPlatform}
                pledgeChecked={pledgeChecked}
                pledgeVideoUrl={pledgeVideoUrl}
                endorsementSigIds={endorsementSigIds}
                sigs={sigs}
                onGoTo={goTo}
                onSubmit={() => submitMutation.mutate()}
                isSubmitting={submitMutation.isPending}
                onBack={goBack}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
