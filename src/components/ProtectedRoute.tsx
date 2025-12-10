import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { NoDepartmentAccess } from "./NoDepartmentAccess";

interface ProtectedRouteProps {
  children?: ReactNode;
  requireDepartment?: boolean;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireDepartment = true,
  requireAdmin = false,
  requireModerator = false
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { isAdmin, isModerator, departmentId, isLoading: roleLoading } = useUserRole();

  console.log('ProtectedRoute - user:', user);
  console.log('ProtectedRoute - isAdmin:', isAdmin);
  console.log('ProtectedRoute - departmentId:', departmentId);
  console.log('ProtectedRoute - requireDepartment:', requireDepartment);
  console.log('ProtectedRoute - will show NoDepartmentAccess:', requireDepartment && !isAdmin && !departmentId);

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access requirements
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireModerator && !isModerator && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Non-admin users without department assignment need to be assigned (unless department is not required)
  if (requireDepartment && !isAdmin && !departmentId) {
    return <NoDepartmentAccess />;
  }

  return <>{children || <Outlet />}</>;
}
