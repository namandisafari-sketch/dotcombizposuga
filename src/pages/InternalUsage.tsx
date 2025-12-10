import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useUserRole } from "@/hooks/useUserRole";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Package } from "lucide-react";

const InternalUsage = () => {
  const { isAdmin } = useUserRole();
  const { selectedDepartmentId, selectedDepartment } = useDepartment();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    ml_quantity: "",
    reason: "",
    notes: "",
  });

  // Fetch products for the department
  const { data: products } = useQuery({
    queryKey: ["products-for-usage", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      const data = await localApi.products.getAll(selectedDepartmentId);
      return data;
    },
    enabled: !!selectedDepartmentId,
  });

  const selectedProduct = products?.find((p) => p.id === formData.product_id);
  const isPerfumeProduct = selectedProduct?.tracking_type === 'milliliter';
  const isPerfumeDept = selectedDepartment?.is_perfume_department;

  // Fetch internal usage records
  const { data: usageRecords } = useQuery({
    queryKey: ["internal-usage", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      const data = await localApi.internalUsage.getAll(selectedDepartmentId);
      return data;
    },
    enabled: !!selectedDepartmentId,
  });

  // Create internal usage record
  const createUsageMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const product = products?.find((p) => p.id === data.product_id);
      if (!product) throw new Error("Product not found");

      const isPerfumeTracking = product.tracking_type === 'milliliter';
      const quantity = isPerfumeTracking ? Number(data.ml_quantity) : Number(data.quantity);
      
      if (!quantity || quantity <= 0) {
        throw new Error("Please enter a valid quantity");
      }

      // Calculate value based on tracking type
      let totalValue: number;
      let unitValue: number;
      
      if (isPerfumeTracking) {
        unitValue = Number(product.retail_price_per_ml) || Number(product.selling_price_per_ml) || 0;
        totalValue = quantity * unitValue;
      } else {
        unitValue = Number(product.selling_price);
        totalValue = quantity * unitValue;
      }

      await localApi.internalUsage.create({
        product_id: data.product_id,
        department_id: selectedDepartmentId,
        quantity: quantity,
        unit_value: unitValue,
        total_value: totalValue,
        reason: data.reason,
        notes: data.notes,
        usage_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      toast.success("Internal usage recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-usage"] });
      setIsDialogOpen(false);
      setFormData({ product_id: "", quantity: "", ml_quantity: "", reason: "", notes: "" });
    },
    onError: (error: Error) => {
      toast.error("Failed to record usage: " + error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await localApi.internalUsage.updateStatus(id, status);
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
    },
    onError: () => {
      // Silent fail for not implemented
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityToCheck = isPerfumeProduct ? formData.ml_quantity : formData.quantity;
    if (!formData.product_id || !quantityToCheck) {
      toast.error("Please fill in all required fields");
      return;
    }
    createUsageMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recorded":
        return "default";
      case "accounted":
        return "secondary";
      case "adjusted":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-20 pt-32 lg:pt-20">
      <Navigation />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-20 sm:pt-24 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {selectedDepartment?.name || "Internal"} - Stock Usage
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track products used internally by departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <DepartmentSelector />}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Usage
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Internal Stock Usage</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, product_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stock: {product.tracking_type === 'milliliter' 
                            ? `${product.current_stock_ml || 0} ml` 
                            : `${product.current_stock || 0} ${product.unit}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isPerfumeProduct ? (
                  <div>
                    <Label htmlFor="ml_quantity">Quantity (ml) *</Label>
                    <Input
                      id="ml_quantity"
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.ml_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, ml_quantity: e.target.value })
                      }
                      placeholder="Enter milliliters"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {selectedProduct?.current_stock_ml || 0} ml
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="Enter quantity"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {selectedProduct?.current_stock || 0} {selectedProduct?.unit}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reason: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {isPerfumeDept ? (
                        <>
                          <SelectItem value="Display Purpose">Display Purpose</SelectItem>
                          <SelectItem value="Testing/Sampling">Testing/Sampling</SelectItem>
                          <SelectItem value="Internal Use">Internal Use</SelectItem>
                          <SelectItem value="Damaged/Spoiled">Damaged/Spoiled</SelectItem>
                          <SelectItem value="Staff Use">Staff Use</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Office Use">Office Use</SelectItem>
                          <SelectItem value="Shop Operations">Shop Operations</SelectItem>
                          <SelectItem value="Staff Use">Staff Use</SelectItem>
                          <SelectItem value="Damaged">Damaged</SelectItem>
                          <SelectItem value="Promotional">Promotional</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUsageMutation.isPending}
                    className="flex-1"
                  >
                    {createUsageMutation.isPending ? "Recording..." : "Record"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageRecords?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Internal usage entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                UGX{" "}
                {usageRecords
                  ?.reduce((sum, record) => sum + Number(record.total_value), 0)
                  .toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Cumulative cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usageRecords?.filter((r) => r.status === "recorded").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting accounting</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usage History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No usage records yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageRecords?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(record.usage_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {record.products?.name}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {record.departments?.name}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {record.quantity} {record.products?.unit}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          UGX {Number(record.total_value).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {record.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Select
                              value={record.status}
                              onValueChange={(value) =>
                                updateStatusMutation.mutate({
                                  id: record.id,
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recorded">Recorded</SelectItem>
                                <SelectItem value="accounted">Accounted</SelectItem>
                                <SelectItem value="adjusted">Adjusted</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InternalUsage;
