import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, Shield, KeyRound, CheckCircle } from "lucide-react";
import logoPath from "@assets/logo-tpb_1763998990798.png";

// Standard email reset schema — also accepts "admin" as a special value
const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Required").refine(
    v => v === "admin" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Please enter a valid email address"
  ),
});

const adminResetSchema = z.object({
  passphrase: z.string().min(1, "Passphrase is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
type AdminResetData = z.infer<typeof adminResetSchema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const { toast } = useToast();

  const emailForm = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const adminForm = useForm<AdminResetData>({
    resolver: zodResolver(adminResetSchema),
    defaultValues: { passphrase: "", newPassword: "", confirmPassword: "" },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return apiRequest("/api/forgot-password", "POST", data);
    },
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const adminResetMutation = useMutation({
    mutationFn: async (data: AdminResetData) => {
      return apiRequest("/api/admin-passphrase-reset", "POST", {
        passphrase: data.passphrase,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setResetDone(true);
      toast({ title: "Password Reset", description: "Admin password updated successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Incorrect passphrase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onEmailSubmit = (data: ForgotPasswordData) => {
    if (data.email.trim().toLowerCase() === "admin") {
      setAdminMode(true);
      return;
    }
    forgotPasswordMutation.mutate(data);
  };

  // ── Success: email sent ─────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12 mr-3" />
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
            </div>
            <CardDescription>
              We've sent password reset instructions to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-slate-600 mb-4">
                If an account with that email exists, you'll receive a password reset link shortly.
              </p>
              <p className="text-sm text-slate-500">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
            </div>
            <Link href="/auth">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success: admin password reset ───────────────────────────────────────────
  if (resetDone) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12 mr-3" />
              <CardTitle className="text-2xl">Password Updated</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-slate-600 mb-4">
                The admin password has been reset. You can now log in with your new password.
              </p>
            </div>
            <Link href="/auth">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Admin passphrase mode ───────────────────────────────────────────────────
  if (adminMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12 mr-3" />
              <CardTitle className="text-2xl">Admin Recovery</CardTitle>
            </div>
            <CardDescription>
              Enter your 10-word recovery passphrase and choose a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(d => adminResetMutation.mutate(d))} className="space-y-5">
                <FormField
                  control={adminForm.control}
                  name="passphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recovery Passphrase</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter all 10 words separated by spaces"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={adminForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={adminForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repeat new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={adminResetMutation.isPending} className="w-full">
                  {adminResetMutation.isPending ? "Verifying…" : "Reset Admin Password"}
                </Button>
              </form>
            </Form>

            <div className="mt-4">
              <Button variant="ghost" className="w-full" onClick={() => setAdminMode(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-2">
                <KeyRound className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Admin-Only Recovery</p>
                  <p className="mt-1">This form only works for the admin account. Your passphrase is stored in Replit Secrets.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Default: email form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={logoPath} alt="Anti-Corruption Party" className="h-12 w-12 mr-3" />
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full"
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-500">Or</span>
              </div>
            </div>

            <Link href="/auth">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-2 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">
                  For your security, password reset links expire after 1 hour and can only be used once.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
