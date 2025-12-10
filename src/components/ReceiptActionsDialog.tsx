import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, MessageCircle, Eye, FileText, Edit } from "lucide-react";
import { useState } from "react";
import { printReceipt, shareViaWhatsApp } from "@/utils/receiptPrinter";
import { printInvoice, shareInvoiceViaWhatsApp } from "@/utils/invoicePrinter";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";

interface ReceiptActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  customerPhone?: string;
  isInvoice?: boolean;
  onEdit?: () => void;
}

export const ReceiptActionsDialog = ({ 
  isOpen, 
  onClose, 
  receiptData,
  customerPhone,
  isInvoice = false,
  onEdit,
}: ReceiptActionsDialogProps) => {
  const [whatsappNumber, setWhatsappNumber] = useState(customerPhone || "");
  const { isAdmin } = useUserRole();

  const handlePrint = async () => {
    if (isInvoice) {
      await printInvoice(receiptData, false);
    } else {
      await printReceipt(receiptData, false);
    }
  };

  const handlePreview = async () => {
    if (isInvoice) {
      await printInvoice(receiptData, true);
    } else {
      await printReceipt(receiptData, true);
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      if (isInvoice) {
        await shareInvoiceViaWhatsApp(receiptData, whatsappNumber);
      } else {
        await shareViaWhatsApp(receiptData, whatsappNumber);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isInvoice ? 'Invoice' : 'Receipt'} Actions</DialogTitle>
            <Badge variant={isInvoice ? "default" : "secondary"}>
              {isInvoice ? 'Wholesale' : 'Retail'}
            </Badge>
          </div>
          <DialogDescription>
            {isInvoice 
              ? "Preview, print, or share this invoice via WhatsApp" 
              : "Preview, print, or share this receipt via WhatsApp"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isAdmin && onEdit && (
            <Button
              onClick={() => {
                onEdit();
                onClose();
              }}
              variant="default"
              className="w-full"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Receipt
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            
            <Button
              onClick={handlePrint}
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">Customer WhatsApp Number</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+256700000000"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {isInvoice 
                ? "Download PDF invoice and share it via WhatsApp" 
                : "Download PDF receipt and share it via WhatsApp"}
            </p>
          </div>

          <Button
            onClick={handleWhatsAppShare}
            variant="outline"
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Share via WhatsApp
          </Button>

          {isInvoice && (
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Invoice Details</p>
                  <p className="mt-1">
                    This invoice includes itemized costs, bottle charges, and scent mixtures. 
                    Payment terms and full business details are included.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
