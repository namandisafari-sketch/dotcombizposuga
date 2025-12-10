import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Search, ShoppingBag, Heart, Sparkles, AlertCircle, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const translations = {
  en: {
    title: "My Scent History",
    subtitle: "Find your previous perfume mixtures",
    department: "Department",
    welcomeTitle: "Welcome to Your Scent Memory",
    welcomeDescription: "We've saved your custom perfume mixtures! Use this page to find your favorite scents from previous visits.",
    step1Title: "Enter Your Details",
    step1Description: "Type your name, phone number, or receipt number in the search box below",
    step2Title: "View Your Scent History",
    step2Description: "See your last perfume mixture, previous purchases, and saved preferences",
    step3Title: "Reorder with Ease",
    step3Description: "Show your scent mixture to our staff to get the exact same fragrance again",
    tip: "💡 Tip: Save this page or QR code for quick access to your scent history anytime!",
    invalidQr: "Invalid QR code. Please scan a valid department QR code to access scent history.",
    findScents: "Find Your Scents",
    searchDescription: "Enter your name, phone number, or receipt number to see your scent history",
    yourName: "Your Name",
    namePlaceholder: "Enter your name...",
    phoneNumber: "Phone Number",
    phonePlaceholder: "Enter your phone number...",
    receiptNumber: "Receipt Number (Optional)",
    receiptPlaceholder: "Enter receipt number...",
    findMyScents: "Find My Scents",
    searching: "Searching...",
    lastPurchase: "Your Last Purchase",
    product: "Product",
    scentMixture: "Your Scent Mixture",
    quantity: "Quantity",
    noPurchases: "No previous perfume purchases found",
    previousPurchases: "Your Previous Purchases",
    earlierPurchases: "earlier purchase(s)",
    yourPreferences: "Your Preferences",
    preferredBottleSizes: "Preferred Bottle Sizes",
    notes: "Notes",
    errorEnterDetails: "Please enter your name, phone number, or receipt number",
    errorInvalidQr: "Invalid QR code. Please scan a valid department QR code.",
    errorNotFound: "No customer found in this department. Please check your details.",
    successFound: "Found your scent history!",
    infoNoPurchases: "No previous perfume purchases found",
    errorFailed: "Failed to get scent history"
  },
  sw: {
    title: "Historia Yangu ya Harufu",
    subtitle: "Tafuta mchanganyiko wako wa zamani wa manukato",
    department: "Idara",
    welcomeTitle: "Karibu kwenye Kumbukumbu ya Harufu Yako",
    welcomeDescription: "Tumehifadhi mchanganyiko wako maalum wa manukato! Tumia ukurasa huu kupata harufu zako unazozipenda kutoka ziara za awali.",
    step1Title: "Weka Maelezo Yako",
    step1Description: "Andika jina lako, nambari ya simu, au nambari ya risiti kwenye kisanduku cha utafutaji hapa chini",
    step2Title: "Tazama Historia ya Harufu Yako",
    step2Description: "Ona mchanganyiko wako wa manukato wa mwisho, ununuzi wa awali, na mapendeleo yaliyohifadhiwa",
    step3Title: "Agiza Tena kwa Urahisi",
    step3Description: "Onyesha mchanganyiko wako wa harufu kwa wafanyakazi wetu kupata harufu sawa kabisa tena",
    tip: "💡 Kidokezo: Hifadhi ukurasa huu au msimbo wa QR kwa ufikiaji wa haraka wa historia ya harufu yako wakati wowote!",
    invalidQr: "Msimbo wa QR si sahihi. Tafadhali scan msimbo sahihi wa QR wa idara ili kufikia historia ya harufu.",
    findScents: "Tafuta Harufu Zako",
    searchDescription: "Weka jina lako, nambari ya simu, au nambari ya risiti kuona historia ya harufu yako",
    yourName: "Jina Lako",
    namePlaceholder: "Weka jina lako...",
    phoneNumber: "Nambari ya Simu",
    phonePlaceholder: "Weka nambari yako ya simu...",
    receiptNumber: "Nambari ya Risiti (Si Lazima)",
    receiptPlaceholder: "Weka nambari ya risiti...",
    findMyScents: "Tafuta Harufu Zangu",
    searching: "Inatafuta...",
    lastPurchase: "Ununuzi Wako wa Mwisho",
    product: "Bidhaa",
    scentMixture: "Mchanganyiko Wako wa Harufu",
    quantity: "Kiasi",
    noPurchases: "Hakuna ununuzi wa zamani wa manukato unapatikana",
    previousPurchases: "Ununuzi Wako wa Awali",
    earlierPurchases: "ununuzi wa awali",
    yourPreferences: "Mapendeleo Yako",
    preferredBottleSizes: "Ukubwa wa Chupa Unaopendelewa",
    notes: "Maelezo",
    errorEnterDetails: "Tafadhali weka jina lako, nambari ya simu, au nambari ya risiti",
    errorInvalidQr: "Msimbo wa QR si sahihi. Tafadhali scan msimbo sahihi wa QR wa idara.",
    errorNotFound: "Hakuna mteja aliyepatikana katika idara hii. Tafadhali angalia maelezo yako.",
    successFound: "Historia ya harufu yako imepatikana!",
    infoNoPurchases: "Hakuna ununuzi wa zamani wa manukato unapatikana",
    errorFailed: "Imeshindwa kupata historia ya harufu"
  },
  fr: {
    title: "Mon Historique de Parfums",
    subtitle: "Retrouvez vos mélanges de parfums précédents",
    department: "Département",
    welcomeTitle: "Bienvenue dans Votre Mémoire Olfactive",
    welcomeDescription: "Nous avons sauvegardé vos mélanges de parfums personnalisés! Utilisez cette page pour retrouver vos senteurs préférées de visites précédentes.",
    step1Title: "Entrez Vos Informations",
    step1Description: "Tapez votre nom, numéro de téléphone ou numéro de reçu dans la zone de recherche ci-dessous",
    step2Title: "Consultez Votre Historique",
    step2Description: "Voyez votre dernier mélange de parfum, achats précédents et préférences sauvegardées",
    step3Title: "Recommandez Facilement",
    step3Description: "Montrez votre mélange de parfum à notre personnel pour obtenir exactement la même fragrance",
    tip: "💡 Astuce: Enregistrez cette page ou le code QR pour un accès rapide à votre historique de parfums!",
    invalidQr: "Code QR invalide. Veuillez scanner un code QR de département valide pour accéder à l'historique.",
    findScents: "Trouvez Vos Parfums",
    searchDescription: "Entrez votre nom, numéro de téléphone ou numéro de reçu pour voir votre historique",
    yourName: "Votre Nom",
    namePlaceholder: "Entrez votre nom...",
    phoneNumber: "Numéro de Téléphone",
    phonePlaceholder: "Entrez votre numéro...",
    receiptNumber: "Numéro de Reçu (Optionnel)",
    receiptPlaceholder: "Entrez le numéro de reçu...",
    findMyScents: "Trouver Mes Parfums",
    searching: "Recherche...",
    lastPurchase: "Votre Dernier Achat",
    product: "Produit",
    scentMixture: "Votre Mélange de Parfum",
    quantity: "Quantité",
    noPurchases: "Aucun achat de parfum précédent trouvé",
    previousPurchases: "Vos Achats Précédents",
    earlierPurchases: "achat(s) antérieur(s)",
    yourPreferences: "Vos Préférences",
    preferredBottleSizes: "Tailles de Flacons Préférées",
    notes: "Notes",
    errorEnterDetails: "Veuillez entrer votre nom, numéro de téléphone ou numéro de reçu",
    errorInvalidQr: "Code QR invalide. Veuillez scanner un code QR de département valide.",
    errorNotFound: "Aucun client trouvé dans ce département. Veuillez vérifier vos informations.",
    successFound: "Historique de parfums trouvé!",
    infoNoPurchases: "Aucun achat de parfum précédent trouvé",
    errorFailed: "Échec de la récupération de l'historique"
  }
};

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  department_id: string | null;
}

