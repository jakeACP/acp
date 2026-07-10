import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

const schema = z.object({
  firstName: z.string().max(50).optional(),
  lastName:  z.string().max(50).optional(),
  bio:       z.string().max(500).optional(),
  location:  z.string().max(100).optional(),
  website:   z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});
type FormData = z.infer<typeof schema>;

export function MobileProfileEditPage() {
  const [, navigate] = useLocation();
  const { user }     = useAuth();
  const { toast }    = useToast();

  const {
    register, handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName:  user?.lastName  ?? "",
      bio:       (user as any)?.bio       ?? "",
      location:  (user as any)?.location  ?? "",
      website:   (user as any)?.website   ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("/api/user/profile", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated" });
      navigate("/mobile/profile");
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  return (
    <div className="mobile-root" data-testid="mobile-profile-edit-page">
      {/* Top bar */}
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
          data-testid="save-profile-btn"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {/* Avatar section (display only — avatar builder accessible from full profile) */}
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-blue-600 overflow-hidden flex-shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>}
          </div>
          <div>
            <p className="text-white font-semibold">@{user?.username}</p>
            <p className="text-white/50 text-sm">Avatar can be changed on your full profile</p>
          </div>
        </div>

        {/* Name */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Name</p>
          <div>
            <label className="text-white/70 text-sm mb-1 block">First name</label>
            <input
              {...register("firstName")}
              placeholder="First name"
              className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              data-testid="input-first-name"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm mb-1 block">Last name</label>
            <input
              {...register("lastName")}
              placeholder="Last name"
              className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              data-testid="input-last-name"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="glass-card p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">Bio</p>
          <textarea
            {...register("bio")}
            rows={4}
            placeholder="Tell the community a bit about yourself…"
            className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30 resize-none"
            data-testid="input-bio"
          />
          {errors.bio && <p className="text-red-400 text-xs mt-1">{errors.bio.message}</p>}
        </div>

        {/* Location & website */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Details</p>
          <div>
            <label className="text-white/70 text-sm mb-1 block">Location</label>
            <input
              {...register("location")}
              placeholder="City, State"
              className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              data-testid="input-location"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm mb-1 block">Website</label>
            <input
              {...register("website")}
              placeholder="https://yoursite.com"
              type="url"
              className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              data-testid="input-website"
            />
            {errors.website && <p className="text-red-400 text-xs mt-1">{errors.website.message}</p>}
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
