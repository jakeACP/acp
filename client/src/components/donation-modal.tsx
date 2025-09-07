import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, DollarSign, Coins, Loader2 } from "lucide-react";
import type { Charity } from "@shared/schema";

const donationSchema = z.object({
  amount: z.string().min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  currencyType: z.enum(["usd", "acp_coin"]),
  isAnonymous: z.boolean().default(false),
  message: z.string().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

interface DonationModalProps {
  charity: Charity;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DonationModal({ charity, isOpen, onClose, onSuccess }: DonationModalProps) {
  const { toast } = useToast();
  const [isDonating, setIsDonating] = useState(false);

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: "",
      currencyType: "usd",
      isAnonymous: false,
      message: "",
    },
  });

  const watchCurrencyType = form.watch("currencyType");

  // Get user's ACP coin balance
  const { data: userBalance } = useQuery({
    queryKey: ["/api/user/balance"],
    queryFn: async () => {
      const response = await fetch("/api/user/balance");
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      return data.balance;
    },
    enabled: watchCurrencyType === "acp_coin",
  });

  const donationMutation = useMutation({
    mutationFn: async (data: DonationFormData) => {
      return apiRequest("POST", `/api/charities/${charity.id}/donate`, data);
    },
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Donation Failed",
        description: error.message || "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: DonationFormData) => {
    setIsDonating(true);
    try {
      await donationMutation.mutateAsync(data);
    } finally {
      setIsDonating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const quickAmounts = [
    { usd: 10, acp: 5 },
    { usd: 25, acp: 10 },
    { usd: 50, acp: 25 },
    { usd: 100, acp: 50 },
  ];

  const setQuickAmount = (amount: number) => {
    form.setValue("amount", amount.toString());
  };

  const currentAmount = parseFloat(form.getValues("amount") || "0");
  const hasInsufficientFunds = watchCurrencyType === "acp_coin" && 
    userBalance && currentAmount > parseFloat(userBalance);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="donation-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Donate to {charity.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Currency Selection */}
            <FormField
              control={form.control}
              name="currencyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="usd" id="usd" data-testid="radio-usd" />
                        <Label htmlFor="usd" className="flex items-center gap-2 cursor-pointer">
                          <DollarSign className="h-4 w-4" />
                          USD
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="acp_coin" id="acp_coin" data-testid="radio-acp-coin" />
                        <Label htmlFor="acp_coin" className="flex items-center gap-2 cursor-pointer">
                          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                          ACP Coins
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ACP Balance Display */}
            {watchCurrencyType === "acp_coin" && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Available Balance:</span>{" "}
                  <span className="font-bold" data-testid="user-acp-balance">
                    {userBalance ? parseFloat(userBalance).toFixed(2) : "0.00"} ACP Coins
                  </span>
                </p>
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div>
              <Label className="text-sm">Quick Amounts</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {quickAmounts.map((amounts) => {
                  const amount = watchCurrencyType === "usd" ? amounts.usd : amounts.acp;
                  const displayValue = watchCurrencyType === "usd" 
                    ? formatCurrency(amount)
                    : `${amount} ACP`;
                  
                  return (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(amount)}
                      data-testid={`button-quick-amount-${amount}`}
                    >
                      {displayValue}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount {watchCurrencyType === "usd" ? "(USD)" : "(ACP Coins)"}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      {watchCurrencyType === "usd" ? (
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        type="number"
                        step={watchCurrencyType === "usd" ? "0.01" : "0.00000001"}
                        min="0"
                        placeholder={watchCurrencyType === "usd" ? "0.00" : "0.00000000"}
                        className="pl-10"
                        {...field}
                        data-testid="input-donation-amount"
                      />
                    </div>
                  </FormControl>
                  {hasInsufficientFunds && (
                    <p className="text-sm text-red-500">
                      Insufficient ACP coin balance
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a message of support..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-donation-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Anonymous Donation */}
            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-anonymous-donation"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Donate anonymously
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Your donation won't be posted to your news feed or shown in public donor lists
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <Separator />

            {/* Donation Summary */}
            {currentAmount > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Donation Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium" data-testid="donation-summary-amount">
                      {watchCurrencyType === "usd" 
                        ? formatCurrency(currentAmount)
                        : `${currentAmount.toFixed(8)} ACP Coins`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charity:</span>
                    <span className="font-medium">{charity.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anonymous:</span>
                    <span className="font-medium">
                      {form.getValues("isAnonymous") ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isDonating}
                data-testid="button-cancel-donation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isDonating || hasInsufficientFunds || currentAmount <= 0}
                className="flex items-center gap-2"
                data-testid="button-confirm-donation"
              >
                {isDonating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDonating ? "Processing..." : "Donate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}