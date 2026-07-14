import { useEffect, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SiApple, SiGoogle } from "react-icons/si";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { useAuth, type TwoFactorRequirement } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { toPublicWebUrl } from "@/lib/native";
import logoPath from "@assets/logo-tpb_1763998990798.png";
import "../mobile-theme.css";

const loginSchema = insertUserSchema.pick({ username: true, password: true });
const phoneNumberRegex = /^[\d\s\-\(\)\+]+$/;
const registerSchema = insertUserSchema.extend({
  email: z.string().email("Enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string()
    .max(20, "Phone number is too long")
    .regex(phoneNumberRegex, "Enter a valid phone number")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Phone number must contain at least 10 digits"),
  invitationToken: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

function errorText(error?: { message?: string }) {
  return error?.message || "Please check the information and try again.";
}

function configureCredentialInput(element: HTMLInputElement | null) {
  if (!element) return;

  // Set real DOM attributes as well as React props. WKWebView uses these to
  // choose its keyboard behavior, while leaving the entered value untouched.
  element.setAttribute("autocapitalize", "none");
  element.setAttribute("autocorrect", "off");
  element.setAttribute("spellcheck", "false");
  element.style.textTransform = "none";
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mobile-auth-error">{message}</p> : null;
}

export function MobileAuthPage() {
  const { user, loginMutation, registerMutation, verify2FAMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorRequirement | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { invitationToken: "", phoneNumber: "" },
  });

  const loginUsername = loginForm.register("username");
  const loginPassword = loginForm.register("password");
  const registerUsername = registerForm.register("username");
  const registerPassword = registerForm.register("password");

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    setMode(params.get("mode") === "register" ? "register" : "login");
  }, [location]);

  if (user) return <Redirect to="/mobile" />;

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    navigate(nextMode === "register" ? "/auth?mode=register" : "/auth", { replace: true });
  };

  const sendSmsCode = async (challengeToken: string) => {
    setSmsSending(true);
    try {
      await apiRequest("/api/2fa/sms/send", "POST", { challengeToken });
    } finally {
      setSmsSending(false);
    }
  };

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        if ("requiresTwoFactor" in response && response.requiresTwoFactor) {
          setTwoFactorData(response);
          if (response.twoFactorMethod === "sms") sendSmsCode(response.challengeToken);
        }
      },
    });
  };

  const onRegister = (data: RegisterData) => {
    const { invitationToken, ...rest } = data;
    registerMutation.mutate((invitationToken ? data : rest) as any);
  };

  const onVerifyTwoFactor = () => {
    if (!twoFactorData) return;
    verify2FAMutation.mutate({
      challengeToken: twoFactorData.challengeToken,
      method: twoFactorData.twoFactorMethod || "totp",
      code: twoFactorCode,
      rememberDevice,
    });
  };

  return (
    <main className="mobile-auth-root" data-testid="mobile-auth-page">
      <div className="mobile-auth-content">
        <header className="mobile-auth-brand">
          <img src={logoPath} alt="Anti-Corruption Party" className="mobile-auth-logo" />
          <div>
            <p className="mobile-auth-kicker">ANTI-CORRUPTION PARTY</p>
            <h1>Welcome to ACP</h1>
          </div>
        </header>

        <section className="mobile-auth-panel" aria-label={mode === "login" ? "Sign in" : "Create account"}>
          {twoFactorData ? (
            <div className="mobile-auth-form">
              <div className="mobile-auth-icon">
                {twoFactorData.twoFactorMethod === "sms" ? <Smartphone /> : <KeyRound />}
              </div>
              <div className="mobile-auth-heading">
                <h2>Verify it&apos;s you</h2>
                <p>{twoFactorData.twoFactorMethod === "sms" ? `Enter the code sent to ${twoFactorData.phone}` : "Enter the code from your authenticator app."}</p>
              </div>
              <label className="mobile-auth-label" htmlFor="mobile-two-factor">Verification code</label>
              <input
                id="mobile-two-factor"
                className="mobile-auth-input mobile-auth-code"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
              />
              <label className="mobile-auth-check">
                <input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} />
                <span>Trust this device for 60 days</span>
              </label>
              <FieldError message={verify2FAMutation.error?.message} />
              <button className="mobile-auth-primary" type="button" onClick={onVerifyTwoFactor} disabled={verify2FAMutation.isPending || twoFactorCode.length < 6}>
                {verify2FAMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Verify and continue
              </button>
              {twoFactorData.twoFactorMethod === "sms" && (
                <button className="mobile-auth-secondary" type="button" onClick={() => sendSmsCode(twoFactorData.challengeToken)} disabled={smsSending}>
                  {smsSending ? "Sending code..." : "Resend code"}
                </button>
              )}
              <button className="mobile-auth-text-button" type="button" onClick={() => { setTwoFactorData(null); setTwoFactorCode(""); }}>
                Back to sign in
              </button>
            </div>
          ) : mode === "login" ? (
            <form className="mobile-auth-form" onSubmit={loginForm.handleSubmit(onLogin)}>
              <div className="mobile-auth-heading">
                <h2>Sign in</h2>
                <p>Pick up where your civic work left off.</p>
              </div>
              <label className="mobile-auth-label" htmlFor="mobile-username">Username, email, or phone</label>
              <div className="mobile-auth-input-wrap">
                <UserRound aria-hidden="true" />
                <input
                  id="mobile-username"
                  type="text"
                  {...loginUsername}
                  ref={(element) => { loginUsername.ref(element); configureCredentialInput(element); }}
                  className="mobile-auth-input"
                  placeholder="Enter your username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  autoComplete="username"
                  disabled={loginMutation.isPending}
                />
              </div>
              <FieldError message={loginForm.formState.errors.username?.message} />

              <label className="mobile-auth-label" htmlFor="mobile-password">Password</label>
              <div className="mobile-auth-input-wrap">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="mobile-password"
                  type={showPassword ? "text" : "password"}
                  {...loginPassword}
                  ref={(element) => { loginPassword.ref(element); configureCredentialInput(element); }}
                  className="mobile-auth-input"
                  placeholder="Enter your password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
                <button className="mobile-auth-eye" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <FieldError message={loginForm.formState.errors.password?.message} />
              <FieldError message={loginMutation.error ? errorText(loginMutation.error) : undefined} />

              <Link href="/forgot-password" className="mobile-auth-forgot">Forgot password?</Link>
              <button className="mobile-auth-primary" type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Sign in
              </button>
              <div className="mobile-auth-divider"><span>or</span></div>
              <a className="mobile-auth-social" href={toPublicWebUrl("/auth/apple")}><SiApple /> Continue with Apple</a>
              <a className="mobile-auth-social" href={toPublicWebUrl("/auth/google")}><SiGoogle className="mobile-auth-google" /> Continue with Google</a>
              <p className="mobile-auth-switch">New to ACP? <button type="button" onClick={() => switchMode("register")}>Create an account</button></p>
            </form>
          ) : (
            <form className="mobile-auth-form" onSubmit={registerForm.handleSubmit(onRegister)}>
              <div className="mobile-auth-heading">
                <h2>Create an account</h2>
                <p>Join the movement for transparent government.</p>
              </div>
              <div className="mobile-auth-two-columns">
                <div>
                  <label className="mobile-auth-label" htmlFor="mobile-first-name">First name</label>
                  <input id="mobile-first-name" className="mobile-auth-input mobile-auth-plain-input" placeholder="First name" autoCapitalize="words" {...registerForm.register("firstName")} />
                  <FieldError message={registerForm.formState.errors.firstName?.message} />
                </div>
                <div>
                  <label className="mobile-auth-label" htmlFor="mobile-last-name">Last name</label>
                  <input id="mobile-last-name" className="mobile-auth-input mobile-auth-plain-input" placeholder="Last name" autoCapitalize="words" {...registerForm.register("lastName")} />
                  <FieldError message={registerForm.formState.errors.lastName?.message} />
                </div>
              </div>
              <label className="mobile-auth-label" htmlFor="mobile-email">Email</label>
              <input id="mobile-email" type="email" className="mobile-auth-input mobile-auth-plain-input" placeholder="you@example.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} {...registerForm.register("email")} />
              <FieldError message={registerForm.formState.errors.email?.message} />
              <label className="mobile-auth-label" htmlFor="mobile-phone">Phone number</label>
              <input id="mobile-phone" type="tel" className="mobile-auth-input mobile-auth-plain-input" placeholder="(555) 123-4567" {...registerForm.register("phoneNumber")} />
              <FieldError message={registerForm.formState.errors.phoneNumber?.message} />
              <label className="mobile-auth-label" htmlFor="mobile-register-username">Username</label>
              <input
                id="mobile-register-username"
                type="text"
                {...registerUsername}
                ref={(element) => { registerUsername.ref(element); configureCredentialInput(element); }}
                className="mobile-auth-input mobile-auth-plain-input"
                placeholder="Choose a username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                autoComplete="username"
              />
              <FieldError message={registerForm.formState.errors.username?.message} />
              <label className="mobile-auth-label" htmlFor="mobile-register-password">Password</label>
              <input
                id="mobile-register-password"
                type="password"
                {...registerPassword}
                ref={(element) => { registerPassword.ref(element); configureCredentialInput(element); }}
                className="mobile-auth-input mobile-auth-plain-input"
                placeholder="Create a password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="new-password"
              />
              <FieldError message={registerForm.formState.errors.password?.message} />
              <label className="mobile-auth-label" htmlFor="mobile-invite">Invitation code <span>Optional</span></label>
              <input id="mobile-invite" className="mobile-auth-input mobile-auth-plain-input" placeholder="Enter code" autoCapitalize="none" autoCorrect="off" spellCheck={false} {...registerForm.register("invitationToken")} />
              <FieldError message={registerMutation.error ? errorText(registerMutation.error) : undefined} />
              <button className="mobile-auth-primary" type="submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Create account
              </button>
              <p className="mobile-auth-switch">Already a member? <button type="button" onClick={() => switchMode("login")}>Sign in</button></p>
            </form>
          )}
        </section>
        <p className="mobile-auth-footer">Anti-Corruption Party · United against corruption</p>
      </div>
    </main>
  );
}
