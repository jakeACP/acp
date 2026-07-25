import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Compass, ChevronLeft, ChevronRight, RotateCcw, Share2,
  Check, Info, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  COMPASS_QUESTIONS, LIKERT_OPTIONS, QUADRANT_INFO,
} from "@/lib/political-compass-config";
import {
  calculateScores, getQuadrant, getResultSummary, formatScore,
} from "@/lib/political-compass-scoring";
import { CompassChart } from "@/components/compass-chart";

type Screen = "intro" | "quiz" | "results";

// ─── LIKERT BUTTON ────────────────────────────────────────────────────────────
function LikertButton({
  value, label, selected, onClick,
}: { value: number; label: string; selected: boolean; onClick: () => void }) {
  const colors = {
    "-2": "hover:border-red-400 hover:bg-red-500/10 data-[selected=true]:border-red-400 data-[selected=true]:bg-red-500/20 data-[selected=true]:text-red-300",
    "-1": "hover:border-orange-400 hover:bg-orange-500/10 data-[selected=true]:border-orange-400 data-[selected=true]:bg-orange-500/20 data-[selected=true]:text-orange-300",
    "0":  "hover:border-slate-400 hover:bg-slate-500/10 data-[selected=true]:border-slate-400 data-[selected=true]:bg-slate-500/20 data-[selected=true]:text-slate-200",
    "1":  "hover:border-blue-400 hover:bg-blue-500/10 data-[selected=true]:border-blue-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-300",
    "2":  "hover:border-green-400 hover:bg-green-500/10 data-[selected=true]:border-green-400 data-[selected=true]:bg-green-500/20 data-[selected=true]:text-green-300",
  }[String(value)] ?? "";

  return (
    <button
      data-selected={selected}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium
        transition-all duration-150 flex-1 min-w-0
        border-white/10 bg-white/5 text-slate-400
        ${colors}
        ${selected ? "scale-105 shadow-lg" : "hover:scale-102"}
      `}
    >
      {selected && (
        <span className="absolute top-1 right-1">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
      <span className="text-center leading-tight whitespace-pre-line">{label}</span>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PoliticalCompassPage() {
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const isLoggedIn = !!user?.id;

  const total = COMPASS_QUESTIONS.length;
  const question = COMPASS_QUESTIONS[currentQ];
  const answered = Object.keys(answers).length;
  const progressPct = (answered / total) * 100;

  // ── Compute results (memoised) ──────────────────────────────────────────────
  const computeResults = useCallback(() => {
    const { economicScore, socialScore } = calculateScores(answers, COMPASS_QUESTIONS);
    const quadrant = getQuadrant(economicScore, socialScore);
    return { economicScore, socialScore, quadrant };
  }, [answers]);

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: { economicScore: number; socialScore: number; quadrant: string }) =>
      apiRequest("/api/profile/extended", "PUT", {
        compassResult: { ...data, completedAt: new Date().toISOString(), showOnProfile },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setResultSaved(true);
      toast({ title: "Result saved to your profile!" });
    },
    onError: () =>
      toast({ title: "Save failed", variant: "destructive" }),
  });

  // ── Navigation ──────────────────────────────────────────────────────────────
  const startQuiz = () => { setScreen("quiz"); setCurrentQ(0); };
  const retakeQuiz = () => {
    setAnswers({});
    setCurrentQ(0);
    setResultSaved(false);
    setScreen("intro");
  };
  const goBack = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1);
    else setScreen("intro");
  };
  const goNext = () => {
    if (answers[question.id] === undefined) return;
    if (currentQ < total - 1) setCurrentQ(q => q + 1);
    else setScreen("results");
  };
  const selectAnswer = (val: number) => {
    setAnswers(prev => ({ ...prev, [question.id]: val }));
  };

  const handleShare = () => {
    const { economicScore, socialScore, quadrant } = computeResults();
    const text = `My Political Compass result: ${quadrant}\nEconomic: ${formatScore(economicScore)} | Social: ${formatScore(socialScore)}\nTake the quiz at acp-democracy.app/political-compass`;
    if (navigator.share) {
      navigator.share({ title: "My Political Compass", text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!" });
    }
  };

  // ── INTRO SCREEN ──────────────────────────────────────────────────────────
  if (screen === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
        {/* Nav */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">
          {/* Hero */}
          <div className="text-center max-w-lg space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-2">
              <Compass className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Find Your Political Compass
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Answer 20 quick questions to discover where your views fall on economic and social issues. Takes about 3 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {["Nonpartisan", "No party labels", "Educational", "Anonymous-friendly"].map(tag => (
                <Badge key={tag} variant="outline" className="border-indigo-500/40 text-indigo-300 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preview compass */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-3xl bg-indigo-600/20 scale-125" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur p-4">
              <CompassChart economicScore={0} socialScore={0} size={260} />
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <Button
              onClick={startQuiz}
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base h-12 rounded-xl shadow-lg shadow-indigo-900/50"
            >
              Start Quiz
            </Button>
            <p className="text-xs text-slate-500 text-center flex items-center gap-1">
              <Info className="w-3 h-3" />
              This quiz is educational and simplified. Political views are complex.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN ───────────────────────────────────────────────────────────
  if (screen === "quiz") {
    const selectedVal = answers[question.id];
    const canProceed = selectedVal !== undefined;
    const isEconomic = question.axis === "economic";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
        {/* Top bar */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1" />
          <span className="text-slate-500 text-sm font-medium">
            {currentQ + 1} / {total}
          </span>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3 pb-1">
          <Progress value={progressPct} className="h-1.5 bg-white/10" />
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg space-y-6">
            {/* Axis tag */}
            <div className="flex items-center justify-center">
              <Badge
                className={`text-xs px-3 py-1 ${
                  isEconomic
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                }`}
                variant="outline"
              >
                {isEconomic ? "Economic Question" : "Social Question"}
              </Badge>
            </div>

            {/* Question text */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 text-center shadow-xl">
              <p className="text-white text-xl font-medium leading-relaxed">
                {question.text}
              </p>
            </div>

            {/* Likert scale */}
            <div className="flex gap-2">
              {LIKERT_OPTIONS.map(opt => (
                <LikertButton
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  selected={selectedVal === opt.value}
                  onClick={() => selectAnswer(opt.value)}
                />
              ))}
            </div>

            {/* Scale legend */}
            <div className="flex justify-between text-xs text-slate-600 px-1">
              <span>← Disagree</span>
              <span>Agree →</span>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={goBack}
                className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={goNext}
                disabled={!canProceed}
                className={`flex-2 flex-1 font-semibold ${
                  canProceed
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50"
                    : "bg-white/10 text-slate-500 cursor-not-allowed"
                }`}
              >
                {currentQ < total - 1 ? (
                  <><span>Next</span><ChevronRight className="w-4 h-4 ml-1" /></>
                ) : (
                  "See My Results"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS SCREEN ────────────────────────────────────────────────────────
  const { economicScore, socialScore, quadrant } = computeResults();
  const summary = getResultSummary(economicScore, socialScore);
  const qInfo = QUADRANT_INFO[quadrant] ?? QUADRANT_INFO["Pragmatic Centrist"];
  const [sumEcon, sumSocial] = summary.split("\n\n");

  const econLabel = economicScore < -1 ? "Economic Left" : economicScore > 1 ? "Economic Right" : "Economic Center";
  const socialLabel = socialScore < -1 ? "Libertarian" : socialScore > 1 ? "Authoritarian" : "Social Center";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pb-12">
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        </Link>
        <div className="flex-1" />
        <button onClick={retakeQuiz} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Retake
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Quadrant headline */}
        <div className="text-center space-y-2">
          <p className="text-slate-400 text-sm uppercase tracking-widest font-medium">Your Result</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{qInfo.label}</h1>
          <div className="inline-block px-4 py-1 rounded-full text-sm font-medium" style={{ background: qInfo.color + "30", color: qInfo.color, border: `1px solid ${qInfo.color}50` }}>
            {econLabel} · {socialLabel}
          </div>
        </div>

        {/* Compass + scores side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Compass chart */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 flex items-center justify-center">
            <CompassChart economicScore={economicScore} socialScore={socialScore} size={280} />
          </div>

          {/* Score breakdown */}
          <div className="space-y-4">
            {/* Economic score card */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Economic Axis</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{formatScore(economicScore)}</span>
                <span className="text-slate-400 text-sm pb-1">out of ±10</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{
                    width: `${(Math.abs(economicScore) / 10) * 50}%`,
                    left: economicScore >= 0 ? "50%" : `${50 - (Math.abs(economicScore) / 10) * 50}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30" />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Left</span>
                <span>Right</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{sumEcon}</p>
            </div>

            {/* Social score card */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide">Social Axis</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{formatScore(socialScore)}</span>
                <span className="text-slate-400 text-sm pb-1">out of ±10</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full bg-purple-400 transition-all duration-700"
                  style={{
                    width: `${(Math.abs(socialScore) / 10) * 50}%`,
                    left: socialScore >= 0 ? "50%" : `${50 - (Math.abs(socialScore) / 10) * 50}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30" />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Libertarian</span>
                <span>Authoritarian</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{sumSocial}</p>
            </div>
          </div>
        </div>

        {/* Quadrant description */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-2">
          <h3 className="text-white font-semibold text-base">What this means</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{qInfo.description}</p>
        </div>

        {/* Save / share section */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-4">
          {isLoggedIn ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Save to your profile</p>
                  <p className="text-slate-500 text-xs">Update your Political Compass module with this result</p>
                </div>
                {resultSaved ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" /> Saved
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate({ economicScore, socialScore, quadrant })}
                    disabled={saveMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  >
                    {saveMutation.isPending ? "Saving…" : "Save Result"}
                  </Button>
                )}
              </div>
              {resultSaved && (
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    id="show-on-profile"
                    checked={showOnProfile}
                    onCheckedChange={(v) => {
                      setShowOnProfile(v);
                      saveMutation.mutate({ economicScore, socialScore, quadrant });
                    }}
                  />
                  <Label htmlFor="show-on-profile" className="text-slate-300 text-sm">
                    Show my compass result on my profile
                  </Label>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-slate-300 text-sm">Your result is stored locally in this browser.</p>
              <p className="text-slate-500 text-xs">
                <Link href="/auth">
                  <span className="text-indigo-400 underline cursor-pointer">Create an account</span>
                </Link>{" "}
                to save your result and show it on your profile.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={retakeQuiz}
            className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Retake Quiz
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" /> Share Result
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-600 leading-relaxed">
          This quiz is educational and simplified. Political views are complex and may not fit perfectly into any single chart.
          Results are based on your responses to 20 questions and should not be taken as a definitive political classification.
        </p>
      </div>
    </div>
  );
}
