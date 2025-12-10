import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface MobileMoneySettingsProps {
  departmentId?: string;
}

interface MobileMoneyConfig {
  mtn: {
    mtn_api_key: string;
    mtn_api_user: string;
    mtn_subscription_key: string;
    environment: string;
    is_enabled: boolean;
  };
  airtel: {
    airtel_client_id: string;
    airtel_client_secret: string;
    environment: string;
    is_enabled: boolean;
  };
}

export const MobileMoneySettings = ({ departmentId }: MobileMoneySettingsProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"mtn" | "airtel">("mtn");
  const [showSecrets, setShowSecrets] = useState({ mtn: false, airtel: false });
  
  const [mtnConfig, setMtnConfig] = useState({
    mtn_api_key: "",
    mtn_api_user: "",
    mtn_subscription_key: "",
    environment: "sandbox",
    is_enabled: false,
  });

  const [airtelConfig, setAirtelConfig] = useState({
    airtel_client_id: "",
    airtel_client_secret: "",
    environment: "sandbox",
    is_enabled: false,
  });

  // Fetch settings from the settings table's settings_json column
  const { data: settings, isLoading } = useQuery({
    queryKey: ["mobile-money-settings", departmentId],
    queryFn: async () => {
      if (!departmentId) return null;
      
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("department_id", departmentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!departmentId,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings?.settings_json) {
      const json = settings.settings_json as Record<string, any>;
      const mobileMoneyConfig = json.mobile_money as MobileMoneyConfig | undefined;
      
      if (mobileMoneyConfig?.mtn) {
        setMtnConfig({
          mtn_api_key: mobileMoneyConfig.mtn.mtn_api_key || "",
          mtn_api_user: mobileMoneyConfig.mtn.mtn_api_user || "",
          mtn_subscription_key: mobileMoneyConfig.mtn.mtn_subscription_key || "",
          environment: mobileMoneyConfig.mtn.environment || "sandbox",
          is_enabled: mobileMoneyConfig.mtn.is_enabled || false,
        });
      }

      if (mobileMoneyConfig?.airtel) {
        setAirtelConfig({
          airtel_client_id: mobileMoneyConfig.airtel.airtel_client_id || "",
          airtel_client_secret: mobileMoneyConfig.airtel.airtel_client_secret || "",
          environment: mobileMoneyConfig.airtel.environment || "sandbox",
          is_enabled: mobileMoneyConfig.airtel.is_enabled || false,
        });
      }
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (provider: "mtn" | "airtel") => {
      if (!departmentId) throw new Error("Department ID required");

      const existingJson = (settings?.settings_json as Record<string, any>) || {};
      const mobileMoneyConfig: MobileMoneyConfig = (existingJson.mobile_money as MobileMoneyConfig) || {
        mtn: { mtn_api_key: "", mtn_api_user: "", mtn_subscription_key: "", environment: "sandbox", is_enabled: false },
        airtel: { airtel_client_id: "", airtel_client_secret: "", environment: "sandbox", is_enabled: false }
      };

      if (provider === "mtn") {
        mobileMoneyConfig.mtn = mtnConfig;
      } else {
        mobileMoneyConfig.airtel = airtelConfig;
      }

      const updatedSettingsJson = JSON.parse(JSON.stringify({
        ...existingJson,
        mobile_money: mobileMoneyConfig
      }));

      if (settings) {
        const { error } = await supabase
          .from("settings")
          .update({ settings_json: updatedSettingsJson })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert([{
            department_id: departmentId,
            settings_json: updatedSettingsJson
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-money-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Money Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "mtn" | "airtel")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mtn">MTN Mobile Money</TabsTrigger>
            <TabsTrigger value="airtel">Airtel Money</TabsTrigger>
          </TabsList>

          {/* MTN Configuration */}
          <TabsContent value="mtn" className="space-y-4 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configure MTN MoMo API credentials. Get your API keys from MTN Developer Portal.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mtn-env">Environment</Label>
                <Select 
                  value={mtnConfig.environment} 
                  onValueChange={(v) => setMtnConfig({ ...mtnConfig, environment: v })}
                >
                  <SelectTrigger id="mtn-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mtn-api-user">API User</Label>
                <Input
                  id="mtn-api-user"
                  value={mtnConfig.mtn_api_user}
                  onChange={(e) => setMtnConfig({ ...mtnConfig, mtn_api_user: e.target.value })}
                  placeholder="Enter MTN API User"
                />
              </div>

              <div>
                <Label htmlFor="mtn-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="mtn-api-key"
                    type={showSecrets.mtn ? "text" : "password"}
                    value={mtnConfig.mtn_api_key}
                    onChange={(e) => setMtnConfig({ ...mtnConfig, mtn_api_key: e.target.value })}
                    placeholder="Enter MTN API Key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecrets({ ...showSecrets, mtn: !showSecrets.mtn })}
                  >
                    {showSecrets.mtn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="mtn-sub-key">Subscription Key</Label>
                <Input
                  id="mtn-sub-key"
                  type={showSecrets.mtn ? "text" : "password"}
                  value={mtnConfig.mtn_subscription_key}
                  onChange={(e) => setMtnConfig({ ...mtnConfig, mtn_subscription_key: e.target.value })}
                  placeholder="Enter Subscription Key"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="mtn-enabled"
                  checked={mtnConfig.is_enabled}
                  onCheckedChange={(checked) => setMtnConfig({ ...mtnConfig, is_enabled: checked })}
                />
                <Label htmlFor="mtn-enabled">Enable MTN Mobile Money</Label>
              </div>

              <Button
                onClick={() => saveMutation.mutate("mtn")}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save MTN Configuration
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Airtel Configuration */}
          <TabsContent value="airtel" className="space-y-4 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configure Airtel Money API credentials. Get your API keys from Airtel Developer Portal.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="airtel-env">Environment</Label>
                <Select 
                  value={airtelConfig.environment} 
                  onValueChange={(v) => setAirtelConfig({ ...airtelConfig, environment: v })}
                >
                  <SelectTrigger id="airtel-env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="airtel-client-id">Client ID</Label>
                <Input
                  id="airtel-client-id"
                  value={airtelConfig.airtel_client_id}
                  onChange={(e) => setAirtelConfig({ ...airtelConfig, airtel_client_id: e.target.value })}
                  placeholder="Enter Airtel Client ID"
                />
              </div>

              <div>
                <Label htmlFor="airtel-client-secret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="airtel-client-secret"
                    type={showSecrets.airtel ? "text" : "password"}
                    value={airtelConfig.airtel_client_secret}
                    onChange={(e) => setAirtelConfig({ ...airtelConfig, airtel_client_secret: e.target.value })}
                    placeholder="Enter Airtel Client Secret"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecrets({ ...showSecrets, airtel: !showSecrets.airtel })}
                  >
                    {showSecrets.airtel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="airtel-enabled"
                  checked={airtelConfig.is_enabled}
                  onCheckedChange={(checked) => setAirtelConfig({ ...airtelConfig, is_enabled: checked })}
                />
                <Label htmlFor="airtel-enabled">Enable Airtel Money</Label>
              </div>

              <Button
                onClick={() => saveMutation.mutate("airtel")}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Airtel Configuration
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
