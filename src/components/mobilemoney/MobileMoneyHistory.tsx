import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { printReceipt } from "@/utils/receiptPrinter";

interface MobileMoneyHistoryProps {
  departmentId: string;
}

export function MobileMoneyHistory({ departmentId }: MobileMoneyHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch sales history
  const { data: salesHistory, isLoading } = useQuery({
    queryKey: ["mobile-money-sales-history", departmentId, searchQuery, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            *,
            products (name),
            services (name)
          )
        `)
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });

      // Apply search filter on sale_number
      if (searchQuery) {
        query = query.ilike("sale_number", `%${searchQuery}%`);
      }

      // Apply date filters
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate + "T23:59:59");
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });

  // Fetch settings for receipt printing
  const { data: settings } = useQuery({
    queryKey: ["settings", departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("department_id", departmentId)
        .maybeSingle();
      return data;
    },
    enabled: !!departmentId,
  });

  const handleViewDetails = (sale: any) => {
    setSelectedSale(sale);
    setDetailsDialogOpen(true);
  };

  const handleReprintReceipt = async (sale: any) => {
    try {
      const { data: globalSettings } = await supabase
        .from("settings")
        .select("*")
        .is("department_id", null)
        .maybeSingle();

      const settingsData = settings || globalSettings;

      const receiptData = {
        receiptNumber: sale.sale_number,
        date: format(new Date(sale.created_at), "PPP p"),
        cashierName: "Staff",
        items: sale.sale_items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unit_price,
          subtotal: item.total,
        })),
        subtotal: sale.subtotal,
        tax: 0,
        total: sale.total,
        paymentMethod: sale.payment_method,
        businessInfo: {
          name: settingsData?.business_name || "Mobile Money Department",
          address: "Kasangati opp Kasangati Police Station",
          phone: "+256745368426",
        },
      };

      await printReceipt(receiptData);
      toast.success("Receipt sent to printer");
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast.error("Failed to print receipt");
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      cash: "default",
      mobile_money: "secondary",
      card: "outline",
    };
    return <Badge variant={variants[method] || "default"}>{method}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Sale number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : salesHistory && salesHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesHistory.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono">{sale.sale_number}</TableCell>
                    <TableCell>{format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell className="font-semibold">
                      UGX {Number(sale.total).toLocaleString()}
                    </TableCell>
                    <TableCell>{getPaymentMethodBadge(sale.payment_method)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.sale_items.length} items</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReprintReceipt(sale)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No sales history found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              View complete transaction details and items
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Sale Number</Label>
                    <p className="font-mono font-medium">{selectedSale.sale_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {format(new Date(selectedSale.created_at), "PPP p")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <div className="mt-1">{getPaymentMethodBadge(selectedSale.payment_method)}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">Items Sold</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.sale_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>UGX {Number(item.unit_price).toLocaleString()}</TableCell>
                          <TableCell>UGX {Number(item.total).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">UGX {Number(selectedSale.subtotal).toLocaleString()}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium text-destructive">
                        -UGX {Number(selectedSale.discount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>UGX {Number(selectedSale.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
