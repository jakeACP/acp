import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import { fetchCsrfToken, getAuthHeaders, queryClient, resolveApiUrl } from "@/lib/queryClient";

function base64ToFile(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], filename, { type: "image/jpeg" });
}

export function MobileAvatarPicker({
  avatar,
  username,
  className = "w-20 h-20",
}: {
  avatar?: string | null;
  username?: string | null;
  className?: string;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarSrc = avatar ? resolveApiUrl(avatar) : null;

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo must be an image under 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const csrfToken = await fetchCsrfToken();
      const formData = new FormData();
      formData.append("file", file, file.name || "profile-photo.jpg");
      const response = await fetch(resolveApiUrl("/api/upload"), {
        method: "POST",
        headers: { "x-csrf-token": csrfToken, ...getAuthHeaders() },
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { url } = await response.json();
      const saveResponse = await fetch(resolveApiUrl("/api/user/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken, ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ avatar: url }),
      });
      if (!saveResponse.ok) throw new Error("Could not save photo");
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setOpen(false);
      toast({ title: "Photo updated ✓" });
    } catch (error: any) {
      toast({ title: "Photo upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const takePhoto = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 90,
        width: 1200,
        height: 1200,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      if (photo.base64String) await upload(base64ToFile(photo.base64String, "profile-photo.jpg"));
    } catch (error: any) {
      if (!String(error?.message || error).toLowerCase().includes("cancel")) {
        toast({ title: "Camera unavailable", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`relative overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center ${className}`} aria-label="Change profile photo" data-testid="profile-photo-button">
        {avatarSrc ? <img src={avatarSrc} alt={username || "Profile photo"} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-white text-2xl font-bold">{username?.[0]?.toUpperCase() ?? "?"}</span>}
        {uploading && <span className="absolute inset-0 bg-black/55 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => !uploading && setOpen(false)}>
          <div className="w-full rounded-t-3xl p-5 space-y-2" style={{ background: "#171b2b" }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h2 className="text-white font-semibold">Profile photo</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="w-5 h-5 text-white/60" /></button></div>
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-white bg-white/10"><ImagePlus className="w-5 h-5" /> Upload from library</button>
            <button type="button" onClick={() => { if (Capacitor.isNativePlatform()) void takePhoto(); else fileRef.current?.click(); }} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-white bg-white/10"><Camera className="w-5 h-5" /> Take a new photo</button>
            <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          </div>
        </div>
      )}
    </>
  );
}
