import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, Loader2 } from "lucide-react";

export const OfflineSyncIndicator = () => {
  const { isOnline, isSyncing, queueCount } = useOfflineSync();

  if (isOnline && queueCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="px-3 py-2 text-sm flex items-center gap-2"
      >
        {isSyncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : isOnline ? (
          <>
            <Cloud className="h-4 w-4" />
            Online {queueCount > 0 && `(${queueCount} pending)`}
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            Offline {queueCount > 0 && `(${queueCount} saved)`}
          </>
        )}
      </Badge>
    </div>
  );
};
