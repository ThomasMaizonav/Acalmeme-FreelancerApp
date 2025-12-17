import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Heart, CheckCircle, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium, subscriptionStatus, refreshSubscription } = useSubscription();
  const [polling, setPolling] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 glass text-center">
        <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6 shadow-calm animate-pulse">
          <Crown className="w-12 h-12 text-white" />
        </div>

        <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
        
        <h1 className="text-4xl font-bold mb-4">
          Bem-vindo ao Premium! 🎉
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          Estamos confirmando seu pagamento. Para cartão, isso é imediato. Para boleto, pode levar até 3 dias úteis.
        </p>

        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-secondary" />
            Recursos Desbloqueados
          </h3>
          <ul className="space-y-3 text-left max-w-md mx-auto">
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>Modo Crise ilimitado 24/7</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>Diário emocional ilimitado</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>Lembretes personalizados</span>
            </li>
            <li className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-secondary flex-shrink-0" />
              <span>Estatísticas e progresso detalhado</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          {!isPremium ? (
            <>
              <p className="text-sm text-muted-foreground">
                Status atual: <span className="font-medium">{subscriptionStatus ?? 'verificando...'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {polling
                  ? 'Atualizando automaticamente... você será direcionado assim que liberar.'
                  : 'Se não liberar em alguns minutos, volte mais tarde ou confira seus dados de pagamento.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                >
                  Voltar ao Dashboard
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
                Ir para Modo Crise
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
