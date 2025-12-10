import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface MobileMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  departmentId: string;
  saleId: string | null;
  onSuccess: () => void;
}

export const MobileMoneyDialog = ({
  open,
  onOpenChange,
  amount,
  departmentId,
  saleId,
  onSuccess,
}: MobileMoneyDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState<"mtn" | "airtel">("mtn");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const processMobilePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!phoneNumber.trim()) {
        throw new Error("Please enter a phone number");
      }

      if (!saleId) {
        throw new Error("Sale ID is required");
      }

      setPaymentStatus("processing");
      setStatusMessage("Processing payment...");

      const { data, error } = await supabase.functions.invoke("process-mobile-payment", {
        body: {
          phoneNumber: phoneNumber.trim(),
          provider,
          amount,
          saleId,
          departmentId,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      setPaymentStatus("success");
      setStatusMessage("Payment initiated! Customer will receive USSD prompt.");
      toast.success("Mobile money payment initiated successfully");

      // Auto-close after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
        setPhoneNumber("");
        setPaymentStatus("idle");
        setStatusMessage("");
      }, 3000);
    },
    onError: (error: any) => {
      setPaymentStatus("error");
      const errorMessage = error.message || "Failed to process payment";
      setStatusMessage(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = () => {
    processMobilePaymentMutation.mutate();
  };

  const handleClose = () => {
    if (paymentStatus !== "processing") {
      onOpenChange(false);
      setPhoneNumber("");
      setPaymentStatus("idle");
      setStatusMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Mobile Money Payment</DialogTitle>
          <DialogDescription>
            Enter customer details to initiate mobile money payment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Amount Display */}
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-2xl font-bold text-primary">
              UGX {amount.toLocaleString()}
            </p>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Payment Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as "mtn" | "airtel")}>
              <SelectTrigger id="provider" disabled={paymentStatus === "processing"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                <SelectItem value="airtel">Airtel Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Customer Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g., 0241234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={paymentStatus === "processing"}
              type="tel"
            />
            <p className="text-xs text-muted-foreground">
              Enter customer's {provider === "mtn" ? "MTN" : "Airtel"} number
            </p>
          </div>

          {/* Status Messages */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${
                paymentStatus === "success"
                  ? "bg-green-500/10 border border-green-500/20"
                  : paymentStatus === "error"
                  ? "bg-destructive/10 border border-destructive/20"
                  : "bg-primary/10 border border-primary/20"
              }`}
            >
              {paymentStatus === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : paymentStatus === "error" ? (
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <p
                className={`text-sm ${
                  paymentStatus === "success"
                    ? "text-green-500"
                    : paymentStatus === "error"
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                {statusMessage}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={paymentStatus === "processing"}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={paymentStatus === "processing" || !phoneNumber.trim()}
              className="flex-1"
            >
              {paymentStatus === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Send Payment Request"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
