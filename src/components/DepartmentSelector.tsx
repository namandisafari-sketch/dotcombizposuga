import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useUserRole } from "@/hooks/useUserRole";

export function DepartmentSelector() {
  const { selectedDepartmentId, setSelectedDepartmentId, departments, isLoading } = useDepartment();
  const { isAdmin } = useUserRole();

  // Filter out mobile money departments
  const availableDepartments = departments.filter(d => !d.is_mobile_money);

  // Only show selector to admins
  if (!isAdmin || isLoading || availableDepartments.length === 0) return null;

  const selectedDept = availableDepartments.find(d => d.id === selectedDepartmentId);

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
          {availableDepartments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
