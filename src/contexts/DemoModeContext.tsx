import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  showDemoWarning: () => void;
  resetDemoData: () => Promise<void>;
  isResetting: boolean;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const toggleDemoMode = async () => {
    setIsDemoMode(prev => !prev);
    toast.info("Demo Mode is disabled in self-hosted mode", {
      description: "This feature requires Supabase integration",
      duration: 3000,
    });
  };

  const showDemoWarning = () => {
    toast.warning("Demo Mode Active", {
      description: "This action was simulated.",
      duration: 2000,
    });
  };

  const resetDemoData = async () => {
    toast.info("Demo data reset is disabled in self-hosted mode");
  };

  return (
    <DemoModeContext.Provider value={{ 
      isDemoMode, 
      toggleDemoMode, 
      showDemoWarning,
      resetDemoData,
      isResetting
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
