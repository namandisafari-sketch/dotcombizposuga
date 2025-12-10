import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QrCode, Download, Share2, Printer } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ScentCheckInQR = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  // Fetch perfume departments
  const { data: departments } = useQuery({
    queryKey: ["perfume-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_perfume_department", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (selectedDepartment) {
      generateQRCode();
    }
  }, [selectedDepartment]);

  const getCustomerCheckInUrl = () => {
    return `${window.location.origin}/customer-scent-check-in?dept=${selectedDepartment}`;
  };

  const generateQRCode = async () => {
    if (!selectedDepartment) return;

    try {
      const url = await QRCode.toDataURL(getCustomerCheckInUrl(), {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "scent-check-in-qr-code.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded");
  };

  const printQRCode = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scent Check-In QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 10px;
            }
            h2 {
              font-size: 24px;
              color: #666;
              margin-bottom: 30px;
            }
            img {
              max-width: 400px;
              margin: 20px 0;
            }
            .instructions {
              font-size: 18px;
              color: #333;
              margin-top: 20px;
              max-width: 500px;
            }
            .url {
              font-size: 14px;
              color: #666;
              margin-top: 20px;
              word-break: break-all;
            }
            @media print {
              @page {
                margin: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>My Scent History</h1>
            <h2>Find Your Perfume Mixtures</h2>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <div class="instructions">
              <strong>Scan this QR code to check your scent history</strong>
              <p>You can search by your name, phone number, or receipt number</p>
            </div>
            <div class="url">${getCustomerCheckInUrl()}</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const copyLink = () => {
    if (!selectedDepartment) {
      toast.error("Please select a department first");
      return;
    }
    navigator.clipboard.writeText(getCustomerCheckInUrl());
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <QrCode className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Customer Scent Check-In QR Code</h1>
          <p className="text-muted-foreground">
            Generate and share QR code for customers to check their scent history
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              Customers scan this to access their scent history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Department Selection */}
            <div className="space-y-2">
              <Label htmlFor="department">Select Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Choose a perfume department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {qrCodeUrl && selectedDepartment ? (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-primary/20 flex items-center justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="Customer Check-In QR Code"
                    className="w-full max-w-[300px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={downloadQRCode} variant="default" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download QR Code
                  </Button>
                  <Button onClick={printQRCode} variant="outline" className="w-full">
                    <Printer className="mr-2 h-4 w-4" />
                    Print QR Code
                  </Button>
                  <Button onClick={copyLink} variant="outline" className="w-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {!selectedDepartment ? (
                  <p>Please select a department to generate QR code</p>
                ) : (
                  <p>Generating QR code...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Customer self-service scent lookup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Customer Scans QR Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Display this QR code at your shop counter or send it to customers
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Enter Search Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer enters their name, phone number, or receipt number
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">View Scent History</h3>
                  <p className="text-sm text-muted-foreground">
                    System displays their previous perfume mixtures and preferences
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Customers can find their scent history anytime</li>
                <li>Reduces workload on attendants</li>
                <li>Improves customer experience and satisfaction</li>
                <li>Customers won't forget their favorite mixtures</li>
              </ul>
            </div>

            {selectedDepartment && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <strong>Direct Link:</strong>
                <br />
                <code className="break-all">{getCustomerCheckInUrl()}</code>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScentCheckInQR;
