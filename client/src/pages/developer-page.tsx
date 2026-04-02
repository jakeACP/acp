import { Navigation } from "@/components/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Shield, Zap, Key, AlertTriangle, CheckCircle } from "lucide-react";

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
          <TabsList className="mb-6">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">User Endpoints</TabsTrigger>
            <TabsTrigger value="admin">Admin Endpoints</TabsTrigger>
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

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>HTTP Status Codes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { code: "200 / 201", label: "Success", desc: "Request succeeded. 201 is returned for resource creation." },
                    { code: "400", label: "Bad Request", desc: "Missing or invalid fields in the request body. Check the `error` field for details." },
                    { code: "401", label: "Unauthorized", desc: "Missing, invalid, or revoked API key." },
                    { code: "403", label: "Forbidden", desc: "Your key is valid but doesn't have permission (e.g. non-premium user, non-admin key on admin endpoint)." },
                    { code: "429", label: "Rate Limited", desc: "You have exceeded 12 requests per hour. The response includes a `Retry-After` header (seconds)." },
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
