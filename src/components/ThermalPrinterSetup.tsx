/// <reference path="../types/webusb.d.ts" />
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Usb, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  isWebUSBSupported,
  requestPrinter,
  connectPrinter,
  disconnectPrinter,
  getPairedDevices,
  getPrinterStatus,
  printText,
} from "@/utils/thermalPrinter";
import type { USBDevice } from "@/types/webusb.d";

interface ThermalPrinterSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterConnected?: () => void;
}

export const ThermalPrinterSetup = ({
  open,
  onOpenChange,
  onPrinterConnected,
}: ThermalPrinterSetupProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<USBDevice[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<{
    connected: boolean;
    deviceName?: string;
  }>({ connected: false });

  useEffect(() => {
    setIsSupported(isWebUSBSupported());
    loadPairedDevices();
    updatePrinterStatus();
  }, [open]);

  const loadPairedDevices = async () => {
    const devices = await getPairedDevices();
    setPairedDevices(devices);
  };

  const updatePrinterStatus = () => {
    setPrinterStatus(getPrinterStatus());
  };

  const handleRequestPrinter = async () => {
    setIsConnecting(true);
    try {
      const device = await requestPrinter();
      if (device) {
        const connected = await connectPrinter(device);
        if (connected) {
          toast.success("Printer connected successfully!");
          updatePrinterStatus();
          onPrinterConnected?.();
        } else {
          toast.error("Failed to connect to printer");
        }
      }
      loadPairedDevices();
    } catch (error) {
      console.error("Error requesting printer:", error);
      toast.error("Failed to access printer. Make sure it's connected via USB.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectPairedDevice = async (device: USBDevice) => {
    setIsConnecting(true);
    try {
      const connected = await connectPrinter(device);
      if (connected) {
        toast.success("Printer connected!");
        updatePrinterStatus();
        onPrinterConnected?.();
      } else {
        toast.error("Failed to connect to printer");
      }
    } catch (error) {
      console.error("Error connecting to printer:", error);
      toast.error("Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    updatePrinterStatus();
    toast.info("Printer disconnected");
  };

  const handleTestPrint = async () => {
    try {
      const success = await printText(
        "=== PRINTER TEST ===\n\nYour thermal printer is\nworking correctly!\n\nDotCom Brothers POS\n"
      );
      if (success) {
        toast.success("Test page printed!");
      } else {
        toast.error("Failed to print test page");
      }
    } catch (error) {
      console.error("Test print error:", error);
      toast.error("Print failed. Check printer connection.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Thermal Printer Setup
          </DialogTitle>
          <DialogDescription>
            Connect your USB thermal printer for direct printing without the Android print dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* WebUSB Support Check */}
          {!isSupported ? (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">WebUSB Not Supported</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please use Chrome or Edge browser on Android for USB printer access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current Connection Status */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Connection Status
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={updatePrinterStatus}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {printerStatus.connected ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{printerStatus.deviceName}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Connected
                          </Badge>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">No printer connected</span>
                        </>
                      )}
                    </div>
                  </div>

                  {printerStatus.connected && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={handleTestPrint}>
                        Test Print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                        Disconnect
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paired Devices */}
              {pairedDevices.length > 0 && !printerStatus.connected && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Previously Paired Printers</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {pairedDevices.map((device, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <Usb className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{device.productName || "USB Printer"}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleConnectPairedDevice(device)}
                          disabled={isConnecting}
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Add New Printer */}
              <Button
                onClick={handleRequestPrinter}
                disabled={isConnecting}
                className="w-full gap-2"
                size="lg"
              >
                <Usb className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect USB Printer"}
              </Button>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Instructions:</strong>
                  <br />
                  1. Connect your thermal printer via USB
                  <br />
                  2. Click "Connect USB Printer" above
                  <br />
                  3. Select your printer from the popup
                  <br />
                  4. Receipts will print directly without dialog
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThermalPrinterSetup;
