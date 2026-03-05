import { useAuth } from "@/hooks/use-auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Redirect } from "wouter";
import { FileDown, MapPin, Users, Building2, Vote } from "lucide-react";
import { downloadCsv, TEMPLATES } from "@/lib/download-template";

const TEMPLATE_CARDS = [
  {
    key: "candidates",
    icon: Vote,
    title: "Election Candidates",
    description: "People running for office in your state. Covers federal and state races — U.S. Senate, U.S. House, Governor, State Senate, State House, and more.",
    columns: ["FULL_NAME", "OFFICE", "OFFICE_LEVEL", "DISTRICT", "PARTY", "INCUMBENT", "STATUS", "ELECTION_TYPE", "PRIMARY_DATE", "GENERAL_DATE", "BALLOTPEDIA_URL", "NOTES"],
    instructions: [
      "OFFICE — e.g. \"U.S. Senate\", \"U.S. House\", \"Governor\", \"MN State Senate\", \"MN State House\"",
      "OFFICE_LEVEL — \"Federal\" or \"State\"",
      "DISTRICT — e.g. \"Minnesota\", \"District 1\", \"District 22A\"",
      "PARTY — \"Democratic\", \"Republican\", \"Independent\", etc.",
      "INCUMBENT — \"Yes\" or \"No\"",
      "STATUS — \"Candidacy Declared\", \"On the Ballot\", or \"Lost Primary\"",
      "ELECTION_TYPE — \"General\" or \"Primary\"",
      "PRIMARY_DATE / GENERAL_DATE — e.g. \"August 11, 2026\"",
      "BALLOTPEDIA_URL — full URL to the candidate's Ballotpedia page",
    ],
    template: TEMPLATES.candidates,
  },
  {
    key: "representatives",
    icon: Users,
    title: "Current Representatives",
    description: "People currently holding office in your state. Shown to users when they look up who represents them.",
    columns: ["NAME", "OFFICE_TITLE", "OFFICE_LEVEL", "PARTY", "EMAIL", "PHONE", "WEBSITE", "DISTRICT", "JURISDICTION", "TERM_START", "TERM_END", "NOTES"],
    instructions: [
      "NAME — full legal name",
      "OFFICE_TITLE — e.g. \"U.S. Senator\", \"State Representative\", \"Mayor\"",
      "OFFICE_LEVEL — \"federal\", \"state\", or \"local\"",
      "DISTRICT — e.g. \"District 1\", \"At-Large\"",
      "JURISDICTION — e.g. \"Minnesota\", \"Hennepin County\"",
      "TERM_START / TERM_END — date format MM/DD/YYYY",
    ],
    template: TEMPLATES.representatives,
  },
  {
    key: "sigs",
    icon: Building2,
    title: "Special Interest Groups (SIGs)",
    description: "Organizations that donate to, endorse, or lobby politicians in your state. Used to build the Influence Map and corruption scorecards.",
    columns: ["NAME", "ACRONYM", "DESCRIPTION", "CATEGORY", "SENTIMENT", "TAG", "WEBSITE", "DATA_SOURCE_NAME", "DATA_SOURCE_URL", "NOTES"],
    instructions: [
      "NAME — full organization name",
      "ACRONYM — short form used in badges",
      "CATEGORY — one of: Special Interest, Super PAC, Dark Money, Industry PAC, Pledge, Labor Union, Endorsement Org",
      "SENTIMENT — \"positive\" (reform-aligned), \"negative\" (corrupting), or \"neutral\"",
      "TAG — unique URL-safe slug e.g. \"AIPAC\", \"PLEDGE_M4A\" (no spaces, no special chars)",
      "DATA_SOURCE_NAME / DATA_SOURCE_URL — where the data comes from (e.g. OpenSecrets)",
    ],
    template: TEMPLATES.sigs,
  },
];

export default function AdminStateDataPage() {
  const { user } = useAuth();

  const allowedRoles = ["admin", "state_admin", "moderator"];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  const isStateAdmin = user.role === "state_admin";
  const stateLabel = isStateAdmin && user.managedState ? user.managedState : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-7 w-7 text-orange-500" />
            <h1 className="text-3xl font-bold text-foreground">State Data Portal</h1>
            {stateLabel && (
              <Badge className="bg-orange-500 text-white text-sm px-3 py-1">
                {stateLabel}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isStateAdmin
              ? `Download the CSV templates below, fill them in for ${stateLabel || "your state"}, and send the completed file to a platform admin for import.`
              : "Manage state-level data entry. Download CSV templates to share with State Admins, or use them to populate the database directly."}
          </p>
        </div>

        {isStateAdmin && (
          <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900 dark:text-orange-100">How this works</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Download a template, fill it out using publicly available sources like Ballotpedia, your state legislature's website, or OpenSecrets,
                    then send the completed CSV to a platform admin who will import it.
                    Each template includes a sample row to guide your formatting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {TEMPLATE_CARDS.map(({ key, icon: Icon, title, description, columns, instructions, template }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">CSV Columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {columns.map(col => (
                      <code key={col} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{col}</code>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Field Notes</p>
                  <ul className="space-y-1">
                    {instructions.map((note, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-muted-foreground/50 flex-shrink-0">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant="outline"
                  onClick={() => downloadCsv(template.filename, template.headers, template.sample)}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Download {title} Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
