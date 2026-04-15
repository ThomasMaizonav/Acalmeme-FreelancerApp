import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Book, Wind, Crown, Shield, LogOut, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RewardsDisplay } from "@/components/RewardsDisplay";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { useFreeTrialStatus } from "@/hooks/useFreeTrialStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import logoAcalmeme from "@/assets/logo-acalmeme.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/i18n/language";
import { Capacitor } from "@capacitor/core";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { progress, isLoading, updateProgress } = useUserProgress();
  const { isPremium } = useSubscription();
  const { isInFreeTrial, freeTrialDaysLeft } = useFreeTrialStatus();
  const [isAdmin, setIsAdmin] = useState(false);
  const [progressUpdated, setProgressUpdated] = useState(false);
  const [userName, setUserName] = useState("");
  const { text } = useLanguage();
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    checkAdminStatus();
    loadUserName();
  }, []);

  useEffect(() => {
    if (progressUpdated) return;
    updateProgress();
    setProgressUpdated(true);
  }, [progressUpdated, updateProgress]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name.split(" ")[0]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: text({ pt: "Até logo!", en: "See you soon!" }),
      description: text({ pt: "Você saiu com sucesso.", en: "You have signed out successfully." }),
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoAcalmeme} alt="Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {text({ pt: "Olá", en: "Hello" })}{userName ? `, ${userName}` : ""}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isInFreeTrial 
                  ? text({
                      pt: `Período grátis: ${freeTrialDaysLeft} dias restantes`,
                      en: `Free period: ${freeTrialDaysLeft} days left`,
                    })
                  : isPremium 
                    ? text({ pt: "Plano Premium ativo", en: "Premium plan active" })
                    : text({ pt: "Seus medicamentos estão em dia?", en: "Are your medications up to date?" })
                }
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto items-center">
            <ThemeToggle />
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="gap-2 text-sm flex-1 sm:flex-initial"
                size="sm"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
              className="gap-2 text-sm flex-1 sm:flex-initial"
              size="sm"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{text({ pt: "Configurações", en: "Settings" })}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 text-sm flex-1 sm:flex-initial"
              size="sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{text({ pt: "Sair", en: "Sign out" })}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto">
        {/* Main Feature - Reminders */}
        <Card 
          className="mb-6 sm:mb-8 p-6 sm:p-8 bg-gradient-hero text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => navigate("/reminders")}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  {text({ pt: "Lembretes de Medicação", en: "Medication Reminders" })}
                </h2>
                <p className="opacity-90 text-sm sm:text-base">
                  {text({ pt: "Configure seus horários e receba alertas", en: "Set your schedule and receive alerts" })}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 w-full sm:w-auto"
            >
              {text({ pt: "Gerenciar lembretes", en: "Manage reminders" })}
            </Button>
          </div>
        </Card>

        {/* Bonus Features Grid */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">{text({ pt: "Bônus incluídos", en: "Included bonuses" })}</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <Card
              className="p-6 glass shadow-soft hover:shadow-calm transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/journal")}
            >
              <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{text({ pt: "Diário Emocional", en: "Emotional Journal" })}</h3>
              <p className="text-sm text-muted-foreground">
                {text({ pt: "Registre seus sentimentos e acompanhe seu bem-estar", en: "Record your feelings and track your well-being" })}
              </p>
            </Card>

            <Card
              className="p-6 glass shadow-soft hover:shadow-calm transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/calm-sessions")}
            >
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{text({ pt: "Sessões de Calma", en: "Calm Sessions" })}</h3>
              <p className="text-sm text-muted-foreground">
                {text({ pt: "Exercícios de respiração com música relaxante", en: "Breathing exercises with relaxing music" })}
              </p>
            </Card>

            <Card
              className="p-6 glass shadow-soft hover:shadow-calm transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/crisis")}
            >
              <div className="w-12 h-12 bg-destructive/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{text({ pt: "Modo Crise", en: "Crisis Mode" })}</h3>
              <p className="text-sm text-muted-foreground">
                {text({ pt: "Apoio imediato para momentos difíceis", en: "Immediate support for difficult moments" })}
              </p>
            </Card>
          </div>
        </div>

        {/* Rewards and Progress */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <RewardsDisplay currentStreak={progress.current_streak} />
          
          <Card className="p-6 sm:p-8 glass shadow-soft">
            <h3 className="text-lg font-semibold mb-6">{text({ pt: "Seu Progresso", en: "Your Progress" })}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{text({ pt: "Dias de prática", en: "Practice days" })}</p>
                <div className="text-2xl font-bold text-primary">
                  {isLoading ? "..." : progress.total_practice_days}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{text({ pt: "Melhor sequência", en: "Best streak" })}</p>
                <div className="text-2xl font-bold text-secondary">
                  {isLoading ? "..." : progress.best_streak}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{text({ pt: "Sequência atual", en: "Current streak" })}</p>
                <div className="text-2xl font-bold text-accent">
                  {isLoading ? "..." : progress.current_streak}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Status / Upsell */}
        {isPremium ? (
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary/20 shadow-calm">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-secondary" />
              <div>
                <h3 className="text-xl font-semibold">{text({ pt: "Você é Premium! 🎉", en: "You are Premium! 🎉" })}</h3>
                <p className="text-muted-foreground">
                  {text({ pt: "Aproveite todos os recursos ilimitados", en: "Enjoy all unlimited features" })}
                </p>
              </div>
            </div>
          </Card>
        ) : isInFreeTrial ? (
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">{text({ pt: "Período de Teste Grátis", en: "Free Trial Period" })}</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  {text({
                    pt: `Você ainda tem ${freeTrialDaysLeft} dias de acesso gratuito. Assine para não perder nenhum recurso!`,
                    en: `You still have ${freeTrialDaysLeft} days of free access. Subscribe so you do not lose any features!`,
                  })}
                </p>
                <Button variant="premium" onClick={() => navigate("/plans")}>
                  {isNativeApp
                    ? text({ pt: "Ver assinatura", en: "View subscription" })
                    : text({ pt: "Ver planos", en: "See plans" })}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary/20 shadow-calm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-6 h-6 text-secondary" />
                  <h3 className="text-xl font-semibold">AcalmeMe Premium</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  {text({
                    pt: "Desbloqueie todos os recursos: lembretes ilimitados, diário completo e muito mais",
                    en: "Unlock all features: unlimited reminders, full journal, and much more",
                  })}
                </p>
                <Button variant="premium" onClick={() => navigate("/plans")}>
                  {isNativeApp
                    ? text({ pt: "Ver assinatura", en: "View subscription" })
                    : text({ pt: "Assinar agora", en: "Subscribe now" })}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
