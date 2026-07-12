import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { SiFacebook, SiX, SiBluesky } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { shareNative } from "@/lib/native";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ShareSheetProps {
  title: string;
  text?: string;
  url: string;
  trigger?: (open: () => void) => React.ReactNode;
  className?: string;
}

export function ShareSheet({ title, text, url, trigger, className }: ShareSheetProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", description: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const shared = await shareNative({ title, text, url });
    if (!shared) setDialogOpen(true);
  };

  return (
    <>
      {trigger ? (
        trigger(handleShare)
      ) : (
        <Button variant="ghost" size="icon" onClick={handleShare} className={className}>
          <Share2 className="w-4 h-4" />
        </Button>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Share</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground line-clamp-2">{title}</p>
            <div className="flex gap-3 justify-center">
              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-[#1877F2]/10 hover:text-[#1877F2] transition-colors"
                title="Share on Facebook"
                onClick={() => setDialogOpen(false)}
              >
                <SiFacebook className="h-6 w-6" />
                <span className="text-xs font-medium">Facebook</span>
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-foreground/10 transition-colors"
                title="Share on X"
                onClick={() => setDialogOpen(false)}
              >
                <SiX className="h-6 w-6" />
                <span className="text-xs font-medium">X</span>
              </a>
              <a
                href={shareLinks.bluesky}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-[#0085FF]/10 hover:text-[#0085FF] transition-colors"
                title="Share on Bluesky"
                onClick={() => setDialogOpen(false)}
              >
                <SiBluesky className="h-6 w-6" />
                <span className="text-xs font-medium">Bluesky</span>
              </a>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={copyLink}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
