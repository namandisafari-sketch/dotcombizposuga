import { useUserRole } from "./useUserRole";
import { useAuth } from "@/contexts/AuthContext";

export const useDepartmentAccess = () => {
  const { isAdmin, role, departmentId } = useUserRole();
  const { user } = useAuth();

  const canAccessDepartment = (deptId: string | null) => {
    // Admins can access all departments
    if (isAdmin) return true;
    
    // If no department restriction, allow access
    if (!deptId) return true;
    
    // If user has no department, deny access (should be assigned one)
    if (!departmentId) return false;
    
    // Check if user's department matches
    return departmentId === deptId;
  };

  const canAccessFeature = (feature: string) => {
    // Admins can access all features
    if (isAdmin) return true;

    // If user has no department, deny access to restricted features
    if (!departmentId) {
      return false;
    }

    // All authenticated users with departments can access all features
    // Department-specific data filtering is handled by backend
    return true;
  };

  return {
    userDepartmentId: departmentId,
    canAccessDepartment,
    canAccessFeature,
    isAdmin,
  };
};
