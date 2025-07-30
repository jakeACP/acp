import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Vote, Users, Shield, Megaphone } from "lucide-react";
import logoPath from "@assets/logo1_1753819424851.png";
import { Redirect, Link } from "wouter";

const loginSchema = insertUserSchema.pick({ username: true, password: true });
const registerSchema = insertUserSchema.extend({
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
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
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue participating in democracy
                  </CardDescription>
                </CardHeader>
                <CardContent>
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                  
                  <div className="mt-4 text-center">
                    <Link href="/forgot-password">
                      <Button variant="link" className="text-sm text-slate-600 hover:text-slate-900">
                        Forgot your password?
                      </Button>
                    </Link>
                  </div>
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
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.email.message}
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
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
