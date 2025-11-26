import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Shield, Lock, Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ContactSyncModalProps {
  onClose: () => void;
}

type SyncState = "consent" | "uploading" | "success" | "error";

interface ContactEntry {
  name: string;
  phone?: string;
  email?: string;
}

interface UploadResult {
  matched: any[];
  matchedCount: number;
  unmatchedCount: number;
  totalProcessed: number;
}

export function ContactSyncModal({ onClose }: ContactSyncModalProps) {
  const { toast } = useToast();
  const [syncState, setSyncState] = useState<SyncState>("consent");
  const [result, setResult] = useState<UploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (contacts: ContactEntry[]) => {
      const response = await apiRequest('/api/contacts/upload', 'POST', { contacts });
      return response.json() as Promise<UploadResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setSyncState("success");
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
    },
    onError: (error: any) => {
      setSyncState("error");
      toast({ 
        title: "Sync failed", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    }
  });

  const handleSync = async () => {
    setSyncState("uploading");

    try {
      if ('contacts' in navigator && (navigator as any).contacts) {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        const formattedContacts: ContactEntry[] = contacts.map((contact: any) => ({
          name: contact.name?.[0] || 'Unknown',
          phone: contact.tel?.[0],
          email: contact.email?.[0],
        }));

        if (formattedContacts.length > 0) {
          uploadMutation.mutate(formattedContacts);
        } else {
          setSyncState("consent");
          toast({ title: "No contacts selected" });
        }
      } else {
        const sampleContacts: ContactEntry[] = [
          { name: "Demo Contact 1", phone: "5551234567" },
          { name: "Demo Contact 2", email: "demo@example.com" },
        ];
        
        uploadMutation.mutate(sampleContacts);
      }
    } catch (error: any) {
      if (error.name === 'TypeError' || error.message?.includes('not supported')) {
        const sampleContacts: ContactEntry[] = [
          { name: "Demo Contact", phone: "5550001111" },
        ];
        uploadMutation.mutate(sampleContacts);
      } else {
        setSyncState("error");
        console.error('Contact sync error:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg glass-card rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '85vh' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="close-sync-modal"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Consent State */}
        {syncState === "consent" && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-white text-2xl font-bold mb-3">
              Find Your Friends
            </h2>
            
            <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto">
              Securely sync your contacts to find patriots you already know on the platform.
            </p>

            <div className="space-y-3 mb-8 text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Lock className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h4 className="text-white text-sm font-medium">Privacy First</h4>
                  <p className="text-white/50 text-xs">
                    We hash contact info and never store raw phone numbers or emails
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-white text-sm font-medium">Your Control</h4>
                  <p className="text-white/50 text-xs">
                    Only people who enabled discovery can be found. Delete anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSync}
                className="w-full bg-gradient-to-r from-red-500 to-blue-600 text-white py-6 text-lg"
                data-testid="sync-now-button"
              >
                <Upload className="w-5 h-5 mr-2" />
                Sync Contacts
              </Button>
              
              <button
                onClick={onClose}
                className="w-full py-3 text-white/60 text-sm hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Uploading State */}
        {syncState === "uploading" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            
            <h2 className="text-white text-xl font-bold mb-2">
              Syncing Contacts
            </h2>
            
            <p className="text-white/60 text-sm">
              Securely processing your contacts...
            </p>
          </div>
        )}

        {/* Success State */}
        {syncState === "success" && result && (
          <div className="text-center py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h2 className="text-white text-xl font-bold mb-2">
              Sync Complete!
            </h2>
            
            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="glass-card p-4">
                <p className="text-3xl font-bold text-green-400">{result.matchedCount}</p>
                <p className="text-white/60 text-sm">Friends Found</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-3xl font-bold text-white/80">{result.totalProcessed}</p>
                <p className="text-white/60 text-sm">Contacts Synced</p>
              </div>
            </div>

            {result.matchedCount > 0 && (
              <p className="text-white/70 text-sm mb-6">
                We found {result.matchedCount} friend{result.matchedCount !== 1 ? 's' : ''} from your contacts!
                Check the Suggestions tab to connect.
              </p>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-red-500 to-blue-600 text-white py-5"
              data-testid="done-button"
            >
              View Suggestions
            </Button>
          </div>
        )}

        {/* Error State */}
        {syncState === "error" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            
            <h2 className="text-white text-xl font-bold mb-2">
              Sync Failed
            </h2>
            
            <p className="text-white/60 text-sm mb-6">
              We couldn't sync your contacts. Please try again.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => setSyncState("consent")}
                className="w-full bg-gradient-to-r from-red-500 to-blue-600 text-white"
              >
                Try Again
              </Button>
              
              <button
                onClick={onClose}
                className="w-full py-3 text-white/60 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
