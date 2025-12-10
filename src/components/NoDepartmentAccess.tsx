import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function NoDepartmentAccess() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-warning" />
            <CardTitle>Setup In Progress</CardTitle>
          </div>
          <CardDescription>
            Your account is being configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account will be assigned to a department shortly. Once assigned, you'll have access to your department's features and data.
          </p>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Account: <span className="font-medium">{user?.email}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
