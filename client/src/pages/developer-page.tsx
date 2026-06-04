import { Navigation } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Shield, Zap, Key, AlertTriangle, CheckCircle, Bot, FlaskConical } from "lucide-react";

const BASE_URL = window.location.origin;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
      {code}
    </pre>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${colors[method] ?? "bg-slate-100 text-slate-800"}`}>
      {method}
    </span>
  );
}

function TierBadge({ tier }: { tier: "premium" | "admin" }) {
  if (tier === "admin") {
    return <Badge variant="outline" className="border-purple-400 text-purple-700 dark:text-purple-300">Admin only</Badge>;
  }
  return <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">ACP+ Premium</Badge>;
}

function PermissionBadge({ permission }: { permission: string | null }) {
  if (!permission) {
    return <Badge variant="outline" className="border-slate-400 text-slate-600 dark:text-slate-300 font-mono text-xs">no permission required</Badge>;
  }
  return <Badge variant="outline" className="border-cyan-400 text-cyan-700 dark:text-cyan-300 font-mono text-xs">{permission}</Badge>;
}

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/me",
    tier: "premium" as const,
    summary: "Get your own profile",
    description: "Returns basic profile information for the authenticated user.",
    requestBody: null,
    responseExample: `{
  "id": "uuid",
  "username": "alice",
  "email": "alice@example.com",
  "role": "citizen",
  "subscriptionStatus": "premium",
  "firstName": "Alice",
  "lastName": "Smith",
  "avatar": "https://...",
  "bio": "Political activist",
  "location": "New York, NY"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/posts",
    tier: "premium" as const,
    summary: "List your posts",
    description: "Returns all posts created by the authenticated user.",
    requestBody: null,
    responseExample: `[
  {
    "id": "uuid",
    "content": "My post text",
    "link": null,
    "postType": "standard",
    "privacy": "public",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]`,
  },
  {
    method: "POST",
    path: "/api/v1/posts",
    tier: "premium" as const,
    summary: "Create a post",
    description: "Creates a new post in your ACP feed. Use this to cross-post content from other platforms.",
    requestBody: `{
  "content": "Your post text (required, max 10,000 chars)",
  "link": "https://optional-url.com"
}`,
    responseExample: `{
  "id": "uuid",
  "content": "Your post text",
  "link": "https://optional-url.com",
  "userId": "your-user-id",
  "createdAt": "2025-01-01T00:00:00Z"
}`,
  },
];

