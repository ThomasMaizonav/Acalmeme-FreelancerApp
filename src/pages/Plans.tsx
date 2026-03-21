import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft, Crown, Shield, Sparkles, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoAcalmeme from "@/assets/logo-acalmeme.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/i18n/language";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { text, isEnglish } = useLanguage();

  const handleSubscribe = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const priceId = import.meta.env.VITE_STRIPE_PRICE_ID;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!priceId) {
        toast({
          title: text({ pt: "Erro de configuração", en: "Configuration error" }),
          description: text({ pt: "VITE_STRIPE_PRICE_ID não definido.", en: "VITE_STRIPE_PRICE_ID is not defined." }),
          variant: "destructive",
        });
        return;
      }

      if (!supabaseKey) {
        toast({
          title: text({ pt: "Erro de configuração", en: "Configuration error" }),
          description: text({
            pt: "VITE_SUPABASE_PUBLISHABLE_KEY não definido.",
            en: "VITE_SUPABASE_PUBLISHABLE_KEY is not defined.",
          }),
          variant: "destructive",
        });
        return;
      }

      const endpoint =
        "https://zdegrjywuybymohxtfxy.supabase.co/functions/v1/create-checkout-session";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/plans`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Checkout error:", data);
        toast({
          title: text({ pt: "Erro", en: "Error" }),
          description: data?.error || text({ pt: "Erro ao criar sessão do checkout.", en: "Failed to create checkout session." }),
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast({
        title: text({ pt: "Erro", en: "Error" }),
        description: text({
          pt: "Checkout não retornou URL. Verifique a configuração do Stripe.",
          en: "Checkout did not return a URL. Check your Stripe configuration.",
        }),
        variant: "destructive",
      });
    } catch (error) {
      console.error("Checkout exception:", error);
      toast({
        title: text({ pt: "Erro", en: "Error" }),
        description: text({
          pt: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
          en: "Could not start the payment process. Please try again.",
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {text({ pt: "Voltar", en: "Back" })}
          </Button>
          <ThemeToggle />
        </div>

        <div className="text-center mb-10 sm:mb-14">
          <img src={logoAcalmeme} alt="Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {text({ pt: "Você está a um passo de", en: "You are one step away from" })}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {text({ pt: " facilitar sua vida", en: " making life easier" })}
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {text({
              pt: "Escolha o plano ideal para nunca mais esquecer seus medicamentos",
              en: "Choose the ideal plan to never forget your medication again",
            })}
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6 sm:gap-8">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{text({ pt: "Gratuito", en: "Free" })}</CardTitle>
              <CardDescription>{text({ pt: "Experimente por 30 dias", en: "Try it for 30 days" })}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">{isEnglish ? "/month" : "/mês"}</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">
                {text({ pt: "30 dias grátis, sem cartão de crédito", en: "30 free days, no credit card required" })}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Até 3 lembretes de medicação", en: "Up to 3 medication reminders" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Notificações no navegador", en: "Browser notifications" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Diário emocional (3 entradas/semana)", en: "Emotional journal (3 entries/week)" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Sessão de calma básica", en: "Basic calm session" })}</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                {text({ pt: "Começar Grátis", en: "Start Free" })}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-hero text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {text({ pt: "Mais Popular", en: "Most Popular" })}
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-secondary" />
                Premium
              </CardTitle>
              <CardDescription>{text({ pt: "Acesso completo a tudo", en: "Full access to everything" })}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 9,90</span>
                <span className="text-muted-foreground">{isEnglish ? "/month" : "/mês"}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Lembretes ilimitados de medicação", en: "Unlimited medication reminders" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Notificações por e-mail + navegador", en: "Email + browser notifications" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Diário emocional ilimitado", en: "Unlimited emotional journal" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Sessões de calma com música relaxante", en: "Calm sessions with relaxing music" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Modo Crise ilimitado 24/7", en: "Unlimited Crisis Mode 24/7" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Sistema de recompensas e progresso", en: "Rewards and progress system" })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{text({ pt: "Suporte prioritário", en: "Priority support" })}</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-hero text-white hover:opacity-90 text-base py-6"
                onClick={handleSubscribe}
                disabled={isSubmitting}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {isSubmitting
                  ? text({ pt: "Carregando...", en: "Loading..." })
                  : text({ pt: "Assinar Agora", en: "Subscribe Now" })}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                {text({ pt: "Cancele a qualquer momento. Sem multas.", en: "Cancel anytime. No fees." })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>{text({ pt: "Pagamento seguro", en: "Secure payment" })}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>{text({ pt: "Processado por Stripe", en: "Processed by Stripe" })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>{text({ pt: "Cancele quando quiser", en: "Cancel whenever you want" })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
