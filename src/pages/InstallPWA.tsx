import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, Smartphone, Zap, Wifi } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info("To install, use your browser's menu: Share → Add to Home Screen");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("App installed successfully!");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Install DOTCOM App</h1>
          <p className="text-muted-foreground text-lg">
            Get the full app experience on your device
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isInstalled ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Already Installed
                </>
              ) : (
                <>
                  <Download className="h-6 w-6" />
                  Install Now
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isInstalled
                ? "The app is already installed on your device"
                : "Install DOTCOM on your home screen for quick access"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isInstalled && (
              <Button
                onClick={handleInstallClick}
                size="lg"
                className="w-full"
                disabled={!isInstallable && !deferredPrompt}
              >
                <Download className="mr-2 h-5 w-5" />
                {isInstallable ? "Install App" : "Install from Browser Menu"}
              </Button>
            )}

            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-semibold">Why Install?</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Quick Access</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Launch directly from your home screen like a native app
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Works Offline</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access key features even without internet connection
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Fast & Reliable</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optimized performance with instant loading
                  </p>
                </div>
              </div>
            </div>

            {!isInstallable && !isInstalled && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Manual Installation:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>iPhone/iPad:</strong> Tap Share → Add to Home Screen</li>
                  <li>• <strong>Android:</strong> Tap Menu (⋮) → Add to Home screen</li>
                  <li>• <strong>Desktop:</strong> Click install icon in address bar</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstallPWA;
