import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { printReceipt } from "@/utils/receiptPrinter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Receipt } from "lucide-react";

interface AppointmentCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  departmentId: string;
}

export function AppointmentCheckoutDialog({
  open,
  onOpenChange,
  appointment,
  departmentId,
}: AppointmentCheckoutDialogProps) {
  const queryClient = useQueryClient();
  const [servicePrice, setServicePrice] = useState(appointment?.services?.price || 0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card" | "credit">("cash");
  const [discount, setDiscount] = useState(0);
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);

  const subtotal = servicePrice;
  const total = Math.max(0, subtotal - discount);

  const completeAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`;

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();

      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          customer_id: appointment.customer_id,
          subtotal,
          discount,
          total,
          payment_method: paymentMethod,
          cashier_id: user?.id,
          department_id: departmentId,
          notes: `Appointment service: ${appointment.services?.name || "N/A"}`,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale item
      const { error: itemError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        service_id: appointment.service_id,
        name: appointment.services?.name || "Service",
        quantity: 1,
        unit_price: servicePrice,
        total: servicePrice,
      });

      if (itemError) throw itemError;

      return { sale, saleNumber };
    },
    onSuccess: async ({ sale, saleNumber }) => {
      toast.success("Appointment completed and sale recorded");
      
      // Print receipt if enabled
      if (shouldPrintReceipt) {
        try {
          const { data: settings } = await supabase
            .from("settings")
            .select("*")
            .eq("department_id", departmentId)
            .maybeSingle();

          const { data: globalSettings } = await supabase
            .from("settings")
            .select("*")
            .is("department_id", null)
            .maybeSingle();

          const settingsData = settings || globalSettings;

          let customerName, customerPhone;
          if (appointment.customer_id) {
            const { data: customer } = await supabase
              .from("customers")
              .select("name, phone")
              .eq("id", appointment.customer_id)
              .maybeSingle();
            
            if (customer) {
              customerName = customer.name;
              customerPhone = customer.phone;
            }
          }

          const { data: dept } = await supabase
            .from("departments")
            .select("name")
            .eq("id", departmentId)
            .single();

          const receiptData = {
            receiptNumber: saleNumber,
            items: [{
              name: appointment.services?.name || "Service",
              quantity: 1,
              price: servicePrice,
              subtotal: servicePrice,
            }],
            subtotal,
            tax: 0,
            total,
            paymentMethod,
            date: new Date().toLocaleString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            cashierName: "Staff",
            customerName,
            customerPhone,
            departmentName: dept?.name,
            businessInfo: {
              name: settingsData?.business_name || "DOTCOM BROTHERS LTD",
              address: "Kasangati opp Kasangati Police Station",
              phone: "+256745368426",
              whatsapp: "+256745368426",
            },
          };

          await printReceipt(receiptData, false);
        } catch (error) {
          console.error("Failed to print receipt:", error);
          toast.error("Sale completed but failed to print receipt");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to complete appointment:", error);
      toast.error("Failed to complete appointment");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Appointment & Process Payment</DialogTitle>
          <DialogDescription>
            Create sale and issue receipt for completed service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Input value={appointment?.customers?.name || "Walk-in"} disabled />
          </div>

          <div className="space-y-2">
            <Label>Service</Label>
            <Input value={appointment?.services?.name || "N/A"} disabled />
          </div>

          <div className="space-y-2">
            <Label>Service Price (UGX)</Label>
            <Input
              type="number"
              value={servicePrice}
              onChange={(e) => setServicePrice(Number(e.target.value))}
              placeholder="Enter service price"
            />
          </div>

          <div className="space-y-2">
            <Label>Discount (UGX)</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              placeholder="Enter discount amount"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="print-receipt"
              checked={shouldPrintReceipt}
              onCheckedChange={(checked) => setShouldPrintReceipt(checked as boolean)}
            />
            <Label htmlFor="print-receipt" className="text-sm font-normal cursor-pointer">
              Print receipt after completing
            </Label>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{subtotal.toLocaleString()} UGX</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span className="text-destructive">-{discount.toLocaleString()} UGX</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">{total.toLocaleString()} UGX</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => completeAppointmentMutation.mutate()}
            disabled={completeAppointmentMutation.isPending || servicePrice <= 0}
            className="flex-1"
          >
            {completeAppointmentMutation.isPending ? (
              "Processing..."
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Complete & Issue Receipt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
