import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronLeft, ChevronRight, Compass, Target } from "lucide-react";
import { CompassChart } from "@/components/compass-chart";
import { COMPASS_QUESTIONS, LIKERT_OPTIONS, QUADRANT_INFO } from "@/lib/political-compass-config";
import { calculateScores, getQuadrant, formatScore } from "@/lib/political-compass-scoring";

// Pick 5 economic + 5 social questions (every other one) for the 10-question mini quiz
const MINI_QUESTIONS = [
  ...COMPASS_QUESTIONS.filter(q => q.axis === "economic").filter((_, i) => i % 2 === 0),
  ...COMPASS_QUESTIONS.filter(q => q.axis === "social").filter((_, i) => i % 2 === 0),
];

interface Props {
  economicScore?: number | null;
  socialScore?: number | null;
  quadrant?: string | null;
  isOwner: boolean;
  isSaving?: boolean;
  onSave: (result: { economicScore: number; socialScore: number; quadrant: string }) => void;
  subjectName: string;
  uid?: string;
}

function LikertButton({
  value, label, selected, onClick,
}: { value: number; label: string; selected: boolean; onClick: () => void }) {
  const colors: Record<string, string> = {
    "-2": "hover:border-red-400 hover:bg-red-500/10 data-[selected=true]:border-red-400 data-[selected=true]:bg-red-500/20 data-[selected=true]:text-red-300",
    "-1": "hover:border-orange-400 hover:bg-orange-500/10 data-[selected=true]:border-orange-400 data-[selected=true]:bg-orange-500/20 data-[selected=true]:text-orange-300",
    "0":  "hover:border-slate-400 hover:bg-slate-500/10 data-[selected=true]:border-slate-400 data-[selected=true]:bg-slate-500/20 data-[selected=true]:text-slate-200",
    "1":  "hover:border-blue-400 hover:bg-blue-500/10 data-[selected=true]:border-blue-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-300",
    "2":  "hover:border-green-400 hover:bg-green-500/10 data-[selected=true]:border-green-400 data-[selected=true]:bg-green-500/20 data-[selected=true]:text-green-300",
  };

  return (
    <button
      data-selected={selected}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium
        transition-all duration-150 flex-1 min-w-0
        border-white/10 bg-white/5 text-slate-400
        ${colors[String(value)] ?? ""}
        ${selected ? "scale-105 shadow-lg" : ""}
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

export function PoliticalCompassTab({
  economicScore, socialScore, quadrant,
  isOwner, isSaving, onSave, subjectName, uid = "tab",
}: Props) {
  const hasResult = economicScore != null && socialScore != null;
  const qInfo = quadrant ? (QUADRANT_INFO[quadrant] ?? QUADRANT_INFO["Pragmatic Centrist"]) : null;

  const [quizOpen, setQuizOpen] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [resultReady, setResultReady] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ economicScore: number; socialScore: number; quadrant: string } | null>(null);

  const question = MINI_QUESTIONS[currentQ];
  const total = MINI_QUESTIONS.length;
  const answered = Object.keys(answers).length;
  const progressPct = (answered / total) * 100;
  const isEconomic = question?.axis === "economic";
  const selectedVal = question ? answers[question.id] : undefined;
  const canProceed = selectedVal !== undefined;

  function openQuiz() {
    setCurrentQ(0);
    setAnswers({});
    setResultReady(false);
    setPendingResult(null);
    setQuizOpen(true);
  }

  function goBack() {
    if (currentQ > 0) setCurrentQ(q => q - 1);
  }

  function goNext() {
    if (!canProceed) return;
    if (currentQ < total - 1) {
      setCurrentQ(q => q + 1);
    } else {
      const { economicScore: es, socialScore: ss } = calculateScores(answers, MINI_QUESTIONS);
      const q = getQuadrant(es, ss);
      setPendingResult({ economicScore: es, socialScore: ss, quadrant: q });
      setResultReady(true);
    }
  }

  function handleSave() {
    if (!pendingResult) return;
    onSave(pendingResult);
    setQuizOpen(false);
  }

  const eScore = economicScore ?? 0;
  const sScore = socialScore ?? 0;
  const econLabel = eScore < -1 ? "Economic Left" : eScore > 1 ? "Economic Right" : "Economic Center";
  const socialLabel = sScore < -1 ? "Libertarian" : sScore > 1 ? "Authoritarian" : "Social Center";

  return (
    <div className="space-y-6">
      {/* ── RESULT STATE ──────────────────────────────────────────────────── */}
      {hasResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Chart */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 flex flex-col items-center gap-3">
            <CompassChart economicScore={eScore} socialScore={sScore} size={280} uid={uid} />
            {qInfo && (
              <div className="text-center space-y-1">
                <div
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ background: qInfo.color + "25", color: qInfo.color, border: `1px solid ${qInfo.color}50` }}
                >
                  {qInfo.label}
                </div>
                <p className="text-slate-400 text-xs">
                  Econ {eScore >= 0 ? "+" : ""}{eScore.toFixed(1)} · Social {sScore >= 0 ? "+" : ""}{sScore.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* Score breakdown + description */}
          <div className="space-y-4">
            {/* Economic axis bar */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Economic Axis</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{formatScore(eScore)}</span>
                <span className="text-slate-400 text-xs pb-1">/ ±10</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full bg-amber-400"
                  style={{
                    width: `${(Math.abs(eScore) / 10) * 50}%`,
                    left: eScore >= 0 ? "50%" : `${50 - (Math.abs(eScore) / 10) * 50}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/30" />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Left</span><span>Right</span>
              </div>
            </div>

            {/* Social axis bar */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide">Social Axis</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{formatScore(sScore)}</span>
                <span className="text-slate-400 text-xs pb-1">/ ±10</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-full bg-purple-400"
                  style={{
                    width: `${(Math.abs(sScore) / 10) * 50}%`,
                    left: sScore >= 0 ? "50%" : `${50 - (Math.abs(sScore) / 10) * 50}%`,
                  }}
                />
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/30" />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Libertarian</span><span>Authoritarian</span>
              </div>
            </div>

            {/* Quadrant description */}
            {qInfo && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
                <p className="text-white text-sm font-medium">What this means</p>
                <p className="text-slate-300 text-xs leading-relaxed">{qInfo.description}</p>
              </div>
            )}

            {/* Position label */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-slate-300 text-xs">
                <span className="font-medium text-white">{subjectName}</span> is positioned as{" "}
                <span className="text-amber-300">{econLabel}</span> and{" "}
                <span className="text-purple-300">{socialLabel}</span> on the political spectrum.
              </p>
            </div>

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={openQuiz}
                className="w-full border-slate-600 hover:border-indigo-500 hover:text-indigo-300"
              >
                <Target className="w-4 h-4 mr-2" />
                Update Position
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* ── EMPTY STATE ──────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-950 p-8">
          <div className="max-w-md mx-auto text-center space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 mx-auto">
              <Compass className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg">No Political Position Set</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Political views exist on a spectrum, not just left vs. right.
                The compass plots <span className="font-medium text-slate-200">{subjectName}</span>'s positions
                on two independent axes: economic policy and social/governance values.
              </p>
            </div>

            {/* Mini compass preview */}
            <div className="flex justify-center opacity-40">
              <CompassChart economicScore={0} socialScore={0} size={180} uid={`${uid}-empty`} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { color: "#ef4444", label: "State Progressive", desc: "Left econ + strong government" },
                { color: "#6366f1", label: "National Conservative", desc: "Right econ + strong authority" },
                { color: "#10b981", label: "Community Libertarian", desc: "Left econ + personal freedom" },
                { color: "#f59e0b", label: "Market Libertarian", desc: "Right econ + minimal government" },
              ].map(q => (
                <div key={q.label} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: q.color }} />
                    <span className="text-white text-xs font-medium">{q.label}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{q.desc}</p>
                </div>
              ))}
            </div>

            {isOwner && (
              <Button
                onClick={openQuiz}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                <Target className="w-4 h-4 mr-2" />
                Set Political Position (10 questions)
              </Button>
            )}
            {!isOwner && (
              <p className="text-slate-500 text-xs">
                Only verified profile owners and admins can set this position.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 10-QUESTION QUIZ DIALOG ────────────────────────────────────────── */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border-white/10 text-white p-0 overflow-hidden">
          {!resultReady ? (
            /* Quiz screen */
            <div className="flex flex-col min-h-[520px]">
              <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white text-base font-semibold">
                    Political Position Quiz
                  </DialogTitle>
                  <span className="text-slate-500 text-sm">{currentQ + 1} / {total}</span>
                </div>
                <Progress value={progressPct} className="h-1 bg-white/10 mt-2" />
              </DialogHeader>

              <div className="flex-1 flex flex-col justify-center px-6 py-6 gap-5">
                <div className="flex justify-center">
                  <Badge
                    variant="outline"
                    className={`text-xs px-3 py-1 ${
                      isEconomic
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    }`}
                  >
                    {isEconomic ? "Economic Question" : "Social Question"}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 text-center">
                  <p className="text-white text-base font-medium leading-relaxed">
                    {question?.text}
                  </p>
                </div>

                <div className="flex gap-2">
                  {LIKERT_OPTIONS.map(opt => (
                    <LikertButton
                      key={opt.value}
                      value={opt.value}
                      label={opt.label}
                      selected={selectedVal === opt.value}
                      onClick={() => setAnswers(prev => ({ ...prev, [question!.id]: opt.value }))}
                    />
                  ))}
                </div>

                <div className="flex justify-between text-xs text-slate-600 px-1">
                  <span>← Disagree</span>
                  <span>Agree →</span>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={goBack}
                    disabled={currentQ === 0}
                    className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceed}
                    className={`flex-1 font-semibold ${canProceed ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-white/10 text-slate-500 cursor-not-allowed"}`}
                  >
                    {currentQ < total - 1 ? (
                      <><span>Next</span><ChevronRight className="w-4 h-4 ml-1" /></>
                    ) : "See Results"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Results screen */
            <div className="flex flex-col">
              <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/5">
                <DialogTitle className="text-white text-base font-semibold">Your Result</DialogTitle>
              </DialogHeader>
              {pendingResult && (() => {
                const qi = QUADRANT_INFO[pendingResult.quadrant] ?? QUADRANT_INFO["Pragmatic Centrist"];
                const es = pendingResult.economicScore;
                const ss = pendingResult.socialScore;
                return (
                  <div className="px-6 py-5 space-y-4">
                    <div className="text-center">
                      <div
                        className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-2"
                        style={{ background: qi.color + "25", color: qi.color, border: `1px solid ${qi.color}50` }}
                      >
                        {qi.label}
                      </div>
                      <p className="text-slate-400 text-xs">
                        Econ {es >= 0 ? "+" : ""}{es.toFixed(1)} · Social {ss >= 0 ? "+" : ""}{ss.toFixed(1)}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <CompassChart economicScore={es} socialScore={ss} size={240} uid={`${uid}-result`} />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-slate-300 text-xs leading-relaxed">{qi.description}</p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setResultReady(false); setCurrentQ(0); setAnswers({}); }}
                        className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      >
                        Retake
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        {isSaving ? "Saving…" : "Save Position"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
