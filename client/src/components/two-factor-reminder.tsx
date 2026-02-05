import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Clock } from "lucide-react";

const REMINDER_STORAGE_KEY = "2fa_reminder_dismissed_at";
const REMINDER_INTERVAL_DAYS = 30;

export function TwoFactorReminder() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowReminder(false);
      return;
    }

    if (user.twoFactorEnabled) {
      setShowReminder(false);
      return;
    }

    const dismissedAt = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismissal = Math.floor(
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDismissal < REMINDER_INTERVAL_DAYS) {
        setShowReminder(false);
        return;
      }
    }

    const timer = setTimeout(() => {
      setShowReminder(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleRemindLater = () => {
    localStorage.setItem(REMINDER_STORAGE_KEY, new Date().toISOString());
    setShowReminder(false);
  };

  const handleSetupNow = () => {
    setShowReminder(false);
    setLocation("/settings");
  };

  if (!user || user.twoFactorEnabled) {
    return null;
  }

  return (
    <Dialog open={showReminder} onOpenChange={setShowReminder}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Secure Your Account</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Two-factor authentication adds an extra layer of security to your account. 
            Even if someone gets your password, they won't be able to access your account 
            without your phone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Benefits of 2FA:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Protects your account from unauthorized access</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Prevents identity theft and fraud</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Choose between app-based or SMS verification</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full sm:w-auto"
          >
            <Clock className="h-4 w-4 mr-2" />
            Remind Me Later
          </Button>
          <Button onClick={handleSetupNow} className="w-full sm:w-auto">
            <Shield className="h-4 w-4 mr-2" />
            Set Up Now
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground mt-2">
          We'll remind you again in 30 days if you choose "Remind Me Later"
        </p>
      </DialogContent>
    </Dialog>
  );
}
