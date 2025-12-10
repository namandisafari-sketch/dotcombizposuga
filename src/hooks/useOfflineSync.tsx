import { useEffect, useState } from "react";
import { offlineQueue } from "@/utils/offlineQueue";
import { toast } from "sonner";

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const updateQueueCount = () => {
      setQueueCount(offlineQueue.getAll().length);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      const queue = offlineQueue.getAll();
      
      if (queue.length > 0) {
        setIsSyncing(true);
        toast.info(`Syncing ${queue.length} offline changes...`);
        
        try {
          const results = await offlineQueue.sync();
          if (results.success > 0) {
            toast.success(`Synced ${results.success} offline changes successfully`);
          }
          if (results.failed > 0) {
            toast.error(`Failed to sync ${results.failed} changes`);
          }
        } catch (error) {
          toast.error("Failed to sync offline changes");
        } finally {
          setIsSyncing(false);
          updateQueueCount();
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Changes will be saved locally and synced when online.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Initial queue count
    updateQueueCount();
    
    // Periodic queue count update
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const queueOperation = (
    type: "insert" | "update" | "delete",
    table: string,
    data: any
  ) => {
    offlineQueue.add({ type, table, data });
    setQueueCount(offlineQueue.getAll().length);
    toast.info("Change saved locally. Will sync when online.");
  };

  return {
    isOnline,
    isSyncing,
    queueCount,
    queueOperation,
  };
};
