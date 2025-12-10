import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UserAccountsGuide() {
  const navigate = useNavigate();

  // User accounts from backup (extracted from backup.json user_roles)
  const userAccounts = [
    { id: "39c17005-a93b-4f3d-bf97-3466aa41dd0d", role: "admin", note: "Your current account" },
    { id: "e3ee56c1-af00-4b26-b194-d4b31fa67f0c", role: "admin" },
    { id: "80aab57d-5f50-44e5-af36-55e442f0a766", role: "admin" },
    { id: "9f5f3635-a8f3-45db-99ca-c45db3ec884c", role: "user" },
    { id: "82639a9b-015b-4bf1-8705-1a7a2cbcc5cf", role: "user" },
    { id: "f8d01c2a-74d7-4be7-b986-811522c0ea5d", role: "user" },
    { id: "487dd498-982c-414a-acd0-c158e627df44", role: "user" },
    { id: "936a2808-06fa-4fde-944c-596a670f5334", role: "user" },
    { id: "ca7477e8-f0c6-46f4-9ffa-4a145519d84d", role: "user" },
    { id: "aaa30bcf-29db-4bac-8288-1136d0dd642d", role: "user" },
    { id: "0d249c12-3914-4d35-8af2-2d97d12b9002", role: "user" },
    { id: "e96351e2-7ae9-4469-9871-8a38151217ea", role: "user" },
    { id: "7f10dd98-d9e4-4c7e-bce3-722b85b2e89e", role: "user" },
  ];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>User Accounts Guide</CardTitle>
              <CardDescription>
                Understanding user account restoration after data import
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Important Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> User authentication accounts cannot be directly imported 
              because they contain encrypted passwords and are managed by Supabase's authentication system.
            </AlertDescription>
          </Alert>

          {/* What Was Imported */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">What Was Imported</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
              <li>User roles and permissions (which user IDs should be admin/user)</li>
              <li>All business data (departments, products, sales, customers)</li>
              <li>System settings and configurations</li>
            </ul>
          </div>

          {/* What Needs to Be Done */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">User Accounts Found in Backup</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Your backup contained {userAccounts.length} user accounts. These accounts need to be recreated 
              through the authentication system:
            </p>
            
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {userAccounts.map((user) => (
                <div key={user.id} className="p-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
                    {user.note && (
                      <p className="text-xs text-green-600 dark:text-green-400">{user.note}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How to Create Accounts */}
          <div className="space-y-3">
            <h3 className="font-semibold">How to Recreate User Accounts</h3>
            
            <div className="space-y-2">
              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Option 1: Staff Management (Recommended for Admins)</h4>
                <p className="text-sm text-muted-foreground">
                  Use the Staff Management page to create user accounts with specific roles and departments.
                </p>
                <Button
                  onClick={() => navigate('/staff-management')}
                  variant="outline"
                  size="sm"
                >
                  Go to Staff Management
                </Button>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Option 2: Self Sign-Up</h4>
                <p className="text-sm text-muted-foreground">
                  Users can create their own accounts at the sign-up page. Admins will need to assign 
                  roles and departments afterwards.
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  size="sm"
                >
                  Go to Sign Up
                </Button>
              </div>
            </div>
          </div>

          {/* After Account Creation */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Once accounts are created with the same email addresses, 
              their roles will automatically be applied based on the imported user_roles data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}