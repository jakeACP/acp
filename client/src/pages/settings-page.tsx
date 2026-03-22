import { useState, useRef, useEffect } from "react";
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
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { Link } from "wouter";
import type { UploadResult } from "@uppy/core";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

const voterVerificationSchema = z.object({
  fullLegalName: z.string().min(1, "Full legal name is required"),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
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

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

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
      const message = error.message?.includes("Current password is incorrect")
        ? "Current password is incorrect. Please double-check and try again."
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

  // Refs to cache presigned URLs for each upload type (AWS S3 PUT returns no body)
  const profilePictureUrlRef = useRef<string>("");
  const stateIdUrlRef = useRef<string>("");
  const selfieUrlRef = useRef<string>("");

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

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    phoneNumber: user?.phoneNumber || "",
    discoverableByPhone: user?.discoverableByPhone || false,
    discoverableByEmail: user?.discoverableByEmail || false,
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: typeof privacySettings) => {
      return apiRequest("/api/user/discoverability", "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Privacy Settings Updated",
        description: "Your friend discovery preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy settings.",
        variant: "destructive",
      });
    },
  });

  const handlePrivacyUpdate = () => {
    updatePrivacyMutation.mutate(privacySettings);
  };

  // Profile picture upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST") as any;
    profilePictureUrlRef.current = response.uploadURL;
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      // Use cached URL since AWS S3 PUT returns no body for Uppy to extract
      const uploadURL = result.successful[0].uploadURL || profilePictureUrlRef.current;
      
      if (uploadURL) {
        updateProfilePictureMutation.mutate(uploadURL);
      } else {
        toast({
          title: "Upload Error",
          description: "File uploaded but URL extraction failed. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // State ID upload handlers
  const handleGetStateIdUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST") as any;
    stateIdUrlRef.current = response.uploadURL;
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleStateIdUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL || stateIdUrlRef.current;
      if (uploadURL) {
        setStateIdUrl(uploadURL);
        voterForm.setValue("stateIdPhotoUrl", uploadURL);
      }
    }
  };

  // Selfie upload handlers
  const handleGetSelfieUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST") as any;
    selfieUrlRef.current = response.uploadURL;
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleSelfieUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL || selfieUrlRef.current;
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy">
              <Shield className="h-4 w-4 mr-2" />
              Privacy
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
          </TabsContent>

          <TabsContent value="security">
            <Card>
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
                              data-testid="input-current-password"
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
                              data-testid="input-new-password"
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
                              data-testid="input-confirm-password"
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
                      data-testid="button-update-password"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <TwoFactorSettings />
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Friend Discovery & Privacy
                </CardTitle>
                <CardDescription>
                  Control how others can find and connect with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={privacySettings.phoneNumber}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, phoneNumber: e.target.value })}
                      className="mt-1"
                      data-testid="input-phone-number"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Your phone number will be hashed for secure contact matching
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-900">Discoverable by Phone</label>
                      <p className="text-xs text-slate-500">
                        Allow people who have your phone number to find you
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.discoverableByPhone}
                      onCheckedChange={(checked) => 
                        setPrivacySettings({ ...privacySettings, discoverableByPhone: checked as boolean })
                      }
                      data-testid="checkbox-discoverable-phone"
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-t">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-900">Discoverable by Email</label>
                      <p className="text-xs text-slate-500">
                        Allow people who have your email to find you
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.discoverableByEmail}
                      onCheckedChange={(checked) => 
                        setPrivacySettings({ ...privacySettings, discoverableByEmail: checked as boolean })
                      }
                      data-testid="checkbox-discoverable-email"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">Privacy Protection</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Your contact information is hashed and encrypted. We use this only to suggest connections 
                        with people who already have your details. You can disable discovery at any time.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePrivacyUpdate}
                  disabled={updatePrivacyMutation.isPending}
                  className="w-full"
                  data-testid="button-update-privacy"
                >
                  {updatePrivacyMutation.isPending ? "Saving..." : "Save Privacy Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voter-verification">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5" />
                  Voter Verification
                </CardTitle>
                <CardDescription>
                  Submit your identity verification to receive a verified voter badge on your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationRequest?.status === "pending" && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Verification Pending</p>
                      <p className="text-sm text-yellow-700 mt-1">Your verification request is being reviewed by our team.</p>
                    </div>
                  </div>
                )}

                {user?.voterVerificationStatus === "verified" && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Voter Verified</p>
                      <p className="text-sm text-green-700 mt-1">Your account has been verified. You now have a verified voter badge on your profile.</p>
                    </div>
                  </div>
                )}

                {!verificationRequest && user?.voterVerificationStatus !== "verified" && (
                  <Form {...voterForm}>
                    <form onSubmit={voterForm.handleSubmit(onVoterVerificationSubmit)} className="space-y-6">
                      <FormField
                        control={voterForm.control}
                        name="fullLegalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Legal Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" data-testid="input-full-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={voterForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Residential Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St, City, State, ZIP" data-testid="input-address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={voterForm.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-dob" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={voterForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" data-testid="input-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={voterForm.control}
                        name="emailAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" data-testid="input-email-verify" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormLabel>State ID Photo *</FormLabel>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10 * 1024 * 1024}
                          onGetUploadParameters={handleGetStateIdUploadParameters}
                          onComplete={handleStateIdUploadComplete}
                          buttonClassName="flex items-center gap-2"
                        >
                          Upload State ID
                        </ObjectUploader>
                        {stateIdUrl && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            State ID uploaded successfully
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <FormLabel>Selfie Photo *</FormLabel>
                        <FormDescription>
                          Take a clear selfie holding your state ID next to your face
                        </FormDescription>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10 * 1024 * 1024}
                          onGetUploadParameters={handleGetSelfieUploadParameters}
                          onComplete={handleSelfieUploadComplete}
                          buttonClassName="flex items-center gap-2"
                        >
                          Upload Selfie
                        </ObjectUploader>
                        {selfieUrl && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Selfie uploaded successfully
                          </div>
                        )}
                      </div>

                      <FormField
                        control={voterForm.control}
                        name="hasFelonyOrIneligibility"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setShowIneligibilityExplanation(!!checked);
                                }}
                                data-testid="checkbox-felony"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                I have a felony conviction or other voting ineligibility
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {showIneligibilityExplanation && (
                        <FormField
                          control={voterForm.control}
                          name="ineligibilityExplanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Explanation *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Please explain your voting ineligibility status..."
                                  className="min-h-[100px]"
                                  data-testid="textarea-explanation"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <Button
                        type="submit"
                        disabled={voterVerificationMutation.isPending || !stateIdUrl || !selfieUrl}
                        className="w-full"
                        data-testid="button-submit-verification"
                      >
                        {voterVerificationMutation.isPending ? "Submitting..." : "Submit Verification"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}