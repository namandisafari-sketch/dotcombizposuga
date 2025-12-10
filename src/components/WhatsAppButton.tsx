import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const WhatsAppButton = () => {
  const location = useLocation();
  
  // Hide on auth page
  if (location.pathname === "/auth") {
    return null;
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = "256745368426";
    const message = encodeURIComponent("Hi, I need help with the system.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all print:hidden"
      size="icon"
      title="Talk to the Developer"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
};

export default WhatsAppButton;
