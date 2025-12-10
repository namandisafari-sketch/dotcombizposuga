import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  tracking_type?: string;
}

interface QuickAddPanelProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  title?: string;
}

export function QuickAddPanel({
  products,
  onAddToCart,
  title = "Quick Add",
}: QuickAddPanelProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {products.slice(0, 8).map((product) => (
            <Button
              key={product.id}
              variant="outline"
              className="h-auto py-2 px-3 flex flex-col items-start gap-1"
              onClick={() => onAddToCart(product)}
            >
              <span className="text-xs font-medium truncate w-full text-left">
                {product.name}
              </span>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  {Number(product.price).toLocaleString()}
                </span>
                {product.stock !== undefined && (
                  <Badge
                    variant={product.stock > 0 ? "secondary" : "destructive"}
                    className="text-[10px] px-1"
                  >
                    {product.stock}
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
