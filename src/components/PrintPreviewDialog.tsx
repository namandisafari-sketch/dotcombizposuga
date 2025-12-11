import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download, X, ZoomIn, ZoomOut, RotateCcw, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentHtml: string;
  documentTitle?: string;
  documentType?: "receipt" | "invoice" | "report";
  onPrint?: () => void;
  onDownloadPdf?: () => void;
}

export const PrintPreviewDialog = ({
  open,
  onOpenChange,
  documentHtml,
  documentTitle = "Document",
  documentType = "receipt",
  onPrint,
  onDownloadPdf,
}: PrintPreviewDialogProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMobile = useIsMobile();
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState<"receipt" | "a4" | "letter">(
    documentType === "receipt" ? "receipt" : "a4"
  );
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [zoom, setZoom] = useState(isMobile ? 60 : 100);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettings, setShowSettings] = useState(!isMobile);

  // Update zoom when mobile changes
  useEffect(() => {
    if (isMobile) {
      setZoom(60);
      setShowSettings(false);
    } else {
      setZoom(100);
      setShowSettings(true);
    }
  }, [isMobile]);

  // Update iframe content when documentHtml changes
  useEffect(() => {
    if (iframeRef.current && open && documentHtml) {
      const iframe = iframeRef.current;
      // Small delay to ensure iframe is mounted
      setTimeout(() => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(documentHtml);
          doc.close();
        }
      }, 100);
    }
  }, [documentHtml, open]);

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      // Create a hidden print window with proper print styles
      const printWindow = window.open("", "_blank", "width=400,height=800");
      
      if (!printWindow) {
        console.error("Could not open print window. Please allow popups.");
        setIsPrinting(false);
        return;
      }

      // Add print-specific CSS based on settings
      const printStyles = `
        @page {
          size: ${paperSize === "receipt" ? "80mm auto" : paperSize === "a4" ? "A4" : "letter"} ${orientation};
          margin: ${paperSize === "receipt" ? "2mm" : "10mm"};
        }
        @media print {
          body { margin: 0; padding: 5px; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .back-page { 
            page-break-before: avoid !important; 
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .back-page { border-top: 2px dashed #000; margin-top: 20px; padding-top: 20px; }
        }
      `;

      // Inject print styles into the document
      const htmlWithPrintStyles = documentHtml.replace(
        "</head>",
        `<style>${printStyles}</style></head>`
      );

      printWindow.document.write(htmlWithPrintStyles);
      printWindow.document.close();

      // Wait for images to load
      const waitForImages = async () => {
        const images = printWindow.document.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
          return new Promise<void>((resolveImg) => {
            if (img.complete && img.naturalHeight !== 0) {
              resolveImg();
              return;
            }
            img.onload = () => resolveImg();
            img.onerror = () => resolveImg();
          });
        });
        await Promise.all(imagePromises);
      };

      // Use requestAnimationFrame for dynamically written content
      const initPrint = async () => {
        await Promise.race([
          waitForImages(),
          new Promise(r => setTimeout(r, 3000))
        ]);
        await new Promise(r => setTimeout(r, 800));
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          setIsPrinting(false);
          onPrint?.();
        }, 2000);
      };

      if (printWindow.requestAnimationFrame) {
        printWindow.requestAnimationFrame(() => {
          printWindow.requestAnimationFrame(() => {
            initPrint();
          });
        });
      } else {
        setTimeout(initPrint, 500);
      }
    } catch (error) {
      console.error("Print error:", error);
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const container = document.createElement("div");
      container.innerHTML = documentHtml;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const pdfOptions = {
        margin: paperSize === "receipt" ? 5 : 10,
        filename: `${documentTitle.replace(/\s+/g, "_")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: {
          unit: "mm" as const,
          format: paperSize === "receipt" ? [80, 200] as [number, number] : paperSize === "a4" ? "a4" : "letter",
          orientation: orientation as "portrait" | "landscape",
        },
      };

      await html2pdf().from(container).set(pdfOptions).save();

      document.body.removeChild(container);
      onDownloadPdf?.();
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const resetZoom = () => setZoom(isMobile ? 60 : 100);

  const getPreviewWidth = () => {
    switch (paperSize) {
      case "receipt":
        return 320;
      case "a4":
        return orientation === "portrait" ? 595 : 842;
      case "letter":
        return orientation === "portrait" ? 612 : 792;
      default:
        return 595;
    }
  };

  const getPreviewHeight = () => {
    switch (paperSize) {
      case "receipt":
        return 800;
      case "a4":
        return orientation === "portrait" ? 842 : 595;
      case "letter":
        return orientation === "portrait" ? 792 : 612;
      default:
        return 842;
    }
  };

  // Mobile Settings Panel Component
  const SettingsPanel = () => (
    <div className={cn(
      "space-y-4",
      isMobile ? "p-4" : ""
    )}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="copies" className="text-sm font-medium">
            Copies
          </Label>
          <Input
            id="copies"
            type="number"
            min={1}
            max={99}
            value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paperSize" className="text-sm font-medium">
            Paper Size
          </Label>
          <Select
            value={paperSize}
            onValueChange={(value: "receipt" | "a4" | "letter") => setPaperSize(value)}
          >
            <SelectTrigger id="paperSize" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              <SelectItem value="receipt">Receipt (80mm)</SelectItem>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {paperSize !== "receipt" && (
        <div className="space-y-2">
          <Label htmlFor="orientation" className="text-sm font-medium">
            Orientation
          </Label>
          <Select
            value={orientation}
            onValueChange={(value: "portrait" | "landscape") => setOrientation(value)}
          >
            <SelectTrigger id="orientation" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!isMobile && (
        <>
          <Separator />
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Preview Controls
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={zoomOut} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[50px] text-center">{zoom}%</span>
            <Button variant="outline" size="icon" onClick={zoomIn} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetZoom} className="h-8 w-8">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <Separator />
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Click "Print" to open the system print dialog where you
              can select from available printers.
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex flex-col p-0 gap-0 bg-background",
        isMobile 
          ? "max-w-[100vw] w-full h-[100dvh] max-h-[100dvh] rounded-none m-0" 
          : "max-w-5xl h-[90vh]"
      )}>
        {/* Header */}
        <DialogHeader className={cn(
          "px-4 py-3 border-b bg-muted/30 shrink-0",
          isMobile ? "sticky top-0 z-10" : "px-6 py-4"
        )}>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className={cn(
              "font-semibold flex items-center gap-2 truncate",
              isMobile ? "text-base" : "text-xl"
            )}>
              <Printer className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "shrink-0")} />
              <span className="truncate">
                {isMobile ? documentTitle : `Print Preview - ${documentTitle}`}
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Mobile Layout */}
        {isMobile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Collapsible Settings */}
            <div className="border-b bg-muted/20">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Print Settings
                </span>
                {showSettings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showSettings && (
                <div className="border-t">
                  <SettingsPanel />
                </div>
              )}
            </div>

            {/* Mobile Zoom Controls */}
            <div className="px-4 py-2 border-b bg-background flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={zoomOut} className="h-8 px-3">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[50px] text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={zoomIn} className="h-8 px-3">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetZoom} className="h-8 px-3">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-muted/50 overflow-auto">
              <div className="p-4 flex justify-center min-h-full">
                <div
                  className="bg-white shadow-xl rounded-lg overflow-hidden transition-transform origin-top"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top center",
                    width: getPreviewWidth(),
                    minHeight: getPreviewHeight(),
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    title="Print Preview"
                    className="w-full border-0 bg-white"
                    style={{
                      width: getPreviewWidth(),
                      height: getPreviewHeight(),
                      minHeight: getPreviewHeight(),
                      pointerEvents: "none",
                    }}
                    srcDoc={documentHtml || "<html><body><p>No content to preview</p></body></html>"}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons - Fixed at bottom */}
            <div className="shrink-0 p-4 border-t bg-background space-y-2 safe-area-inset-bottom">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="gap-2 h-12"
                  size="lg"
                >
                  <Printer className="h-4 w-4" />
                  {isPrinting ? "Printing..." : "Print"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="gap-2 h-12"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Layout */
          <div className="flex flex-1 overflow-hidden">
            {/* Settings Panel */}
            <div className="w-72 border-r bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Print Settings
                </h3>
                <SettingsPanel />
              </div>

              <div className="mt-auto space-y-2">
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Printer className="h-4 w-4" />
                  {isPrinting ? "Printing..." : "Print"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-muted/50 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-8 flex justify-center">
                  <div
                    className="bg-white shadow-xl rounded-lg overflow-hidden transition-transform"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                      width: getPreviewWidth(),
                      minHeight: getPreviewHeight(),
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      title="Print Preview"
                      className="w-full border-0 bg-white"
                      style={{
                        width: getPreviewWidth(),
                        height: getPreviewHeight(),
                        minHeight: getPreviewHeight(),
                        pointerEvents: "none",
                      }}
                      srcDoc={documentHtml || "<html><body><p>No content to preview</p></body></html>"}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreviewDialog;
