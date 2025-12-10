import { useEffect, useState } from "react";
import { localApi } from "@/lib/localApi";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

export function LocalBackendStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkBackend = async () => {
      console.log('Checking local backend status...');
      const health = await localApi.checkHealth();
      const newStatus = health ? 'online' : 'offline';
      console.log('Backend status:', newStatus);
      setStatus(newStatus);
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[99999]">
      <div className={`
        flex items-center gap-3 px-6 py-3 rounded-lg shadow-2xl border-2 font-semibold text-base
        ${status === 'online' 
          ? 'bg-green-500 text-white border-green-600' 
          : status === 'checking' 
          ? 'bg-yellow-500 text-black border-yellow-600' 
          : 'bg-red-500 text-white border-red-600'
        }
      `}>
        {status === 'online' ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Backend Online</span>
          </>
        ) : status === 'checking' ? (
          <>
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <span>Checking...</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5" />
            <span>Backend Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
