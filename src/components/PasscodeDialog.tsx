import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface PasscodeDialogProps {
  open: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PasscodeDialog({ open, onSuccess, onCancel }: PasscodeDialogProps) {
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Check passcode
    if (passcode === "Jagonix44") {
      toast.success("Access granted");
      onSuccess();
    } else {
      toast.error("Incorrect passcode");
      setPasscode("");
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <DialogTitle>Access Protected</DialogTitle>
          </div>
          <DialogDescription>
            Enter the passcode to access this page
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              Submit
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
