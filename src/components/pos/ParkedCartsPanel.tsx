import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ParkedCart {
  id: string;
  name: string;
  items: any[];
  customerName: string;
  parkedAt: Date;
  reason?: string;
}

interface ParkedCartsPanelProps {
  parkedCarts: ParkedCart[];
  onResume: (cartId: string) => void;
  onDelete: (cartId: string) => void;
}

export function ParkedCartsPanel({
  parkedCarts,
  onResume,
  onDelete,
}: ParkedCartsPanelProps) {
  if (parkedCarts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Parked Carts ({parkedCarts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-2">
          {parkedCarts.map((cart) => (
            <div
              key={cart.id}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {cart.customerName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {cart.items.length} items
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(cart.parkedAt), {
                    addSuffix: true,
                  })}
                  {cart.reason && ` • ${cart.reason}`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onResume(cart.id)}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onDelete(cart.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
