import { supabase } from "@/integrations/supabase/client";

interface QueuedOperation {
  id: string;
  type: "insert" | "update" | "delete";
  table: string;
  data: any;
  timestamp: number;
}

const QUEUE_KEY = "offline_sync_queue";

export const offlineQueue = {
  add: (operation: Omit<QueuedOperation, "id" | "timestamp">) => {
    const queue = offlineQueue.getAll();
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newOperation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newOperation.id;
  },

  getAll: (): QueuedOperation[] => {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  remove: (id: string) => {
    const queue = offlineQueue.getAll().filter((op) => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  sync: async () => {
    const queue = offlineQueue.getAll();
    const results = { success: 0, failed: 0 };

    for (const operation of queue) {
      try {
        // Use type assertion to bypass strict typing for dynamic table names
        const table = (supabase as any).from(operation.table);
        
        switch (operation.type) {
          case "insert":
            await table.insert(operation.data);
            break;
          case "update":
            await table.update(operation.data).eq("id", operation.data.id);
            break;
          case "delete":
            await table.delete().eq("id", operation.data.id);
            break;
        }
        offlineQueue.remove(operation.id);
        results.success++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        results.failed++;
      }
    }

    return results;
  },
};
