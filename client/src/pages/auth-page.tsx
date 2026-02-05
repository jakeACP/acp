import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, TwoFactorRequirement } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Vote, Users, Shield, Megaphone, AlertCircle, Smartphone, Key } from "lucide-react";
import logoPath from "@assets/logo-tpb_1763998990798.png";
import { Redirect, Link, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ErrorMessage } from "@/components/error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = insertUserSchema.pick({ username: true, password: true });

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
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, verify2FAMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [location] = useLocation();
  
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorRequirement | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      invitationToken: "",
      phoneNumber: "",
    },
  });

  // Extract invitation token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const token = urlParams.get('invitation');
    
    if (token) {
      setInvitationToken(token);
      registerForm.setValue('invitationToken', token);
      setActiveTab('register'); // Switch to register tab if invitation link is used
      
      // Validate invitation token
      fetch(`/api/invitations/${token}/validate`)
        .then(res => res.json())
        .then(data => {
          if (!data.valid) {
            setInvitationError(data.reason || 'Invalid invitation token');
          } else {
            setInvitationError(null);
          }
        })
        .catch(() => {
          setInvitationError('Failed to validate invitation token');
        });
    } else {
      // No invitation token - allow open registration
      setInvitationError(null);
    }
  }, [location, registerForm]);

  // Redirect if already logged in
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

  const onRegister = (data: RegisterData) => {
    // Remove invitationToken if it's empty/undefined
    const { invitationToken, ...rest } = data;
    const payload = invitationToken ? data : rest;
    registerMutation.mutate(payload as any);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12 mr-3" />
              <h1 className="text-2xl font-bold text-slate-900">ACP Democracy</h1>
            </div>
            <p className="text-slate-600">Join the Anti-Corruption Party movement for transparent governance</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{twoFactorData ? "Two-Factor Authentication" : "Welcome Back"}</CardTitle>
                  <CardDescription>
                    {twoFactorData 
                      ? twoFactorData.twoFactorMethod === 'sms'
                        ? `Enter the code sent to ${twoFactorData.phone}`
                        : "Enter the code from your authenticator app"
                      : "Sign in to your account to continue participating in democracy"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {twoFactorData ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center mb-4">
                        {twoFactorData.twoFactorMethod === 'sms' ? (
                          <Smartphone className="h-12 w-12 text-primary" />
                        ) : (
                          <Key className="h-12 w-12 text-primary" />
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="twoFactorCode">Verification Code</Label>
                        <Input
                          id="twoFactorCode"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest"
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
                        <ErrorMessage
                          message={verify2FAMutation.error.message || "Verification failed. Please try again."}
                          variant="error"
                        />
                      )}

                      <div className="space-y-2">
                        <Button
                          type="button"
                          className="w-full"
                          onClick={onVerify2FA}
                          disabled={verify2FAMutation.isPending || twoFactorCode.length < 6}
                        >
                          {verify2FAMutation.isPending ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Verifying...
                            </>
                          ) : (
                            "Verify"
                          )}
                        </Button>

                        {twoFactorData.twoFactorMethod === 'sms' && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => sendSmsCode(twoFactorData.challengeToken)}
                            disabled={smsSending}
                          >
                            {smsSending ? "Sending..." : "Resend Code"}
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={cancelTwoFactor}
                        >
                          Back to Login
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            {...loginForm.register("username")}
                            placeholder="Enter your username"
                            disabled={loginMutation.isPending}
                          />
                          {loginForm.formState.errors.username && (
                            <p className="text-sm text-destructive mt-1">
                              {loginForm.formState.errors.username.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            {...loginForm.register("password")}
                            placeholder="Enter your password"
                            disabled={loginMutation.isPending}
                          />
                          {loginForm.formState.errors.password && (
                            <p className="text-sm text-destructive mt-1">
                              {loginForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        {loginMutation.error && (
                          <ErrorMessage
                            message={loginMutation.error.message || "Login failed. Please check your credentials and try again."}
                            variant="error"
                            className="mb-4"
                            data-testid="login-error-alert"
                          />
                        )}

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loginMutation.isPending}
                          data-testid="button-login-submit"
                        >
                          {loginMutation.isPending ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Signing In...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                      
                      <div className="mt-4 text-center">
                        <Link href="/forgot-password">
                          <Button variant="link" className="text-sm text-slate-600 hover:text-slate-900">
                            Forgot your password?
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join thousands of citizens working for transparent democracy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitationError && (
                    <Alert className="mb-4" variant="destructive" data-testid="alert-invitation-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {invitationError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...registerForm.register("firstName")}
                          placeholder="First name"
                          disabled={registerMutation.isPending}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...registerForm.register("lastName")}
                          placeholder="Last name"
                          disabled={registerMutation.isPending}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...registerForm.register("email")}
                        placeholder="Enter your email"
                        disabled={registerMutation.isPending}
                        data-testid="input-email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        {...registerForm.register("phoneNumber")}
                        placeholder="(555) 123-4567"
                        disabled={registerMutation.isPending}
                        data-testid="input-phone-number"
                      />
                      {registerForm.formState.errors.phoneNumber && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.phoneNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="regUsername">Username</Label>
                      <Input
                        id="regUsername"
                        {...registerForm.register("username")}
                        placeholder="Choose a username"
                        disabled={registerMutation.isPending}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
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
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="invitationToken">Invitation Code (Optional)</Label>
                      <Input
                        id="invitationToken"
                        type="text"
                        {...registerForm.register("invitationToken")}
                        placeholder="Enter your invite code"
                        disabled={registerMutation.isPending || !!invitationToken}
                      />
                      {invitationError && (
                        <p className="text-sm text-destructive mt-1">
                          {invitationError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        If you were invited by a member, enter their code to become friends automatically
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending || !!invitationError}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 bg-primary text-primary-foreground p-8 flex items-center justify-center">
        <div className="max-w-lg text-center">
          <div className="mb-8">
            <img src={logoPath} alt="Anti-Corruption Party" className="h-20 w-20 mx-auto mb-4 opacity-90" />
          </div>
          <h2 className="text-3xl font-bold mb-6">
            Democracy That Works for Everyone
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join the Anti-Corruption Party platform where transparency meets action.
            Vote on issues that matter, connect with like-minded citizens, and help
            build a better democracy.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold mb-1">Community Driven</h3>
              <p className="text-sm opacity-75">Join groups focused on issues you care about</p>
            </div>

            <div className="text-center">
              <Vote className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold mb-1">Direct Democracy</h3>
              <p className="text-sm opacity-75">Vote on polls and referenda that shape policy</p>
            </div>

            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold mb-1">Transparent</h3>
              <p className="text-sm opacity-75">All funding and decisions are public record</p>
            </div>

            <div className="text-center">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold mb-1">Candidate Support</h3>
              <p className="text-sm opacity-75">Connect with candidates who share your values</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
