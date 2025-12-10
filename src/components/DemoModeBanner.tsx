import { useDemoMode } from "@/contexts/DemoModeContext";
import { GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const DemoModeBanner = () => {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (!isDemoMode) return;

    const handleInteraction = () => {
      setIsHidden(true);
    };

    // Hide on scroll, focus, or click
    window.addEventListener("scroll", handleInteraction);
    window.addEventListener("focusin", handleInteraction);
    window.addEventListener("click", handleInteraction);

    return () => {
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("focusin", handleInteraction);
      window.removeEventListener("click", handleInteraction);
    };
  }, [isDemoMode]);

  if (!isDemoMode) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-lg transition-transform duration-300 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}
      onMouseEnter={() => setIsHidden(false)}
    >
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5" />
        <span className="font-semibold text-sm">
          DEMO MODE ACTIVE - Staff Training Mode - No Changes Will Be Saved
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDemoMode}
        className="h-auto p-1 hover:bg-amber-600 text-white hover:text-white"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
