import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreditCard, Search, Plus, DollarSign, User } from "lucide-react";

export default function CustomerCredits() {
  const queryClient = useQueryClient();
  const { selectedDepartmentId } = useDepartment();
  const { isAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Fetch customers with outstanding credits
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers-with-credits", selectedDepartmentId, searchQuery],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];

      let query = supabase
        .from("customers")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .order("name");

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDepartmentId,
  });

  // Fetch credit sales for a customer
  const { data: creditSales } = useQuery({
    queryKey: ["customer-credit-sales", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];

      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", selectedCustomer.id)
        .eq("payment_method", "credit")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCustomer?.id,
  });

  // Calculate outstanding balance from credit sales
  const calculateOutstandingBalance = (customerId: string) => {
    // This would need to be calculated from sales with payment_method = 'credit'
    // and any payments made against those sales
    return 0; // Placeholder
  };

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      // Create a payment record in credits table
      const { error } = await supabase.from("credits").insert({
        customer_id: selectedCustomer.id,
        department_id: selectedDepartmentId,
        amount: -amount, // Negative amount for payment
        status: "settled",
        notes: `Payment received from ${selectedCustomer.name}`,
      });

      if (error) throw error;

      toast.success(`Payment of ${amount.toLocaleString()} recorded`);
      setShowPaymentDialog(false);
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: ["customers-with-credits"] });
    } catch (error: any) {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Customer Credits
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : customers?.length === 0 ? (
            <p className="text-muted-foreground">No customers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p>{selectedCustomer?.phone || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p>{selectedCustomer?.email || "-"}</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Credit History</h3>
              <Button
                size="sm"
                onClick={() => setShowPaymentDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            </div>

            {creditSales?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No credit sales found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sale #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditSales?.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{sale.sale_number}</TableCell>
                      <TableCell className="text-right">
                        {Number(sale.total).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "voided" ? "destructive" : "secondary"}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer</Label>
              <p className="font-medium">{selectedCustomer?.name}</p>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <Button onClick={handlePayment} className="w-full">
              <DollarSign className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