const CustomerScentCheckIn = () => {
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get("dept");
  const urlReceipt = searchParams.get("receipt");
  const urlName = searchParams.get("name");
  const urlPhone = searchParams.get("phone");
  const urlCustomerId = searchParams.get("customerId");
  
  const [searchName, setSearchName] = useState(urlName || "");
  const [searchPhone, setSearchPhone] = useState(urlPhone || "");
  const [searchReceipt, setSearchReceipt] = useState(urlReceipt || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "sw" | "fr">("en");
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  const t = translations[language];

  const searchScentHistory = useCallback(async (skipValidation = false) => {
    if (!skipValidation && !searchName.trim() && !searchPhone.trim() && !searchReceipt.trim()) {
      toast.error(t.errorEnterDetails);
      return;
    }

    if (!departmentId) {
      toast.error(t.errorInvalidQr);
      return;
    }

    try {
      setLoading(true);

      // Call edge function with search parameters
      const { data: result, error } = await supabase.functions.invoke(
        "perfume-scent-assistant",
        {
          body: { 
            departmentId,
            customerId: urlCustomerId || undefined,
            searchName: searchName.trim() || undefined,
            searchPhone: searchPhone.trim() || undefined,
            searchReceipt: searchReceipt.trim() || undefined,
          },
        }
      );

      if (error) throw error;

      // Check for error response from edge function
      if (result.error) {
        toast.error(result.error);
        setData(null);
        setCustomerInfo(null);
        if (result.departmentName) {
          setDepartmentName(result.departmentName);
        }
        return;
      }

      // Set results
      setData(result);
      setCustomerInfo(result.customerInfo);
      if (result.departmentName) {
        setDepartmentName(result.departmentName);
      }

      if (result.lastPurchase) {
        toast.success(t.successFound);
      } else {
        toast.info(t.infoNoPurchases);
      }
    } catch (error: any) {
      console.error("Error fetching scent history:", error);
      toast.error(error.message || t.errorFailed);
    } finally {
      setLoading(false);
    }
  }, [departmentId, searchName, searchPhone, searchReceipt, urlCustomerId, t]);

  // Auto-search on load if URL parameters are present
  useEffect(() => {
    if (!autoSearchDone && departmentId && (urlReceipt || urlName || urlPhone || urlCustomerId)) {
      setAutoSearchDone(true);
      searchScentHistory(true);
    }
  }, [departmentId, urlReceipt, urlName, urlPhone, urlCustomerId, autoSearchDone, searchScentHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">{t.title}</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {t.subtitle}
          </p>
          {departmentName && (
            <p className="text-sm text-muted-foreground">
              {t.department}: <span className="font-semibold text-primary">{departmentName}</span>
            </p>
          )}
          
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Select value={language} onValueChange={(value: "en" | "sw" | "fr") => setLanguage(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sw">Kiswahili</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Welcome Instructions */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              {t.welcomeTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t.welcomeDescription}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t.step1Title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.step1Description}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t.step2Title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.step2Description}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t.step3Title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t.step3Description}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground italic">
                {t.tip}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Department Warning */}
        {!departmentId && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t.invalidQr}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t.findScents}
            </CardTitle>
            <CardDescription>
              {t.searchDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">{t.yourName}</Label>
                <Input
                  id="name"
                  placeholder={t.namePlaceholder}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchScentHistory()}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t.phoneNumber}</Label>
                <Input
                  id="phone"
                  placeholder={t.phonePlaceholder}
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchScentHistory()}
                />
              </div>
              <div>
                <Label htmlFor="receipt">{t.receiptNumber}</Label>
                <Input
                  id="receipt"
                  placeholder={t.receiptPlaceholder}
                  value={searchReceipt}
                  onChange={(e) => setSearchReceipt(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchScentHistory()}
                />
              </div>
            </div>
            <Button
              onClick={() => searchScentHistory()}
              disabled={loading || !departmentId}
              size="lg"
              className="w-full"
            >
              {loading ? (
                t.searching
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  {t.findMyScents}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Display */}
        {data && customerInfo && (
          <>
            {/* Customer Info */}
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold">{customerInfo.name}</h3>
                  {customerInfo.phone && (
                    <p className="text-muted-foreground">{customerInfo.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Last Purchase */}
            {data.lastPurchase ? (
              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-primary" />
                    {t.lastPurchase}
                  </CardTitle>
                  <CardDescription>
                    {new Date(data.lastPurchase.sales.created_at).toLocaleDateString()} - {t.receiptNumber.replace(' (Optional)', '')}: {data.lastPurchase.sales.receipt_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {t.product}:
                    </div>
                    <div className="text-xl font-semibold">
                      {data.lastPurchase.item_name}
                    </div>
                  </div>
                  {data.lastPurchase.scent_mixture && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        {t.scentMixture}:
                      </div>
                      <div className="text-lg bg-background p-4 rounded-lg border-2 border-primary/30 font-medium">
                        {data.lastPurchase.scent_mixture}
                      </div>
                    </div>
                  )}
                  {data.lastPurchase.quantity && (
                    <div className="text-sm text-muted-foreground">
                      {t.quantity}: {data.lastPurchase.quantity}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-2">
                    <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground text-lg">
                      {t.noPurchases}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Previous Purchases */}
            {data.allPurchases && data.allPurchases.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    {t.previousPurchases}
                  </CardTitle>
                  <CardDescription>
                    {data.allPurchases.length - 1} {t.earlierPurchases}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.allPurchases.slice(1).map((purchase: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-muted/30 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Droplet className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{purchase.item_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(purchase.sales.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {purchase.scent_mixture && (
                        <div className="pl-6">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {t.scentMixture}:
                          </div>
                          <div className="text-sm bg-background p-3 rounded border">
                            {purchase.scent_mixture}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Saved Preferences */}
            {data.preferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    {t.yourPreferences}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.preferences.preferred_bottle_sizes &&
                    data.preferences.preferred_bottle_sizes.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">
                          {t.preferredBottleSizes}:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {data.preferences.preferred_bottle_sizes.map(
                            (size: number, index: number) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                              >
                                {size}ml
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  {data.preferences.notes && (
                    <div>
                      <div className="text-sm font-medium mb-2">{t.notes}:</div>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                        {data.preferences.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerScentCheckIn;
