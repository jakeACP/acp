import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, TwoFactorRequirement } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Vote, Users, Shield, Megaphone, AlertCircle, Smartphone, Key, MapPin, Newspaper, Clock } from "lucide-react";
import logoPath from "@assets/logo-tpb_1763998990798.png";
import { Redirect, Link, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your username, email, or phone"),
  password: z.string().min(1, "Password is required"),
});

const phoneNumberRegex = /^[\d\s\-\(\)\+]+$/;

const registerSchema = insertUserSchema.extend({
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string()
    .max(20, "Phone number is too long")
    .regex(phoneNumberRegex, "Please enter a valid phone number")
    .refine(
      (val) => val.replace(/\D/g, '').length >= 10,
      "Phone number must contain at least 10 digits"
    ),
  invitationToken: z.string().optional(),
  addressZip: z.string().min(1, "ZIP code is required"),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, verify2FAMutation } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [location] = useLocation();

  const [twoFactorData, setTwoFactorData] = useState<TwoFactorRequirement | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      invitationToken: "",
      phoneNumber: "",
      addressZip: "",
      addressStreet: "",
      addressCity: "",
      addressState: "",
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const token = urlParams.get('invitation');

    if (token) {
      setInvitationToken(token);
      registerForm.setValue('invitationToken', token);
      fetch(`/api/invitations/${token}/validate`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (!data.valid) {
            setInvitationError(data.reason || 'Invalid invitation token');
          } else {
            setInvitationError(null);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setInvitationError('Failed to validate invitation token');
          }
        });
    } else {
      setInvitationError(null);
    }
    return () => controller.abort();
  }, [location, registerForm]);

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        if ('requiresTwoFactor' in response && response.requiresTwoFactor) {
          setTwoFactorData(response);
          if (response.twoFactorMethod === 'sms') {
            sendSmsCode(response.challengeToken);
          }
        }
      },
    });
  };

  const sendSmsCode = async (challengeToken: string) => {
    setSmsSending(true);
    try {
      await apiRequest('/api/2fa/sms/send', 'POST', { challengeToken });
    } catch (error) {
      console.error('Failed to send SMS:', error);
    } finally {
      setSmsSending(false);
    }
  };

  const onVerify2FA = () => {
    if (!twoFactorData) return;
    verify2FAMutation.mutate({
      challengeToken: twoFactorData.challengeToken,
      method: twoFactorData.twoFactorMethod || 'totp',
      code: twoFactorCode,
      rememberDevice,
    }, {
      onSuccess: () => {
        setTwoFactorData(null);
        setTwoFactorCode("");
      },
    });
  };

  const cancelTwoFactor = () => {
    setTwoFactorData(null);
    setTwoFactorCode("");
    setRememberDevice(false);
  };

  const { data: publicArticles = [] } = useQuery<any[]>({
    queryKey: ["/api/public/articles"],
    staleTime: 60_000,
  });

  const onRegister = (data: RegisterData) => {
    const { invitationToken, ...rest } = data;
    const payload = invitationToken ? data : rest;
    registerMutation.mutate(payload as any);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 px-8 flex items-center gap-3">
        <img src={logoPath} alt="ACP" className="h-8 w-8" />
        <span className="text-xl font-bold">ACP Democracy</span>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)]">

        {/* ── LEFT: Login (15%) ─────────────────────────────────────────── */}
        <div className="lg:w-[15%] lg:min-w-[200px] flex items-start justify-center p-4 lg:p-5 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto lg:max-h-[calc(100vh-60px)]">
          <div className="w-full">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Sign In</h2>
              <p className="text-slate-500 text-xs mt-1">Access your ACP account</p>
            </div>

            {twoFactorData ? (
              <Card>
                <CardHeader>
                  <CardTitle>{twoFactorData.twoFactorMethod === 'sms' ? "Check Your Phone" : "Authenticator Code"}</CardTitle>
                  <CardDescription>
                    {twoFactorData.twoFactorMethod === 'sms'
                      ? `Enter the code sent to ${twoFactorData.phone}`
                      : "Enter the code from your authenticator app"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center mb-2">
                    {twoFactorData.twoFactorMethod === 'sms'
                      ? <Smartphone className="h-10 w-10 text-primary" />
                      : <Key className="h-10 w-10 text-primary" />}
                  </div>
                  <div>
                    <Label htmlFor="twoFactorCode">Verification Code</Label>
                    <Input
                      id="twoFactorCode"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest mt-1"
                      disabled={verify2FAMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberDevice"
                      checked={rememberDevice}
                      onCheckedChange={(checked) => setRememberDevice(checked === true)}
                    />
                    <Label htmlFor="rememberDevice" className="text-sm text-slate-600">
                      Trust this device for 60 days
                    </Label>
                  </div>
                  {verify2FAMutation.error && (
                    <ErrorMessage message={verify2FAMutation.error.message || "Verification failed."} variant="error" />
                  )}
                  <Button className="w-full" onClick={onVerify2FA} disabled={verify2FAMutation.isPending || twoFactorCode.length < 6}>
                    {verify2FAMutation.isPending ? <><LoadingSpinner size="sm" className="mr-2" />Verifying...</> : "Verify"}
                  </Button>
                  {twoFactorData.twoFactorMethod === 'sms' && (
                    <Button variant="outline" className="w-full" onClick={() => sendSmsCode(twoFactorData.challengeToken)} disabled={smsSending}>
                      {smsSending ? "Sending..." : "Resend Code"}
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full" onClick={cancelTwoFactor}>Back to Login</Button>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="identifier">Username, Email, or Phone</Label>
                  <Input
                    id="identifier"
                    {...loginForm.register("identifier")}
                    placeholder="Enter username, email, or phone"
                    autoComplete="username"
                    disabled={loginMutation.isPending}
                    className="mt-1"
                  />
                  {loginForm.formState.errors.identifier && (
                    <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.identifier.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    {...loginForm.register("password")}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loginMutation.isPending}
                    className="mt-1"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {loginMutation.error && (
                  <ErrorMessage
                    message={loginMutation.error.message || "Login failed. Please check your credentials."}
                    variant="error"
                    data-testid="login-error-alert"
                  />
                )}

                <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login-submit">
                  {loginMutation.isPending ? <><LoadingSpinner size="sm" className="mr-2" />Signing In...</> : "Sign In"}
                </Button>

                <div className="text-center">
                  <Link href="/forgot-password">
                    <Button variant="link" className="text-sm text-slate-500 hover:text-slate-800 p-0 h-auto">
                      Forgot your password?
                    </Button>
                  </Link>
                </div>
              </form>
            )}

            {/* Feature highlights */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
              {[
                { icon: Users, label: "Community Driven" },
                { icon: Vote, label: "Direct Democracy" },
                { icon: Shield, label: "Transparent" },
                { icon: Megaphone, label: "Candidate Support" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER: Articles Feed (70%) ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 lg:max-h-[calc(100vh-60px)]">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-800">Latest News</h2>
          </div>
          {publicArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Newspaper className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No articles yet — check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicArticles.map((article: any) => (
                <Card key={article.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {(article.image || article.featuredImage) && (
                      <img
                        src={article.image || article.featuredImage}
                        alt={article.title}
                        className="w-full h-40 object-cover rounded-md mb-3"
                      />
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {article.type && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {article.type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {article.createdAt && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {new Date(article.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {article.title && (
                      <h3 className="font-semibold text-slate-900 leading-snug mb-1">{article.title}</h3>
                    )}
                    {(article.excerpt || article.content) && (
                      <p className="text-sm text-slate-500 line-clamp-3">{article.excerpt || article.content}</p>
                    )}
                    {(article.newsSourceName || article.author?.displayName) && (
                      <p className="text-xs text-slate-400 mt-2">
                        {article.newsSourceName || `By ${article.author?.displayName}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sign Up (15%) ──────────────────────────────────────── */}
        <div className="lg:w-[15%] lg:min-w-[200px] flex items-start justify-center p-4 lg:p-5 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto lg:max-h-[calc(100vh-60px)]">
          <div className="w-full">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Create Account</h2>
              <p className="text-slate-500 text-xs mt-1">Join the movement for transparent governance</p>
            </div>

            {invitationError && (
              <Alert className="mb-4" variant="destructive" data-testid="alert-invitation-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{invitationError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...registerForm.register("firstName")}
                    placeholder="First name"
                    disabled={registerMutation.isPending}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...registerForm.register("lastName")}
                    placeholder="Last name"
                    disabled={registerMutation.isPending}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="regUsername">Username</Label>
                <Input
                  id="regUsername"
                  {...registerForm.register("username")}
                  placeholder="Choose a username"
                  disabled={registerMutation.isPending}
                  className="mt-1"
                />
                {registerForm.formState.errors.username && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="regEmail">Email</Label>
                <Input
                  id="regEmail"
                  type="email"
                  {...registerForm.register("email")}
                  placeholder="Enter your email"
                  disabled={registerMutation.isPending}
                  data-testid="input-email"
                  className="mt-1"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="regPhone">Phone Number</Label>
                <Input
                  id="regPhone"
                  type="tel"
                  {...registerForm.register("phoneNumber")}
                  placeholder="(555) 123-4567"
                  disabled={registerMutation.isPending}
                  data-testid="input-phone-number"
                  className="mt-1"
                />
                {registerForm.formState.errors.phoneNumber && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.phoneNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="regPassword">Password</Label>
                <Input
                  id="regPassword"
                  type="password"
                  {...registerForm.register("password")}
                  placeholder="Create a password"
                  disabled={registerMutation.isPending}
                  className="mt-1"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* ── Address Section ── */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-slate-700">Address Information</span>
                </div>

                <div>
                  <Label htmlFor="addressZip">
                    ZIP Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressZip"
                    {...registerForm.register("addressZip")}
                    placeholder="ZIP code"
                    maxLength={10}
                    disabled={registerMutation.isPending}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.addressZip && (
                    <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.addressZip.message}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    To match you with the most accurate candidates, a verified address is recommended. We will never share this information.
                  </p>
                </div>

                <div className="mt-3">
                  <Label htmlFor="addressStreet">Street <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input
                    id="addressStreet"
                    {...registerForm.register("addressStreet")}
                    placeholder="123 Main St"
                    disabled={registerMutation.isPending}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="addressCity">City <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      id="addressCity"
                      {...registerForm.register("addressCity")}
                      placeholder="City"
                      disabled={registerMutation.isPending}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressState">State <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      id="addressState"
                      {...registerForm.register("addressState")}
                      placeholder="CA"
                      maxLength={2}
                      disabled={registerMutation.isPending}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Invitation token */}
              <div>
                <Label htmlFor="invitationToken">Invitation Code <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  id="invitationToken"
                  {...registerForm.register("invitationToken")}
                  placeholder="Enter invite code"
                  disabled={registerMutation.isPending || !!invitationToken}
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">
                  If you were invited, enter their code to become friends automatically
                </p>
              </div>

              {registerMutation.error && (
                <ErrorMessage
                  message={registerMutation.error.message || "Registration failed. Please try again."}
                  variant="error"
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending || !!invitationError}
                data-testid="button-register"
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
