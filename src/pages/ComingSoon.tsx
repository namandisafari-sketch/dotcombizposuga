import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ComingSoon = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Clock className="w-24 h-24 text-primary animate-pulse" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-foreground">
          Coming Soon
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
          We're working hard to bring you an amazing experience.
          Stay tuned!
        </p>
        
        <div className="mt-8 p-6 bg-card border border-border rounded-lg max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            DOTCOM BROTHERS LTD
          </h2>
          <p className="text-muted-foreground mb-4">
            Your trusted partner for Mobile Money, Print Services, Perfumes, and more.
          </p>
          <Button 
            onClick={() => navigate('/auth')} 
            className="w-full"
            size="lg"
          >
            Access Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
