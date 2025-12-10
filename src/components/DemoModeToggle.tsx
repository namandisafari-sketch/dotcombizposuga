import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { GraduationCap, Loader2 } from "lucide-react";

export const DemoModeToggle = () => {
  const { isDemoMode, toggleDemoMode, isResetting } = useDemoMode();

  return (
    <div className="flex items-center space-x-2 p-3 rounded-lg border bg-card">
      {isResetting ? (
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      ) : (
        <GraduationCap className="h-5 w-5 text-primary" />
      )}
      <div className="flex-1">
        <Label htmlFor="demo-mode" className="text-sm font-medium cursor-pointer">
          Demo Mode (Staff Training)
        </Label>
        <p className="text-xs text-muted-foreground">
          {isResetting 
            ? "Resetting demo data..." 
            : isDemoMode 
              ? "Data will reset when disabled" 
              : "Enable for training - no real changes saved"}
        </p>
      </div>
      <Switch
        id="demo-mode"
        checked={isDemoMode}
        onCheckedChange={toggleDemoMode}
        disabled={isResetting}
      />
    </div>
  );
};
