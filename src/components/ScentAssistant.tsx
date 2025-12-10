import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, X } from "lucide-react";

interface ScentAssistantProps {
  onScentRecommendation?: (scents: string[]) => void;
}

export function ScentAssistant({ onScentRecommendation }: ScentAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const popularCombinations = [
    { name: "Fresh & Clean", scents: ["AQUA", "CITRUS", "MUSK"] },
    { name: "Romantic Evening", scents: ["ROSE", "VANILLA", "AMBER"] },
    { name: "Bold & Confident", scents: ["OUD", "SANDALWOOD", "LEATHER"] },
    { name: "Light & Airy", scents: ["JASMINE", "WHITE TEA", "BERGAMOT"] },
  ];

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Scent Assistant
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Scent Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Popular scent combinations:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {popularCombinations.map((combo) => (
            <Button
              key={combo.name}
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-start"
              onClick={() => onScentRecommendation?.(combo.scents)}
            >
              <span className="font-medium text-xs">{combo.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {combo.scents.join(", ")}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
