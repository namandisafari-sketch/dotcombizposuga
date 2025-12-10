import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  // For local backend, role info comes from the user object
  const role = (user?.role as UserRole) || "user";
  
  return {
    role,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isLoading: authLoading,
    departmentId: user?.department_id,
  };
};
