import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, ShoppingCart, AlertTriangle, CheckCircle2 } from "lucide-react";

const BundleGuide = () => {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Bundle Management Guide</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Learn how to manage product bundles and sell individual items
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                What are Product Bundles?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Product bundles allow you to group multiple individual products together and
                sell them as a single unit. For example:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-green-500" />
                  <span>
                    <strong>Envelope Bundle (50 pcs)</strong> - Contains 50 individual envelopes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-green-500" />
                  <span>
                    <strong>Pen Pack (12 pcs)</strong> - Contains 12 individual pens
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-green-500" />
                  <span>
                    <strong>Gift Box</strong> - Contains multiple different products
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                How to Create a Bundle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="font-medium">Step 1: Create Component Products</div>
                  <p className="text-sm text-muted-foreground">
                    First, create the individual products that will be part of the bundle:
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Go to Inventory → Add Product</li>
                    <li>Create "Envelope (Single)" with stock quantity</li>
                    <li>Set price and other details</li>
                  </ul>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="font-medium">Step 2: Create the Bundle Product</div>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Go to Inventory → Add Product</li>
                    <li>Check "This is a bundle product"</li>
                    <li>Name it "Envelope Bundle (50 pcs)"</li>
                    <li>Set the bundle price</li>
                  </ul>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="font-medium">Step 3: Add Components to Bundle</div>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>After creating, click "Manage Bundle" on the bundle product</li>
                    <li>Select "Envelope (Single)" and set quantity to 50</li>
                    <li>The bundle stock will auto-calculate based on component stock</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selling Individual Items from a Bundle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
                  <div>
                    <strong>Important:</strong> To sell individual items from a bundle, you
                    must create them as separate products in your inventory.
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Badge className="mb-2">Example Scenario</Badge>
                  <p className="text-sm mb-3">
                    You have "Envelope Bundle (50 pcs)" but want to sell 1 envelope at a time:
                  </p>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                  <div className="font-medium text-sm">✓ Recommended Setup:</div>
                  <div className="grid gap-3">
                    <div className="bg-background p-3 rounded border">
                      <div className="font-medium text-sm mb-1">
                        Product 1: Envelope (Single)
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Price: 500 UGX</li>
                        <li>Stock: 1000 pieces</li>
                        <li>Used as component in bundle</li>
                      </ul>
                    </div>
                    <div className="bg-background p-3 rounded border">
                      <div className="font-medium text-sm mb-1">
                        Product 2: Envelope Bundle (50 pcs)
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Price: 20,000 UGX (bulk discount)</li>
                        <li>Stock: Auto-calculated (1000 ÷ 50 = 20 bundles)</li>
                        <li>Contains 50× "Envelope (Single)"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="font-medium text-sm mb-2">When Selling:</div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-primary">→</span>
                      <span>
                        Add "Envelope (Single)" to cart for individual sales (500 UGX)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-primary">→</span>
                      <span>
                        Add "Envelope Bundle" to cart for bulk sales (20,000 UGX)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-primary">→</span>
                      <span>
                        Stock automatically updates for both when you sell either one
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Management Logic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-3">
                <div className="font-medium">Automatic Stock Calculation</div>
                <p className="text-sm text-muted-foreground">
                  Bundle stock is automatically calculated based on component availability:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded">
                      Bundle Stock = Min(Component Stock ÷ Required Quantity)
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Example: If you have 1000 envelopes and need 50 per bundle, you can
                    make 20 bundles (1000 ÷ 50)
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> When you sell a bundle, the component stock
                  decreases automatically. When you sell individual components, the bundle
                  stock also updates accordingly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Use Clear Naming</div>
                    <p className="text-sm text-muted-foreground">
                      Name bundles clearly with quantity (e.g., "Envelope Bundle (50 pcs)")
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Track Individual Items</div>
                    <p className="text-sm text-muted-foreground">
                      Always create component products separately for flexible selling
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Set Competitive Pricing</div>
                    <p className="text-sm text-muted-foreground">
                      Offer bundle discounts to encourage bulk purchases
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Monitor Stock Levels</div>
                    <p className="text-sm text-muted-foreground">
                      Keep track of component stock to ensure bundles remain available
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BundleGuide;
