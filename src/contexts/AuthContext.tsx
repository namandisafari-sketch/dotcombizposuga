import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  is_active?: boolean;
}

interface UserRole {
  role: string;
  department_id?: string;
  nav_permissions?: string[];
}

interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  department_id?: string;
  is_active: boolean;
  role?: string;
  nav_permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserDetails = async (authUser: User): Promise<AuthUser | null> => {
    try {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // Get role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      return {
        id: authUser.id,
        email: authUser.email || profile?.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name,
        department_id: roleData?.department_id,
        is_active: profile?.is_active ?? true,
        role: roleData?.role || 'staff',
        nav_permissions: roleData?.nav_permissions || []
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name,
        is_active: true,
        role: 'staff'
      };
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            const userDetails = await fetchUserDetails(currentSession.user);
            setUser(userDetails);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('Initial session check:', initialSession?.user?.email);
      setSession(initialSession);
      
      if (initialSession?.user) {
        const userDetails = await fetchUserDetails(initialSession.user);
        setUser(userDetails);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const userDetails = await fetchUserDetails(authUser);
      setUser(userDetails);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
