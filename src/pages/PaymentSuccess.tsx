import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Heart, CheckCircle, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/i18n/language";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium, subscriptionStatus, refreshSubscription } = useSubscription();
  const [polling, setPolling] = useState(true);
  const { text } = useLanguage();

  // Poll subscription status (handles boleto delays as well)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSubscription();
    }, 3000);

    const timeout = setTimeout(() => {
      setPolling(false);
      clearInterval(interval);
    }, 120000); // stop after 2 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refreshSubscription]);

  // When premium is detected, go straight to Crisis
  useEffect(() => {
    if (isPremium) {
      navigate("/crisis");
    }
  }, [isPremium, navigate]);

  void searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 glass text-center">
        <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6 shadow-calm animate-pulse">
          <Crown className="w-12 h-12 text-white" />
        </div>

        <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
        
        <h1 className="text-4xl font-bold mb-4">{text({ pt: "Bem-vindo ao Premium! 🎉", en: "Welcome to Premium! 🎉" })}</h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          {text({
            pt: "Estamos confirmando seu pagamento. Para cartão, isso é imediato. Para boleto, pode levar até 3 dias úteis.",
            en: "We are confirming your payment. For cards, this is immediate. For bank slip payments, it may take up to 3 business days.",
          })}
        </p>

        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-secondary" />
            {text({ pt: "Recursos Desbloqueados", en: "Unlocked Features" })}
          </h3>
          <ul className="space-y-3 text-left max-w-md mx-auto">
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>{text({ pt: "Modo Crise ilimitado 24/7", en: "Unlimited Crisis Mode 24/7" })}</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>{text({ pt: "Diário emocional ilimitado", en: "Unlimited emotional journal" })}</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>{text({ pt: "Lembretes personalizados", en: "Custom reminders" })}</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>{text({ pt: "Estatísticas e progresso detalhado", en: "Detailed stats and progress" })}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          {!isPremium ? (
            <>
              <p className="text-sm text-muted-foreground">
                {text({ pt: "Status atual:", en: "Current status:" })}{" "}
                <span className="font-medium">
                  {subscriptionStatus ?? text({ pt: "verificando...", en: "checking..." })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {polling
                  ? text({
                      pt: "Atualizando automaticamente... você será direcionado assim que liberar.",
                      en: "Updating automatically... you will be redirected as soon as it is released.",
                    })
                  : text({
                      pt: "Se não liberar em alguns minutos, volte mais tarde ou confira seus dados de pagamento.",
                      en: "If it does not unlock within a few minutes, come back later or check your payment details.",
                    })}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                >
                  {text({ pt: "Voltar", en: "Back" })}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-4 justify-center">
              <Button
                variant="premium"
                size="lg"
                onClick={() => navigate("/crisis")}
                className="gap-2"
              >
                <Heart className="w-5 h-5" />
                {text({ pt: "Ir para Modo Crise", en: "Go to Crisis Mode" })}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
