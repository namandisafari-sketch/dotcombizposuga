import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CustomBarcodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (barcode: string) => void;
  currentBarcode?: string;
}

export const CustomBarcodeGenerator = ({
  isOpen,
  onClose,
  currentBarcode,
  onGenerate,
}: CustomBarcodeGeneratorProps) => {
  const [customBarcode, setCustomBarcode] = useState(currentBarcode || "");
  const [prefix, setPrefix] = useState("PROD");

  const generateRandomBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const generated = `${prefix}${timestamp}${random}`;
    setCustomBarcode(generated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customBarcode);
    toast.success("Barcode copied to clipboard");
  };

  const handleApply = () => {
    if (!customBarcode.trim()) {
      toast.error("Please enter or generate a barcode");
      return;
    }
    onGenerate(customBarcode);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Custom Barcode Generator
          </DialogTitle>
          <DialogDescription>
            Generate or enter a custom barcode for this product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Barcode Prefix (Optional)</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="PROD"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Use a prefix to categorize your products (e.g., PERF for perfumes)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Custom Barcode</Label>
            <div className="flex gap-2">
              <Input
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value.toUpperCase())}
                placeholder="Enter or generate barcode"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={generateRandomBarcode}
                title="Generate Random"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!customBarcode}
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-mono font-bold tracking-wider">
              {customBarcode || "---"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is your custom barcode
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">💡 Tips:</p>
            <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
              <li>Use unique codes for each product variant</li>
              <li>Keep barcodes short and memorable</li>
              <li>Use prefixes to organize by category</li>
              <li>Avoid special characters for scanner compatibility</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Barcode
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
