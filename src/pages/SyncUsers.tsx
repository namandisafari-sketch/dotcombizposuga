import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const SyncUsers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-existing-users', {
        body: {},
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast.success(`Successfully synced ${data.syncedUsers} users!`);
      } else {
        toast.error(data.error || 'Failed to sync users');
      }
    } catch (error: any) {
      console.error('Error syncing users:', error);
      toast.error(error.message || 'Failed to sync users');
      setResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Sync Existing Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This tool will create profiles and assign roles to users who signed up before the automatic profile creation was set up.
          </p>
          
          <Button 
            onClick={handleSync} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing Users...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Sync Users Now
              </>
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Sync Completed' : 'Sync Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message || result.error}
                  </p>
                  {result.success && (
                    <div className="mt-3 space-y-1 text-sm text-green-700">
                      <p>Total users: {result.totalUsers}</p>
                      <p>Existing profiles: {result.existingProfiles}</p>
                      <p>Newly synced: {result.syncedUsers}</p>
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-red-700">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside mt-1">
                        {result.errors.map((err: any, idx: number) => (
                          <li key={idx}>{err.user}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncUsers;
