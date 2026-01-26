import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFreeTrialStatus } from "@/hooks/useFreeTrialStatus";

interface PremiumGuardProps {
  children: ReactNode;
  feature?: string;
}

export const PremiumGuard = ({ children, feature = "este recurso" }: PremiumGuardProps) => {
  const { hasAccess, isLoading, isInFreeTrial } = useFreeTrialStatus();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 sm:p-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-6 sm:p-8 glass text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-calm">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2">Recurso Premium</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 px-2">
            {isInFreeTrial 
              ? `Seu trial grátis acabou. Assine para continuar usando ${feature}!`
              : `Você precisa do plano Premium para acessar ${feature}. Desbloqueie acesso ilimitado com 30 dias grátis!`
            }
          </p>
          <div className="space-y-4">
            <ul className="text-left space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-secondary" />
                <span>Modo Crise ilimitado 24/7</span>
              </li>
              <li className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-secondary" />
                <span>Diário emocional ilimitado</span>
              </li>
              <li className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-secondary" />
                <span>Lembretes personalizados</span>
              </li>
              <li className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-secondary" />
                <span>Estatísticas e progresso detalhado</span>
              </li>
            </ul>
            <Button
              variant="premium"
              size="lg"
              className="w-full"
              onClick={() => navigate("/plans")}
            >
              <Crown className="w-5 h-5 mr-2" />
              {isInFreeTrial ? "Assinar Agora" : "Começar 30 Dias Grátis"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
