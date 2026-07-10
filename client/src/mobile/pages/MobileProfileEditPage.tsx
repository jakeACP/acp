import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Check, Loader2, Camera, Link as LinkIcon, MapPin, Twitter, Instagram, Youtube } from "lucide-react";
import { apiRequest, queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

const schema = z.object({
  firstName:   z.string().max(50).optional(),
  lastName:    z.string().max(50).optional(),
  displayName: z.string().max(80).optional(),
  bio:         z.string().max(500).optional(),
  location:    z.string().max(100).optional(),
  website:     z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});
type FormData = z.infer<typeof schema>;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-1.5 px-0.5">{children}</p>;
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
    />
  );
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
    />
  );
}

export function MobileProfileEditPage() {
  const [, navigate] = useLocation();
  const { user }     = useAuth();
  const { toast }    = useToast();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName:   user?.firstName ?? "",
      lastName:    user?.lastName  ?? "",
      displayName: (user as any)?.displayName ?? "",
      bio:         (user as any)?.bio       ?? "",
      location:    (user as any)?.location  ?? "",
      website:     (user as any)?.website   ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("/api/user/profile", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated ✓" });
      navigate("/mobile/profile");
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const csrfToken = await fetchCsrfToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      await apiRequest("/api/user/profile", "PATCH", { avatar: url });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Photo updated ✓" });
    } catch (err: any) {
      toast({ title: "Photo upload failed", description: err.message, variant: "destructive" });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const avatarSrc = avatarPreview ?? user?.avatar ?? null;
  const bio = (user as any)?.bio ?? "";

  return (
    <div className="mobile-root" data-testid="mobile-profile-edit-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/profile")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Edit Profile</h1>
        <button
          onClick={handleSubmit((d) => mutation.mutate(d))}
          disabled={mutation.isPending || !isDirty}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(230,57,58,0.25)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}
          data-testid="save-profile-btn">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">

        {/* Avatar */}
        <div className="glass-card p-5">
          <FieldLabel>Photo</FieldLabel>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-blue-600 overflow-hidden flex items-center justify-center">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-white text-2xl font-bold">{user?.username?.[0]?.toUpperCase()}</span>}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              <button onClick={() => avatarRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                data-testid="upload-avatar-btn">
                <Camera className="w-4 h-4" /> Upload Photo
              </button>
              <p className="text-white/30 text-xs">JPG, PNG, WEBP up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="glass-card p-4 space-y-4">
          <FieldLabel>Name</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-white/40 text-xs mb-1">First name</p>
              <StyledInput {...register("firstName")} placeholder="First" data-testid="input-first-name" />
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Last name</p>
              <StyledInput {...register("lastName")} placeholder="Last" data-testid="input-last-name" />
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Display name (override)</p>
            <StyledInput {...register("displayName")} placeholder="How you appear on posts" data-testid="input-display-name" />
          </div>
        </div>

        {/* Bio */}
        <div className="glass-card p-4">
          <FieldLabel>Bio</FieldLabel>
          <StyledTextarea {...register("bio")} rows={4}
            placeholder="Tell the community about yourself…"
            maxLength={500} data-testid="input-bio" />
          {errors.bio && <p className="text-red-400 text-xs mt-1">{errors.bio.message}</p>}
          <p className="text-white/25 text-xs text-right mt-1">
            {((bio as string) || "").length}/500
          </p>
        </div>

        {/* Location & Website */}
        <div className="glass-card p-4 space-y-4">
          <FieldLabel>Location & Website</FieldLabel>
          <div>
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
            <StyledInput {...register("location")} placeholder="City, State" data-testid="input-location" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Website</p>
            <StyledInput {...register("website")} type="url" placeholder="https://yoursite.com" data-testid="input-website" />
            {errors.website && <p className="text-red-400 text-xs mt-1">{errors.website.message}</p>}
          </div>
        </div>

        {/* More options */}
        <div className="glass-card p-4 space-y-2">
          <FieldLabel>More options</FieldLabel>
          <button onClick={() => navigate("/mobile/settings/account")}
            className="w-full flex items-center gap-3 py-2.5 active:opacity-70">
            <Twitter className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/70 flex-1 text-left">Change username</span>
            <span className="text-white/25 text-xs">→</span>
          </button>
          <button onClick={() => navigate("/mobile/settings/account")}
            className="w-full flex items-center gap-3 py-2.5 active:opacity-70">
            <Instagram className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/70 flex-1 text-left">Change email</span>
            <span className="text-white/25 text-xs">→</span>
          </button>
          <button onClick={() => navigate("/mobile/settings/security")}
            className="w-full flex items-center gap-3 py-2.5 active:opacity-70">
            <Youtube className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/70 flex-1 text-left">Change password</span>
            <span className="text-white/25 text-xs">→</span>
          </button>
        </div>

      </div>

      <MobileBottomNav />
    </div>
  );
}
