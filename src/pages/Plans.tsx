import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft, Crown, Shield, Sparkles, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoAcalmeme from "@/assets/logo-acalmeme.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          title: "Erro de configuração",
          description: "VITE_STRIPE_PRICE_ID não definido.",
          variant: "destructive",
        });
        return;
      }

      if (!supabaseKey) {
        toast({
          title: "Erro de configuração",
          description: "VITE_SUPABASE_PUBLISHABLE_KEY não definido.",
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
          title: "Erro",
          description: data?.error || "Erro ao criar sessão do checkout.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast({
        title: "Erro",
        description: "Checkout não retornou URL. Verifique a configuração do Stripe.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Checkout exception:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
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
            Voltar
          </Button>
          <ThemeToggle />
        </div>

        <div className="text-center mb-10 sm:mb-14">
          <img src={logoAcalmeme} alt="Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Você está a um passo de
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> facilitar sua vida</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para nunca mais esquecer seus medicamentos
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6 sm:gap-8">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Gratuito</CardTitle>
              <CardDescription>Experimente por 30 dias</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">
                30 dias grátis, sem cartão de crédito
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Até 3 lembretes de medicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Notificações no navegador</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Diário emocional (3 entradas/semana)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sessão de calma básica</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Começar Grátis
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-hero text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Mais Popular
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-secondary" />
                Premium
              </CardTitle>
              <CardDescription>Acesso completo a tudo</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 9,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Lembretes ilimitados</strong> de medicação</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Notificações por e-mail</strong> + navegador</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Diário emocional <strong>ilimitado</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sessões de calma com <strong>música relaxante</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Modo Crise <strong>ilimitado</strong> 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sistema de recompensas e progresso</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-hero text-white hover:opacity-90 text-base py-6"
                onClick={handleSubscribe}
                disabled={isSubmitting}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {isSubmitting ? "Carregando..." : "Assinar Agora"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Cancele a qualquer momento. Sem multas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>Processado por Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
