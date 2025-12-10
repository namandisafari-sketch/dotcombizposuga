import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Barcode, Plus, Trash2, Printer, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { localApi } from "@/lib/localApi";

interface BarcodeItem {
  id: string;
  code: string;
  productName: string;
  qrCodeUrl: string;
}

const BarcodeGenerator = () => {
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [prefix, setPrefix] = useState("PROD");
  const [productName, setProductName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [existingBarcodes, setExistingBarcodes] = useState<Set<string>>(new Set());
  
  // Product attributes for auto-prefix generation
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variant, setVariant] = useState("");
  const [autoGeneratePrefix, setAutoGeneratePrefix] = useState(true);

  // Load existing barcodes from database on mount
  useEffect(() => {
    loadExistingBarcodes();
  }, []);

  const loadExistingBarcodes = async () => {
    try {
      const data = await localApi.products.getAll();

      const codes = new Set<string>();
      const nameWithPrefixToBarcode = new Map<string, string>();
      
      data?.forEach((product) => {
        if (product.barcode) {
          codes.add(product.barcode.toUpperCase());
          // Store with full barcode as key (includes prefix info)
          const key = `${product.barcode.toUpperCase()}_${product.name.toLowerCase().trim()}`;
          nameWithPrefixToBarcode.set(key, product.barcode);
        }
        if (product.internal_barcode) {
          codes.add(product.internal_barcode.toUpperCase());
          const key = `${product.internal_barcode.toUpperCase()}_${product.name.toLowerCase().trim()}`;
          if (!nameWithPrefixToBarcode.has(key)) {
            nameWithPrefixToBarcode.set(key, product.internal_barcode);
          }
        }
      });

      setExistingBarcodes(codes);
      // Store name+prefix to barcode mapping
      (window as any).__productNamePrefixBarcodeMap = nameWithPrefixToBarcode;
      console.log(`Loaded ${codes.size} existing barcodes from database`);
    } catch (error) {
      console.error("Error loading existing barcodes:", error);
      toast.error("Failed to load existing barcodes");
    }
  };

  // Removed duplicate check - same products should have same barcode

  // Auto-generate prefix based on product attributes
  const generateAutoPrefix = (): string => {
    if (!autoGeneratePrefix) return prefix;
    
    const parts: string[] = [];
    
    // Color prefix (first 3 letters)
    if (color.trim()) {
      parts.push(color.trim().substring(0, 3).toUpperCase());
    }
    
    // Size prefix
    if (size.trim()) {
      parts.push(size.trim().substring(0, 2).toUpperCase());
    }
    
    // Variant prefix
    if (variant.trim()) {
      parts.push(variant.trim().substring(0, 3).toUpperCase());
    }
    
    // If no attributes provided, use the manual prefix
    if (parts.length === 0) {
      return prefix;
    }
    
    // Join with hyphens and add base prefix
    return `${prefix}-${parts.join('-')}`;
  };

  const generateRandomCode = (): string => {
    const finalPrefix = generateAutoPrefix();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${finalPrefix}${timestamp}${random}`;
  };

  const generateQRCode = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    } catch (error) {
      console.error("QR code generation error:", error);
      return "";
    }
  };

  const handleGenerate = async () => {
    const trimmedName = productName.trim();
    const finalPrefix = generateAutoPrefix();
    const nameWithPrefixMap = (window as any).__productNamePrefixBarcodeMap as Map<string, string> || new Map();
    
    // Create a unique key based on prefix + product name
    const productKey = `${finalPrefix}_${trimmedName.toLowerCase()}`;
    
    // Check if this specific product variant (with this prefix) already has a barcode
    const existingBarcode = nameWithPrefixMap.get(productKey);

    const newBarcodes: BarcodeItem[] = [];
    const generatedCodes = new Set<string>();
    
    // All items in the same batch share the same barcode
    let sharedCode: string | null = existingBarcode || null;
    
    for (let i = 0; i < batchQuantity; i++) {
      let code: string;
      
      if (sharedCode) {
        // Use the shared barcode for all identical product variants
        code = sharedCode;
      } else if (i === 0 && customCode.trim()) {
        // First item with custom code
        code = customCode.trim().toUpperCase();
        sharedCode = code;
      } else if (i === 0) {
        // Generate new code with auto-prefix
        code = generateRandomCode();
        sharedCode = code;
      } else {
        // All subsequent items use the shared code
        code = sharedCode!;
      }
      
      generatedCodes.add(code);
      const qrCodeUrl = await generateQRCode(code);
      
      // Build descriptive product name with attributes
      const attributeParts: string[] = [];
      if (color.trim()) attributeParts.push(color.trim());
      if (size.trim()) attributeParts.push(size.trim());
      if (variant.trim()) attributeParts.push(variant.trim());
      
      const fullProductName = attributeParts.length > 0
        ? `${trimmedName} (${attributeParts.join(', ')})`
        : trimmedName;
      
      const productNameWithNumber = batchQuantity > 1 
        ? `${fullProductName || "Unnamed Product"} #${i + 1}`
        : fullProductName || "Unnamed Product";

      newBarcodes.push({
        id: `${Date.now()}-${i}`,
        code,
        productName: productNameWithNumber,
        qrCodeUrl,
      });
      
      // Small delay to ensure unique timestamps
      if (i < batchQuantity - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    setBarcodes([...barcodes, ...newBarcodes]);
    
    // Store the mapping for this session with prefix included
    if (sharedCode && trimmedName) {
      nameWithPrefixMap.set(productKey, sharedCode);
      (window as any).__productNamePrefixBarcodeMap = nameWithPrefixMap;
    }
    
    setCustomCode("");
    setProductName("");
    setColor("");
    setSize("");
    setVariant("");
    setBatchQuantity(1);
    
    if (existingBarcode) {
      toast.success(`${newBarcodes.length} label(s) added using existing barcode for this variant`);
    } else {
      toast.success(`${newBarcodes.length} barcode(s) added to print queue`);
    }
  };

  const handleDelete = (id: string) => {
    setBarcodes(barcodes.filter(b => b.id !== id));
    toast.success("Barcode removed");
  };

  const handlePrint = () => {
    if (barcodes.length === 0) {
      toast.error("No barcodes to print");
      return;
    }
    console.log("Printing barcodes:", barcodes);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleClearAll = () => {
    setBarcodes([]);
    toast.success("All barcodes cleared");
  };

  return (
    <div className="min-h-screen bg-background pt-32 lg:pt-20">
      {/* Screen View */}
      <div className="print:hidden container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Barcode className="h-8 w-8" />
              Barcode Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate custom barcodes and print labels with cut-out guides
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Generator Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Barcode</CardTitle>
              <CardDescription>
                Generate custom barcodes for your products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Envelope Pack, Premium Perfume"
                />
              </div>

              <div className="space-y-2">
                <Label>Barcode Prefix</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="PROD"
                  maxLength={6}
                  disabled={autoGeneratePrefix && !!(color.trim() || size.trim() || variant.trim())}
                />
                <p className="text-xs text-muted-foreground">
                  Base prefix for all barcodes
                </p>
              </div>

              {/* Product Attributes Section */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Product Attributes (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-prefix" className="text-xs text-muted-foreground cursor-pointer">
                      Auto-generate prefix
                    </Label>
                    <Switch
                      id="auto-prefix"
                      checked={autoGeneratePrefix}
                      onCheckedChange={setAutoGeneratePrefix}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fill in attributes to auto-generate prefix (e.g., RED-L-V1 for Red Large V1)
                </p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Red"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Size</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="L"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Variant</Label>
                    <Input
                      value={variant}
                      onChange={(e) => setVariant(e.target.value)}
                      placeholder="V1"
                      className="h-8"
                    />
                  </div>
                </div>
                
                {autoGeneratePrefix && (color.trim() || size.trim() || variant.trim()) && (
                  <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Generated prefix: <span className="font-mono font-semibold">{generateAutoPrefix()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Custom Barcode (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="Leave empty to auto-generate"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomCode(generateRandomCode())}
                    title="Generate Random"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Same products with the same prefix and attributes will share the same barcode
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quantity (for product families)</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Generate multiple barcodes for the same product family (e.g., 10 bottles of perfume)
                </p>
              </div>

              <Button onClick={handleGenerate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add {batchQuantity > 1 ? `${batchQuantity} Labels` : 'to Print Queue'}
              </Button>
            </CardContent>
          </Card>

          {/* Print Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Print Queue ({barcodes.length})</CardTitle>
              <CardDescription>
                Review and manage barcodes before printing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {barcodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No barcodes in queue. Add some to get started.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {barcodes.map((barcode) => (
                    <div
                      key={barcode.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{barcode.productName}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {barcode.code}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(barcode.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {barcodes.length > 0 && (
                <div className="flex gap-2 mt-4">
                  <Button onClick={handlePrint} className="flex-1">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Labels
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Use consistent prefixes to organize products by category</li>
              <li>Keep barcodes short and memorable for manual entry</li>
              <li>Avoid special characters for better scanner compatibility</li>
              <li>Print on adhesive label sheets for easy application</li>
              <li>Test scan one label before printing large batches</li>
              <li><strong>Barcode Reuse:</strong> Identical products automatically share the same barcode</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Print View - A4 Label Sheet Format (21 labels: 3x7 grid) */}
      <div 
        id="printable-area"
        style={{ 
          display: 'none',
          backgroundColor: 'white',
          width: '210mm',
          minHeight: '297mm',
        }}
      >
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            
            body * {
              visibility: hidden;
            }
            
            #printable-area,
            #printable-area * {
              visibility: visible;
            }
            
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              display: block !important;
              width: 210mm;
              min-height: 297mm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}</style>
        
        <div style={{
          width: '210mm',
          minHeight: '297mm',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 70mm)',
          gridTemplateRows: 'repeat(7, 42.3mm)',
          gap: '0',
          padding: '12.7mm 4.7mm',
          margin: '0',
          boxSizing: 'border-box',
          backgroundColor: 'white',
        }}>
          {barcodes.map((barcode) => (
            <div
              key={barcode.id}
              style={{
                width: '70mm',
                height: '42.3mm',
                pageBreakInside: 'avoid',
                border: '0.5pt dashed #999',
                position: 'relative',
                backgroundColor: 'white',
                color: 'black',
                boxSizing: 'border-box',
              }}
            >
              {/* Cut-out corner marks */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '3mm',
                height: '3mm',
                borderLeft: '1pt solid #666',
                borderTop: '1pt solid #666',
              }} />
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: '3mm',
                height: '3mm',
                borderRight: '1pt solid #666',
                borderTop: '1pt solid #666',
              }} />
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '3mm',
                height: '3mm',
                borderLeft: '1pt solid #666',
                borderBottom: '1pt solid #666',
              }} />
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '3mm',
                height: '3mm',
                borderRight: '1pt solid #666',
                borderBottom: '1pt solid #666',
              }} />

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '4mm',
                gap: '2mm',
              }}>
                <div style={{
                  fontSize: '9pt',
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  maxHeight: '12mm',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {barcode.productName}
                </div>
                <div style={{
                  fontSize: '18pt',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                }}>
                  {barcode.code}
                </div>
                
                {/* QR Code */}
                {barcode.qrCodeUrl && (
                  <img 
                    src={barcode.qrCodeUrl} 
                    alt="QR Code"
                    style={{
                      width: '15mm',
                      height: '15mm',
                      margin: '0 auto',
                    }}
                  />
                )}
                
                <div style={{
                  fontSize: '6pt',
                  color: '#666',
                  textAlign: 'center',
                }}>
                  Scan code above
                </div>
              </div>
            </div>
          ))}
          {/* Fill empty cells to maintain grid structure */}
          {Array.from({ length: Math.max(0, 21 - barcodes.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              style={{
                width: '70mm',
                height: '42.3mm',
                border: '0.5pt dashed #ccc',
                backgroundColor: '#fafafa',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
