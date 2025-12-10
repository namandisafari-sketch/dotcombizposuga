import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function RegularDepartmentSelector() {
  const { selectedDepartmentId, setSelectedDepartmentId, isLoading: contextLoading } = useDepartment();
  const { isAdmin } = useUserRole();

  // Fetch regular departments (not perfume or mobile money based on settings)
  const { data: regularDepartments = [], isLoading } = useQuery({
    queryKey: ["regular-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      
      // Filter out departments with special settings
      return (data || []).filter((dept: any) => {
        const settings = dept.settings as Record<string, any> | null;
        return !settings?.is_mobile_money && !settings?.is_perfume_department;
      });
    },
  });

  // Only show selector to admins
  if (!isAdmin || isLoading || contextLoading || regularDepartments.length === 0) return null;

  const selectedDept = regularDepartments.find(d => d.id === selectedDepartmentId);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedDepartmentId || ""} onValueChange={setSelectedDepartmentId}>
        <SelectTrigger className="w-[200px] border-0 focus:ring-0 h-8">
          <SelectValue>
            {selectedDept?.name || "Select Department"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {regularDepartments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
