import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowLeft, Lock, User, Mail, Camera, Shield, Settings as SettingsIcon, CheckCircle2, AlertCircle, BadgeCheck } from "lucide-react";
import { Link } from "wouter";
import type { UploadResult } from "@uppy/core";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

const voterVerificationSchema = z.object({
  fullLegalName: z.string().min(1, "Full legal name is required"),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssnLast4: z.string().length(4, "Must be exactly 4 digits").regex(/^\d{4}$/, "Must be 4 digits"),
  stateIdPhotoUrl: z.string().min(1, "State ID photo is required"),
  selfiePhotoUrl: z.string().min(1, "Selfie photo is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  emailAddress: z.string().email("Must be a valid email address"),
  hasFelonyOrIneligibility: z.boolean(),
  ineligibilityExplanation: z.string().optional(),
}).refine((data) => {
  if (data.hasFelonyOrIneligibility && (!data.ineligibilityExplanation || data.ineligibilityExplanation.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Explanation is required when you check the felony/ineligibility box",
  path: ["ineligibilityExplanation"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;
type VoterVerificationData = z.infer<typeof voterVerificationSchema>;

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      return apiRequest("/api/change-password", "POST", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      const message = error.message === "Current password is incorrect" 
        ? "Current password is incorrect" 
        : "Failed to update password. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateProfilePictureMutation = useMutation({
    mutationFn: async (profilePictureURL: string) => {
      return apiRequest("/api/profile-picture", "PUT", {
        profilePictureURL,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
      // Invalidate user query to refresh the profile picture
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Voter Verification Form and State
  const [stateIdUrl, setStateIdUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [showIneligibilityExplanation, setShowIneligibilityExplanation] = useState(false);

  const voterForm = useForm<VoterVerificationData>({
    resolver: zodResolver(voterVerificationSchema),
    defaultValues: {
      fullLegalName: "",
      address: "",
      dateOfBirth: "",
      ssnLast4: "",
      stateIdPhotoUrl: "",
      selfiePhotoUrl: "",
      phoneNumber: "",
      emailAddress: user?.email || "",
      hasFelonyOrIneligibility: false,
      ineligibilityExplanation: "",
    },
  });

  // Fetch existing verification request status
  const { data: verificationRequest } = useQuery({
    queryKey: ["/api/voter-verification/me"],
    enabled: !!user,
  });

  const voterVerificationMutation = useMutation({
    mutationFn: async (data: VoterVerificationData) => {
      return apiRequest("/api/voter-verification/submit", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Verification Submitted",
        description: "Your voter verification request has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-verification/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      voterForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const onVoterVerificationSubmit = (data: VoterVerificationData) => {
    voterVerificationMutation.mutate(data);
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST") as any;
    console.log("Upload parameters response:", response);
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        updateProfilePictureMutation.mutate(uploadURL);
      }
    }
  };

  const handleStateIdUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setStateIdUrl(uploadURL);
        voterForm.setValue("stateIdPhotoUrl", uploadURL);
      }
    }
  };

  const handleSelfieUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setSelfieUrl(uploadURL);
        voterForm.setValue("selfiePhotoUrl", uploadURL);
      }
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  const isFormReady = stateIdUrl && selfieUrl && voterForm.formState.isValid;

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-slate-600 mt-2">Manage your account preferences and security settings</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="voter-verification" data-testid="tab-voter-verification">
              <BadgeCheck className="h-4 w-4 mr-2" />
              Voter Verification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Username</label>
                <p className="text-slate-900">{user?.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <p className="text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <p className="text-slate-900">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : "Not set"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Role</label>
                <p className="text-slate-900 capitalize">{user?.role}</p>
              </div>
              
              {/* Profile Picture Upload */}
              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-slate-700 mb-3 block">Profile Picture</label>
                <div className="flex items-center gap-4">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                      data-testid="img-current-avatar"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5 * 1024 * 1024} // 5MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {user?.avatar ? "Change Picture" : "Upload Picture"}
                  </ObjectUploader>
                </div>
                {updateProfilePictureMutation.isPending && (
                  <p className="text-sm text-slate-600 mt-2">Uploading...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your current password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your new password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your new password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                  >
                    {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Admin Panel - Only visible to admins */}
          {user?.role === "admin" && (
            <Card className="lg:col-span-3 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Shield className="h-5 w-5" />
                  Admin Panel
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Access administrative tools and dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/admin/dashboard">
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center gap-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                      data-testid="link-admin-dashboard"
                    >
                      <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Dashboard</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">System overview</div>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/admin/moderation">
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center gap-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                      data-testid="link-admin-moderation"
                    >
                      <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Moderation</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Content review</div>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/admin/invitations">
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center gap-3 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                      data-testid="link-admin-invitations"
                    >
                      <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Invitations</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Manage invites</div>
                      </div>
                    </Button>
                  </Link>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 text-center">
                  You have administrative access to manage the platform
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}