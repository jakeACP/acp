import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Flag, ChevronLeft, ChevronRight, SkipForward, Star, BarChart3, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { POLICY_ISSUES, RESPONSE_LABELS, RESPONSE_DESCRIPTIONS, type PolicyIssue } from "@/lib/issue-data";

type View = "intro" | "survey" | "results";

interface ResponseEntry {
  issueId: string;
  response: number | null;
  priority: boolean;
}

function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="floating-card max-w-2xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Flag className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Policy Issue Survey</CardTitle>
          <p className="text-muted-foreground mt-2 text-base">
            Share your preferences on 30 key U.S. policy areas
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600">30</div>
              <div className="text-sm text-muted-foreground">Policy Issues</div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <div className="text-sm text-muted-foreground">Response Options</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600">~10</div>
              <div className="text-sm text-muted-foreground">Minutes to Complete</div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              For each issue, select how much government involvement you prefer — from "Much Less" to "Much More."
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Toggle "This issue is important to me" to flag your top priorities.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              You can skip questions, go back, and return to edit your answers anytime.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This survey captures general preferences on policy direction — specifically, how much government involvement you prefer in each area. It is not aligned to any political party or candidate.
            </p>
          </div>

          <Button onClick={onStart} className="w-full text-lg py-6" size="lg">
            Start Survey
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SurveyView({
  responses,
  onChange,
  onComplete,
}: {
  responses: Record<string, ResponseEntry>;
  onChange: (issueId: string, field: "response" | "priority", value: any) => void;
  onComplete: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const issue: PolicyIssue = POLICY_ISSUES[currentIndex];
  const entry: ResponseEntry = responses[issue.id] || { issueId: issue.id, response: null, priority: false };
  const progress = ((currentIndex) / POLICY_ISSUES.length) * 100;

  const canGoNext = entry.response !== null;

  function handleNext() {
    if (currentIndex < POLICY_ISSUES.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onComplete();
    }
  }

  function handleSkip() {
    if (!responses[issue.id]) {
      onChange(issue.id, "response", null);
    }
    handleNext();
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }

  const responseValue = entry.response;
  const isPriority = entry.priority;

  const buttonConfig = [
    { value: 1, label: "Much Less", color: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
    { value: 2, label: "Somewhat Less", color: "bg-orange-400 hover:bg-orange-500 text-white border-orange-400" },
    { value: 3, label: "About the Same", color: "bg-gray-400 hover:bg-gray-500 text-white border-gray-400" },
    { value: 4, label: "Somewhat More", color: "bg-blue-400 hover:bg-blue-500 text-white border-blue-400" },
    { value: 5, label: "Much More", color: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentIndex + 1} of {POLICY_ISSUES.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Issue Card */}
        <Card className="floating-card">
          <CardHeader>
            <Badge variant="outline" className="w-fit mb-2">{issue.category}</Badge>
            <CardTitle className="text-xl">{issue.title}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{issue.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium text-base">{issue.prompt}</p>
            </div>

            {/* 5-button response scale */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Government Involvement</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {buttonConfig.map(btn => (
                  <button
                    key={btn.value}
                    onClick={() => onChange(issue.id, "response", btn.value)}
                    className={`
                      px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all
                      ${responseValue === btn.value
                        ? btn.color + " scale-105 shadow-md"
                        : "bg-background hover:bg-muted border-border text-foreground"
                      }
                    `}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              {responseValue !== null && (
                <p className="text-xs text-muted-foreground text-center">
                  {RESPONSE_DESCRIPTIONS[responseValue]}
                </p>
              )}
            </div>

            {/* Priority toggle */}
            <button
              onClick={() => onChange(issue.id, "priority", !isPriority)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium
                ${isPriority
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                  : "border-border bg-background text-muted-foreground hover:border-amber-300 hover:bg-amber-50/50"
                }
              `}
            >
              <Star className={`h-4 w-4 ${isPriority ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              <span>This issue is important to me</span>
            </button>

            {/* Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-none ml-auto"
              >
                Skip
                <SkipForward className="h-4 w-4 ml-1" />
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex-none"
              >
                {currentIndex === POLICY_ISSUES.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Link to results if some answered */}
        {Object.values(responses).some(r => r.response !== null) && (
          <p className="text-center text-sm text-muted-foreground">
            <button onClick={onComplete} className="underline underline-offset-2 hover:text-foreground transition-colors">
              View results so far
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function ResultsView({
  responses,
  onEdit,
}: {
  responses: Record<string, ResponseEntry>;
  onEdit: () => void;
}) {
  const answered = POLICY_ISSUES.filter(issue => {
    const r = responses[issue.id];
    return r && r.response !== null;
  });

  const priorityIssues = answered.filter(issue => responses[issue.id]?.priority);
  const strongestPositions = answered.filter(issue => {
    const r = responses[issue.id]?.response;
    return r === 1 || r === 5;
  });
  const moderateIssues = answered.filter(issue => {
    const r = responses[issue.id]?.response;
    return r !== null && r >= 2 && r <= 4;
  });

  const leansMore = answered.filter(i => (responses[i.id]?.response ?? 3) >= 4).length;
  const leansLess = answered.filter(i => (responses[i.id]?.response ?? 3) <= 2).length;
  const leansNeutral = answered.filter(i => responses[i.id]?.response === 3).length;

  const getResponseLabel = (val: number | null | undefined) => {
    if (val == null) return "Skipped";
    return RESPONSE_LABELS[val] || "—";
  };

  const getResponseColor = (val: number | null | undefined) => {
    if (val === 1) return "text-red-500";
    if (val === 2) return "text-orange-400";
    if (val === 3) return "text-gray-500";
    if (val === 4) return "text-blue-400";
    if (val === 5) return "text-blue-600";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Your Issue Survey Results</h1>
        <p className="text-muted-foreground">
          Based on {answered.length} of {POLICY_ISSUES.length} questions answered
        </p>
      </div>

      {/* Overall Lean */}
      <Card className="floating-card">
        <CardHeader>
          <CardTitle className="text-lg">Overall Direction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-500">{leansLess}</div>
              <div className="text-xs text-muted-foreground">Prefer Less Involvement</div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <div className="text-2xl font-bold text-gray-500">{leansNeutral}</div>
              <div className="text-xs text-muted-foreground">About the Same</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600">{leansMore}</div>
              <div className="text-xs text-muted-foreground">Prefer More Involvement</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Issues */}
      {priorityIssues.length > 0 && (
        <Card className="floating-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              Top Priority Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priorityIssues.map(issue => (
                <div key={issue.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                    <p className="text-sm font-medium">{issue.title}</p>
                  </div>
                  <span className={`text-sm font-semibold ${getResponseColor(responses[issue.id]?.response)}`}>
                    {getResponseLabel(responses[issue.id]?.response)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strongest Positions */}
      {strongestPositions.length > 0 && (
        <Card className="floating-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Strongest Positions
            </CardTitle>
            <p className="text-sm text-muted-foreground">Issues where you feel strongly about government involvement</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {strongestPositions.map(issue => (
                <div key={issue.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                    <p className="text-sm font-medium">{issue.title}</p>
                  </div>
                  <span className={`text-sm font-semibold ${getResponseColor(responses[issue.id]?.response)}`}>
                    {getResponseLabel(responses[issue.id]?.response)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Moderate/Mixed */}
      {moderateIssues.length > 0 && (
        <Card className="floating-card">
          <CardHeader>
            <CardTitle className="text-lg">Moderate / Mixed Areas</CardTitle>
            <p className="text-sm text-muted-foreground">Issues where you prefer a moderate adjustment</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {moderateIssues.map(issue => (
                <div key={issue.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                    <p className="text-sm font-medium">{issue.title}</p>
                  </div>
                  <span className={`text-sm font-semibold ${getResponseColor(responses[issue.id]?.response)}`}>
                    {getResponseLabel(responses[issue.id]?.response)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Disclaimer:</strong> This survey captures general preferences on policy direction — specifically, how much government involvement you prefer in each area. Results are not aligned to any political party or candidate and are for self-reflection only.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onEdit} variant="outline" className="flex-1">
          Edit Responses
        </Button>
        <Link href="/profile" className="flex-1">
          <Button className="w-full">Back to Profile</Button>
        </Link>
      </div>
    </div>
  );
}

export default function IssuesPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("intro");
  const [responses, setResponses] = useState<Record<string, ResponseEntry>>({});

  const { data: savedResponses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/issues/responses"],
  });

  useEffect(() => {
    if (savedResponses.length > 0) {
      const mapped: Record<string, ResponseEntry> = {};
      for (const r of savedResponses) {
        mapped[r.issueId] = { issueId: r.issueId, response: r.response, priority: r.priority };
      }
      setResponses(mapped);
      if (Object.keys(mapped).length > 0) {
        setView("intro");
      }
    }
  }, [savedResponses]);

  const saveMutation = useMutation({
    mutationFn: async (data: ResponseEntry[]) => {
      return apiRequest("POST", "/api/issues/responses", { responses: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues/responses"] });
    },
    onError: () => {
      toast({ title: "Failed to save responses", variant: "destructive" });
    },
  });

  function handleChange(issueId: string, field: "response" | "priority", value: any) {
    setResponses(prev => {
      const updated = {
        ...prev,
        [issueId]: {
          ...(prev[issueId] || { issueId, response: null, priority: false }),
          [field]: value,
        },
      };
      const entries = Object.values(updated);
      saveMutation.mutate(entries);
      return updated;
    });
  }

  function handleComplete() {
    const entries = Object.values(responses);
    if (entries.length > 0) {
      saveMutation.mutate(entries);
    }
    setView("results");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (view === "intro") {
    return (
      <IntroView
        onStart={() => setView("survey")}
      />
    );
  }

  if (view === "survey") {
    return (
      <SurveyView
        responses={responses}
        onChange={handleChange}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <ResultsView
      responses={responses}
      onEdit={() => setView("survey")}
    />
  );
}
