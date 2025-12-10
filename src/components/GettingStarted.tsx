import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface Step {
  id: number;
  title: string;
  description: string;
  route: string;
  storageKey: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "Configure Business Settings",
    description: "Set up your business name, logo, and contact information in Settings",
    route: "/settings",
    storageKey: "onboarding_step_1",
  },
  {
    id: 2,
    title: "Create Departments",
    description: "Organize your business by creating departments for different units",
    route: "/settings",
    storageKey: "onboarding_step_2",
  },
  {
    id: 3,
    title: "Add Your First Product",
    description: "Go to Inventory and add products you sell. Remember to set quantity per unit for items sold in packages!",
    route: "/inventory",
    storageKey: "onboarding_step_3",
  },
  {
    id: 4,
    title: "Make Your First Sale",
    description: "Process your first transaction in the Sales page to get familiar with the POS system",
    route: "/sales",
    storageKey: "onboarding_step_4",
  },
  {
    id: 5,
    title: "View Reports",
    description: "Check out the Reports page to see how your sales data is displayed",
    route: "/reports",
    storageKey: "onboarding_step_5",
  },
];

export const GettingStarted = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Only show to admin users
    if (!isAdmin) return;
    
    // Check if user has dismissed the getting started guide
    const dismissed = localStorage.getItem("getting_started_dismissed");
    const completedSteps = steps.filter(step => 
      localStorage.getItem(step.storageKey) === "true"
    ).length;

    // Show if not dismissed and haven't completed all steps
    if (!dismissed && completedSteps < steps.length) {
      // Show after a short delay
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToStep = () => {
    const step = steps[currentStep];
    navigate(step.route);
    setOpen(false);
  };

  const handleMarkComplete = () => {
    const step = steps[currentStep];
    localStorage.setItem(step.storageKey, "true");
    
    if (currentStep < steps.length - 1) {
      handleNext();
    } else {
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("getting_started_dismissed", "true");
    setOpen(false);
  };

  const completedSteps = steps.filter(step => 
    localStorage.getItem(step.storageKey) === "true"
  ).length;

  const progress = (completedSteps / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl">Getting Started</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-sm">
            Follow these steps to set up your system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedSteps} of {steps.length} completed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Overview */}
          <div className="space-y-2">
            {steps.map((s, index) => {
              const isCompleted = localStorage.getItem(s.storageKey) === "true";
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
                    isCurrent ? "bg-primary/10 border border-primary" : "bg-muted/50"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
                  ) : (
                    <Circle className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-xs sm:text-sm ${isCurrent ? "text-primary" : ""}`}>
                      {s.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Step Detail */}
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-3">
            <div>
              <h4 className="font-semibold text-sm sm:text-base mb-1">Step {step.id}: {step.title}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">{step.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleGoToStep} className="flex-1 text-sm" size="sm">
                Go to {step.title}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={handleMarkComplete} variant="outline" size="sm" className="sm:w-auto">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <span className="sm:inline">Next</span>
              <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};