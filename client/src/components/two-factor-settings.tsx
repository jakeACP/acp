import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Shield, Smartphone, Key, Trash2, CheckCircle, XCircle, Monitor, TabletSmartphone, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'sms' | null;
  totpEnabled: boolean;
  smsEnabled: boolean;
  phone: string | null;
}

interface TrustedDevice {
  id: string;
  deviceName: string | null;
  userAgent: string;
  ipAddress: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

function parseDevice(ua: string): { label: string; Icon: typeof Monitor } {
  const isMobile = /iPhone|Android.*Mobile|iPod/.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/.test(ua);

  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua)) browser = 'Safari';

  let os = '';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'Mac';
  else if (/Linux/.test(ua)) os = 'Linux';

  const label = os ? `${browser} on ${os}` : browser;
  const Icon = isMobile ? TabletSmartphone : isTablet ? TabletSmartphone : Monitor;
  return { label, Icon };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function TwoFactorSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [showSmsSetup, setShowSmsSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState<{ secret: string; qrCode: string; } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const { data: status, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['/api/2fa/status'],
  });

  const { data: devices } = useQuery<TrustedDevice[]>({
    queryKey: ['/api/2fa/devices'],
  });

  const setupTotpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/2fa/totp/setup', 'POST');
      return res.json();
    },
    onSuccess: (data) => {
      setTotpSecret(data);
      setShowTotpSetup(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const confirmTotpMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('/api/2fa/totp/confirm', 'POST', { token });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Authenticator app enabled successfully" });
      setShowTotpSetup(false);
      setTotpSecret(null);
      setVerificationCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disableTotpMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/2fa/totp/disable', 'POST');
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Authenticator app disabled" });
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiRequest('/api/2fa/sms/send', 'POST', { phoneNumber: phone });
    },
    onSuccess: () => {
      setSmsSent(true);
      toast({ title: "Code Sent", description: "A verification code has been sent to your phone" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enableSmsMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      return apiRequest('/api/2fa/sms/enable', 'POST', { phoneNumber: phone, code });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "SMS verification enabled successfully" });
      setShowSmsSetup(false);
      setPhoneNumber("");
      setVerificationCode("");
      setSmsSent(false);
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disableSmsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/2fa/sms/disable', 'POST');
    },
    onSuccess: () => {
      toast({ title: "Success", description: "SMS verification disabled" });
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest(`/api/2fa/devices/${deviceId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "Device removed", description: "That device will need to verify again next login." });
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/devices'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeAllDevicesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/2fa/devices', 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "All devices removed", description: "Every device will need to verify again on next login." });
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/devices'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="h-8 w-8 text-muted-foreground" />
            <div>
              <h4 className="font-medium">Authenticator App</h4>
              <p className="text-sm text-muted-foreground">
                Use Google Authenticator or similar apps
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.totpEnabled ? (
              <>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disableTotpMutation.mutate()}
                  disabled={disableTotpMutation.isPending}
                >
                  Disable
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setupTotpMutation.mutate()}
                disabled={setupTotpMutation.isPending}
              >
                {setupTotpMutation.isPending ? <LoadingSpinner size="sm" /> : "Set Up"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <div>
              <h4 className="font-medium">SMS Verification</h4>
              <p className="text-sm text-muted-foreground">
                {status?.phone ? `Enabled for ${status.phone}` : "Receive codes via text message"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.smsEnabled ? (
              <>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disableSmsMutation.mutate()}
                  disabled={disableSmsMutation.isPending}
                >
                  Disable
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowSmsSetup(true)}>
                Set Up
              </Button>
            )}
          </div>
        </div>


        <Dialog open={showTotpSetup} onOpenChange={setShowTotpSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Up Authenticator App</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app
              </DialogDescription>
            </DialogHeader>
            {totpSecret && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={totpSecret.qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                    {totpSecret.secret}
                  </code>
                </div>
                <div>
                  <Label htmlFor="totp-code">Verification Code</Label>
                  <Input
                    id="totp-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTotpSetup(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => confirmTotpMutation.mutate(verificationCode)}
                disabled={verificationCode.length < 6 || confirmTotpMutation.isPending}
              >
                {confirmTotpMutation.isPending ? <LoadingSpinner size="sm" /> : "Verify & Enable"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSmsSetup} onOpenChange={setShowSmsSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Up SMS Verification</DialogTitle>
              <DialogDescription>
                Enter your phone number to receive verification codes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={smsSent}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => sendSmsMutation.mutate(phoneNumber)}
                    disabled={!phoneNumber || sendSmsMutation.isPending || smsSent}
                  >
                    {sendSmsMutation.isPending ? <LoadingSpinner size="sm" /> : "Send Code"}
                  </Button>
                </div>
              </div>
              {smsSent && (
                <div>
                  <Label htmlFor="sms-code">Verification Code</Label>
                  <Input
                    id="sms-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSmsSetup(false);
                setSmsSent(false);
                setVerificationCode("");
              }}>
                Cancel
              </Button>
              {smsSent && (
                <Button 
                  onClick={() => enableSmsMutation.mutate({ phone: phoneNumber, code: verificationCode })}
                  disabled={verificationCode.length < 6 || enableSmsMutation.isPending}
                >
                  {enableSmsMutation.isPending ? <LoadingSpinner size="sm" /> : "Verify & Enable"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>

    {/* ── Trusted Devices Card ───────────────────────────────────────── */}
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Trusted Devices
            </CardTitle>
            <CardDescription className="mt-1">
              Devices that skip 2FA on sign-in. You only need to verify once per device.
            </CardDescription>
          </div>
          {devices && devices.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white shrink-0"
              onClick={() => removeAllDevicesMutation.mutate()}
              disabled={removeAllDevicesMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-1" />
              {removeAllDevicesMutation.isPending ? "Removing…" : "Log out all"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!devices || devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No trusted devices yet</p>
            <p className="text-xs mt-1">
              After verifying with 2FA, check "Remember this device" to skip the code next time.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => {
              const { label, Icon } = parseDevice(device.userAgent || '');
              return (
                <div
                  key={device.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    device.isCurrent ? 'border-primary/50 bg-primary/5' : 'bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {device.deviceName || label}
                        </p>
                        {device.isCurrent && (
                          <Badge variant="outline" className="text-xs text-primary border-primary shrink-0">
                            This device
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {device.ipAddress} · Last seen {relativeTime(device.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDeviceMutation.mutate(device.id)}
                    disabled={removeDeviceMutation.isPending}
                    title="Remove device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