const adminEndpoints = [
  {
    method: "POST",
    path: "/api/v1/admin/politicians",
    summary: "Create a politician profile",
    requestBody: `{
  "fullName": "Jane Doe",
  "state": "NY",
  "party": "Independent",
  "profileType": "candidate"
}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/politicians/:id",
    summary: "Update a politician profile",
    requestBody: `{
  "fullName": "Jane Doe",
  "party": "Independent",
  "isCurrent": true
}`,
  },
  {
    method: "POST",
    path: "/api/v1/admin/positions",
    summary: "Create a political position",
    requestBody: `{
  "title": "City Council Member",
  "level": "local",
  "jurisdiction": "New York City"
}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/positions/:id",
    summary: "Update a political position",
    requestBody: `{
  "title": "Updated Title",
  "isActive": true
}`,
  },
  {
    method: "POST",
    path: "/api/v1/admin/candidates",
    summary: "Create a candidate",
    requestBody: `{
  "name": "Jane Doe",
  "position": "mayor",
  "description": "Independent candidate for mayor",
  "userId": "optional-linked-user-id"
}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/candidates/:id",
    summary: "Update a candidate",
    requestBody: `{
  "description": "Updated description",
  "position": "city council"
}`,
  },
];

const agentEndpoints = [
  {
    method: "POST",
    path: "/api/agent/auth/verify",
    permission: null,
    summary: "Verify your Agent Key",
    description: "Validates the provided Agent Key and returns its metadata including role, permissions, rate limit, and sandbox status.",
    requestBody: null,
    responseExample: `{
  "success": true,
  "action": "auth:verify",
  "data": {
    "key": {
      "id": "key-uuid",
      "prefix": "acp_agent_xxxx",
      "role": "news_agent",
      "permissions": { "articles:create": true },
      "sandboxMode": false,
      "status": "active"
    }
  },
  "errors": [],
  "meta": { "timestamp": "2025-01-01T00:00:00Z", "rate_limit_remaining": 59, "sandbox": false }
}`,
    curlBody: null,
  },
  {
    method: "POST",
    path: "/api/agent/articles/create",
    permission: "articles:create",
    summary: "Create an article / post",
    description: "Publishes a new article to the ACP feed as the key's creator user. HTML tags are stripped from the body.",
    requestBody: `{
  "title": "Breaking: Senate vote tonight",
  "body": "Full article text here… (max 10,000 chars)",
  "sourceUrl": "https://example.com/source",
  "tags": ["senate", "legislation"]
}`,
    responseExample: `{
  "success": true,
  "action": "articles:create",
  "data": { "post": { "id": "uuid", "title": "...", "createdAt": "..." } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 58, "sandbox": false }
}`,
    curlBody: `'{"title":"Breaking: Senate vote tonight","body":"Full article text here…","sourceUrl":"https://example.com/source","tags":["senate"]}'`,
  },
  {
    method: "PUT",
    path: "/api/agent/articles/update",
    permission: "articles:edit",
    summary: "Update an existing article",
    description: "Edits an existing post by ID. Include postId in the body (or use /api/agent/articles/:id). All fields are optional — only supplied fields are updated.",
    requestBody: `{
  "postId": "uuid-of-post",
  "title": "Updated headline",
  "body": "Updated body text",
  "tags": ["updated-tag"]
}`,
    responseExample: `{
  "success": true,
  "action": "articles:edit",
  "data": { "post": { "id": "uuid", "title": "Updated headline", "updatedAt": "..." } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 57, "sandbox": false }
}`,
    curlBody: `'{"postId":"uuid-of-post","title":"Updated headline"}'`,
  },
  {
    method: "POST",
    path: "/api/agent/moderation/flag",
    permission: "moderation:flag",
    summary: "Flag a post or comment",
    description: "Submits a moderation flag on a post or comment for admin review.",
    requestBody: `{
  "targetId": "uuid-of-post-or-comment",
  "targetType": "post",
  "reason": "Contains misinformation about election results"
}`,
    responseExample: `{
  "success": true,
  "action": "moderation:flag",
  "data": { "flag": { "id": "uuid", "targetId": "...", "reason": "..." } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 56, "sandbox": false }
}`,
    curlBody: `'{"targetId":"uuid","targetType":"post","reason":"Contains misinformation"}'`,
  },
  {
    method: "POST",
    path: "/api/agent/users/ban",
    permission: "users:ban",
    summary: "Ban a user account",
    description: "Suspends a user account. The acting user is the key creator; the ban is attributed in the audit log to the agent key.",
    requestBody: `{
  "userId": "uuid-of-user",
  "reason": "Repeated spam violations",
  "duration": "7 days"
}`,
    responseExample: `{
  "success": true,
  "action": "users:ban",
  "data": { "success": true },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 55, "sandbox": false }
}`,
    curlBody: `'{"userId":"uuid","reason":"Repeated spam violations","duration":"7 days"}'`,
  },
  {
    method: "POST",
    path: "/api/agent/politicians/import",
    permission: "politicians:write",
    summary: "Import a politician profile",
    description: "Creates a new politician profile. Uses the full politician profile schema.",
    requestBody: `{
  "fullName": "Jane Doe",
  "state": "CA",
  "party": "Independent",
  "profileType": "representative",
  "chamber": "house",
  "district": "CA-12"
}`,
    responseExample: `{
  "success": true,
  "action": "politicians:write",
  "data": { "profile": { "id": "uuid", "fullName": "Jane Doe", ... } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 54, "sandbox": false }
}`,
    curlBody: `'{"fullName":"Jane Doe","state":"CA","party":"Independent","profileType":"representative"}'`,
  },
  {
    method: "PUT",
    path: "/api/agent/politicians/update",
    permission: "politicians:write",
    summary: "Update a politician profile",
    description: "Patches an existing politician profile by ID. Include politicianId in the body (or use /api/agent/politicians/:id). All fields are optional.",
    requestBody: `{
  "politicianId": "uuid-of-profile",
  "party": "Green",
  "isCurrent": false
}`,
    responseExample: `{
  "success": true,
  "action": "politicians:write",
  "data": { "profile": { "id": "uuid", "party": "Green", ... } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 53, "sandbox": false }
}`,
    curlBody: `'{"politicianId":"uuid","party":"Green","isCurrent":false}'`,
  },
  {
    method: "POST",
    path: "/api/agent/elections/sync",
    permission: "elections:write",
    summary: "Submit an election sync report",
    description: "Submits an election data report for admin review. The report is queued for admin action and does not auto-apply to live data.",
    requestBody: `{
  "source": "OpenSecrets 2024-Q4",
  "summary": "Updated 47 candidate finance records",
  "payload": { "candidates": 47, "updatedAt": "2024-12-31" }
}`,
    responseExample: `{
  "success": true,
  "action": "elections:write",
  "data": { "accepted": true, "sandbox": false, "report": { "source": "...", "summary": "..." } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 52, "sandbox": false }
}`,
    curlBody: `'{"source":"OpenSecrets 2024-Q4","summary":"Updated 47 candidate finance records"}'`,
  },
  {
    method: "POST",
    path: "/api/agent/testing/run",
    permission: "testing:run",
    summary: "Submit a QA test report",
    description: "Submits a test run result for logging and admin visibility. Does not affect live data.",
    requestBody: `{
  "flow": "registration-flow",
  "result": "All 12 steps passed",
  "payload": { "passed": 12, "failed": 0 }
}`,
    responseExample: `{
  "success": true,
  "action": "testing:run",
  "data": { "accepted": true, "sandbox": false, "report": { "flow": "...", "result": "..." } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 51, "sandbox": false }
}`,
    curlBody: `'{"flow":"registration-flow","result":"All 12 steps passed"}'`,
  },
  {
    method: "POST",
    path: "/api/agent/security/scan",
    permission: "security:scan",
    summary: "Submit a security scan report",
    description: "Submits a security scan result for admin review.",
    requestBody: `{
  "target": "https://acp.example.com/api/v1/posts",
  "summary": "No critical vulnerabilities found",
  "severity": "info",
  "payload": { "checksRun": 24, "issues": [] }
}`,
    responseExample: `{
  "success": true,
  "action": "security:scan",
  "data": { "accepted": true, "sandbox": false, "report": { "target": "...", "severity": "info" } },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 50, "sandbox": false }
}`,
    curlBody: `'{"target":"https://acp.example.com","summary":"No issues found","severity":"info"}'`,
  },
  {
    method: "GET",
    path: "/api/agent/logs",
    permission: "logs:read",
    summary: "Read your agent activity logs",
    description: "Returns paginated activity logs scoped to the calling Agent Key. Supports ?limit= (max 100) and ?offset= query params.",
    requestBody: null,
    responseExample: `{
  "success": true,
  "action": "logs:read",
  "data": {
    "logs": [{ "id": "uuid", "action": "articles:create", "endpoint": "/api/agent/articles/create", "success": true, "timestamp": "..." }],
    "pagination": { "limit": 50, "offset": 0, "hasMore": false }
  },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 49, "sandbox": false }
}`,
    curlBody: null,
  },
];

const agentPermissions = [
  { permission: "articles:create", description: "Publish new articles and posts to the ACP feed" },
  { permission: "articles:edit", description: "Edit the title, body, or tags of existing posts" },
  { permission: "moderation:flag", description: "Submit moderation flags on posts and comments for admin review" },
  { permission: "users:ban", description: "Suspend user accounts (permanent or time-limited)" },
  { permission: "politicians:write", description: "Create or update politician profiles in the database" },
  { permission: "elections:write", description: "Submit election data sync reports for admin review" },
  { permission: "testing:run", description: "Submit QA test run results for logging and admin visibility" },
  { permission: "security:scan", description: "Submit security scan reports for admin review" },
  { permission: "sandbox:use", description: "Call safe sandbox endpoints that validate without writing data" },
  { permission: "logs:read", description: "Read activity logs scoped to the current Agent Key" },
  { permission: "system:admin", description: "Bypass individual permission checks — grants access to all endpoints" },
];

export default function DeveloperPage() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">ACP Developer API</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">
            Build bots and automations on top of the Anti-Corruption Party platform. Cross-post from other social media, automate engagement, or populate political data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Bearer Token Auth</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">No cookies or CSRF needed. Use your API key as a Bearer token.</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Rate Limiting</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">12 requests per hour per key (~1 per 5 min). 429 responses include a Retry-After header.</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Up to 10 Keys</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Generate up to 10 active API keys per account. Revoke any key instantly.</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">User Endpoints</TabsTrigger>
            <TabsTrigger value="admin">Admin Endpoints</TabsTrigger>
            <TabsTrigger value="agent">Agent API</TabsTrigger>
            <TabsTrigger value="errors">Errors & Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Getting Your API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>ACP+ subscription required</strong> — API key generation is available exclusively to ACP+ premium subscribers and admin accounts.
                  </div>
                </div>
                <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex gap-2"><span className="font-bold text-blue-600 dark:text-blue-400">1.</span> Navigate to <strong>Settings → Security</strong></li>
                  <li className="flex gap-2"><span className="font-bold text-blue-600 dark:text-blue-400">2.</span> Scroll to the <strong>API Keys</strong> section</li>
                  <li className="flex gap-2"><span className="font-bold text-blue-600 dark:text-blue-400">3.</span> Click <strong>Generate API Key</strong> and give it a descriptive name</li>
                  <li className="flex gap-2"><span className="font-bold text-blue-600 dark:text-blue-400">4.</span> Copy the key immediately — it is shown <strong>only once</strong></li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Using the API Key</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Include your API key in every request as a Bearer token in the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Authorization</code> header.
                </p>
                <CodeBlock code={`Authorization: Bearer acp_your_api_key_here`} />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Example curl request:</p>
                <CodeBlock code={`curl -X GET "${BASE_URL}/api/v1/me" \\
  -H "Authorization: Bearer acp_your_api_key_here" \\
  -H "Content-Type: application/json"`} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            {endpoints.map((ep) => (
              <Card key={ep.path + ep.method}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MethodBadge method={ep.method} />
                    <code className="text-sm font-mono text-slate-800 dark:text-slate-200">{ep.path}</code>
                    <TierBadge tier={ep.tier} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{ep.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ep.requestBody && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Request Body</p>
                      <CodeBlock code={ep.requestBody} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Response</p>
                    <CodeBlock code={ep.responseExample} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Example</p>
                    <CodeBlock code={`curl -X ${ep.method} "${BASE_URL}${ep.path}" \\
  -H "Authorization: Bearer acp_your_api_key_here"${ep.requestBody ? ` \\
  -H "Content-Type: application/json" \\
  -d '${ep.requestBody.replace(/\n/g, "").replace(/\s+/g, " ")}'` : ""}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800 dark:text-purple-200">
                Admin endpoints require an API key generated by an <strong>admin account</strong>. All write operations are permanent and affect live data.
              </div>
            </div>
            {adminEndpoints.map((ep) => (
              <Card key={ep.path + ep.method}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MethodBadge method={ep.method} />
                    <code className="text-sm font-mono text-slate-800 dark:text-slate-200">{ep.path}</code>
                    <TierBadge tier="admin" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{ep.summary}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Request Body</p>
                    <CodeBlock code={ep.requestBody} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Example</p>
                    <CodeBlock code={`curl -X ${ep.method} "${BASE_URL}${ep.path}" \\
  -H "Authorization: Bearer acp_admin_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '${ep.requestBody.replace(/\n/g, "").replace(/\s+/g, " ")}'`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="agent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  What Is the Agent API?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  The <strong>Agent API</strong> (<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/agent/*</code>) is a separate, scoped API designed for external AI agents and automation tools — such as Claude, Make.com workflows, or custom bots. It uses a different authentication mechanism and a fine-grained permission system, making it safer to share with automated systems.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Premium API (<code className="text-xs">/api/v1/*</code>)</div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                      <li>For individual users and apps</li>
                      <li><code className="text-xs">Authorization: Bearer</code> header</li>
                      <li>Tied to your user account</li>
                      <li>No scoped permissions</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <div className="font-semibold text-cyan-800 dark:text-cyan-200 mb-1">Agent API (<code className="text-xs">/api/agent/*</code>)</div>
                    <ul className="space-y-1 text-cyan-700 dark:text-cyan-300 list-disc list-inside">
                      <li>For bots, AI agents, automations</li>
                      <li><code className="text-xs">X-Agent-Key</code> header</li>
                      <li>Named key with an assigned role</li>
                      <li>Fine-grained permission map</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Getting an Agent Key:</strong> Agent Keys are created by platform administrators. Navigate to <strong>Admin → Agentic AI</strong> to generate and manage Agent Keys. Each key is shown only once at creation time.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pass your Agent Key in the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-Agent-Key</code> header on every request. Do not use the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Authorization</code> header — that is for the premium user API only.
                </p>
                <CodeBlock code={`X-Agent-Key: acp_agent_your_key_here`} />
                <CodeBlock code={`curl -X POST "${BASE_URL}/api/agent/auth/verify" \\
  -H "X-Agent-Key: acp_agent_your_key_here" \\
  -H "Content-Type: application/json"`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Response Envelope</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Every Agent API response uses a consistent envelope format regardless of success or failure.
                </p>
                <CodeBlock code={`{
  "success": true | false,
  "action": "articles:create",
  "data": { ... } | null,
  "errors": [],
  "meta": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "rate_limit_remaining": 58,
    "sandbox": false
  }
}`} />
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">action</code> — the operation that was attempted (matches the required permission)</p>
                  <p><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">errors</code> — array of <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{ message, details? }"}</code> objects on failure, empty on success</p>
                  <p><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">rate_limit_remaining</code> — requests left in the current hourly window</p>
                  <p><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">sandbox</code> — <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">true</code> when the key is in sandbox mode or the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/sandbox/</code> route was used</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Live Endpoints</h2>
              {agentEndpoints.map((ep) => (
                <Card key={ep.path + ep.method}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MethodBadge method={ep.method} />
                      <code className="text-sm font-mono text-slate-800 dark:text-slate-200">{ep.path}</code>
                      <PermissionBadge permission={ep.permission} />
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{ep.summary}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{ep.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ep.requestBody && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Request Body</p>
                        <CodeBlock code={ep.requestBody} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Response</p>
                      <CodeBlock code={ep.responseExample} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Example</p>
                      <CodeBlock code={
                        ep.curlBody
                          ? `curl -X ${ep.method} "${BASE_URL}${ep.path}" \\
  -H "X-Agent-Key: acp_agent_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d ${ep.curlBody}`
                          : `curl -X ${ep.method} "${BASE_URL}${ep.path}" \\
  -H "X-Agent-Key: acp_agent_your_key_here"`
                      } />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Sandbox Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Every live endpoint has a matching sandbox counterpart under <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/agent/sandbox/*</code>. Sandbox endpoints validate your request fully (auth, permissions, schema) but <strong>never write to the database</strong>. They return what would have been written instead.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Keys with <strong>Sandbox Mode</strong> enabled automatically use sandbox behavior on every call — even on live routes. Keys assigned the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">qa_agent</code> role are always sandboxed.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Available sandbox routes</p>
                  <div className="text-sm font-mono text-slate-700 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    {[
                      "POST /api/agent/sandbox/auth/verify",
                      "POST /api/agent/sandbox/articles/create",
                      "PUT  /api/agent/sandbox/articles/update",
                      "PUT  /api/agent/sandbox/articles/:id",
                      "POST /api/agent/sandbox/moderation/flag",
                      "POST /api/agent/sandbox/users/ban",
                      "POST /api/agent/sandbox/politicians/import",
                      "PUT  /api/agent/sandbox/politicians/update",
                      "PUT  /api/agent/sandbox/politicians/:id",
                      "POST /api/agent/sandbox/elections/sync",
                      "POST /api/agent/sandbox/testing/run",
                      "POST /api/agent/sandbox/security/scan",
                      "GET  /api/agent/sandbox/logs",
                    ].map((r) => <div key={r}>{r}</div>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Sandbox dry-run example</p>
                  <CodeBlock code={`curl -X POST "${BASE_URL}/api/agent/sandbox/articles/create" \\
  -H "X-Agent-Key: acp_agent_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test headline","body":"Test body text","tags":["test"]}'`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Sandbox response</p>
                  <CodeBlock code={`{
  "success": true,
  "action": "articles:create:sandbox",
  "data": {
    "sandbox": true,
    "wouldCreate": {
      "title": "Test headline",
      "body": "Test body text",
      "tags": ["test"]
    }
  },
  "errors": [],
  "meta": { "timestamp": "...", "rate_limit_remaining": 58, "sandbox": true }
}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Permissions Reference</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
                  {agentPermissions.map(({ permission, description }) => (
                    <div key={permission} className="py-3 flex gap-4 items-start">
                      <code className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 w-40 flex-shrink-0 mt-0.5">{permission}</code>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>HTTP Status Codes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { code: "200 / 201", label: "Success", desc: "Request succeeded. 201 is returned for resource creation." },
                    { code: "202", label: "Accepted", desc: "Report submitted successfully (elections/sync, testing/run, security/scan). The report is queued for admin review, not immediately applied." },
                    { code: "400", label: "Bad Request", desc: "Missing or invalid fields in the request body. Check the errors array (Agent API) or the error field (Premium API) for details." },
                    { code: "401", label: "Unauthorized", desc: "Missing, invalid, revoked, or expired key. For the Agent API: X-Agent-Key header missing or hash not found. For the Premium API: Bearer token missing or invalid." },
                    { code: "403", label: "Forbidden", desc: "Your key is valid but lacks the required permission. For the Agent API, the errors array will include the missing permission name (e.g. \"articles:create\"). For the Premium API: non-premium or non-admin key on a restricted endpoint." },
                    { code: "404", label: "Not Found", desc: "The resource targeted by the request (user, post, politician profile) does not exist." },
                    { code: "429", label: "Rate Limited", desc: "You have exceeded the hourly request limit. The response includes a Retry-After header (seconds) and retryAfterSeconds in the JSON body." },
                    { code: "500", label: "Server Error", desc: "An internal error occurred. Please retry after a short delay." },
                  ].map(({ code, label, desc }) => (
                    <div key={code} className="flex gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 w-16 flex-shrink-0">{code}</code>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
                        <span className="text-slate-600 dark:text-slate-400"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Agent API Error Responses</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Agent API errors always use the standard envelope with <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">success: false</code>.</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">401 — Missing or invalid key</p>
                    <CodeBlock code={`{
  "success": false,
  "action": null,
  "data": null,
  "errors": [{ "message": "Invalid or missing X-Agent-Key" }],
  "meta": { "timestamp": "..." }
}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">403 — Permission denied</p>
                    <CodeBlock code={`{
  "success": false,
  "action": "articles:create",
  "data": null,
  "errors": [{ "message": "Permission denied: articles:create" }],
  "meta": { "timestamp": "...", "rate_limit_remaining": 58, "sandbox": false }
}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">429 — Rate limit exceeded</p>
                    <CodeBlock code={`HTTP/1.1 429 Too Many Requests
Retry-After: 1800

{
  "success": false,
  "action": null,
  "data": null,
  "errors": [{ "message": "Rate limit exceeded" }],
  "meta": { "timestamp": "...", "rate_limit_remaining": 0, "sandbox": false }
}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Rate Limiting</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Each API key is limited to <strong>12 requests per hour</strong> (approximately 1 request every 5 minutes).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Rate limits are per-key. Generating multiple keys increases your total throughput.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>When rate limited, the response includes <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Retry-After</code> (seconds) and <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">retryAfterSeconds</code> in the JSON body.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Agent API keys also expose <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">rate_limit_remaining</code> in every response envelope so your bot can self-throttle.</span>
                </div>
                <CodeBlock code={`HTTP/1.1 429 Too Many Requests
Retry-After: 300

{
  "error": "Rate limit exceeded. API keys allow 12 requests per hour.",
  "retryAfterSeconds": 300
}`} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
