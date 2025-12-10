import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface CartTab {
  id: string;
  name: string;
  itemCount: number;
}

interface CartTabsProps {
  tabs: CartTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
}

export function CartTabs({
  tabs,
  activeTabId,
  onTabChange,
  onNewTab,
  onCloseTab,
}: CartTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
            activeTabId === tab.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {tab.name}
            {tab.itemCount > 0 && (
              <span className="ml-1 text-xs">({tab.itemCount})</span>
            )}
          </span>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="ml-1 p-0.5 rounded hover:bg-background/20"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onNewTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
