import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LogIn,
  UserPlus,
  Smartphone,
  CheckCircle2,
  ChevronDown,
  Sun,
  Moon,
  Pill,
  Bell,
  Book,
  Heart,
  Wind,
  Sparkles,
} from "lucide-react";
import logoAcalmeme from "@/assets/logo-acalmeme.png";

const Landing = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<string | null>("1");
  const [heroOffset, setHeroOffset] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem("acalmeme-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : prefersDark
          ? "dark"
          : "light";

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady || typeof window === "undefined") return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("acalmeme-theme", theme);
  }, [theme, themeReady]);

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        setHeroOffset(window.scrollY);
        rafId = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const faqItems = [
    {
      id: "1",
      question: "O que é o AcalmeMe?",
      answer:
        "O AcalmeMe é um aplicativo completo para gerenciar seus medicamentos com lembretes inteligentes. Além disso, oferece bônus exclusivos como diário emocional, sessões de calma e exercícios de respiração para cuidar da sua saúde mental.",
    },
    {
      id: "2",
      question: "Quanto custa? Tem período de teste?",
      answer:
        "Você pode usar o AcalmeMe gratuitamente por 30 dias completos, sem precisar colocar cartão de crédito. Depois do período de teste, o plano custa apenas R$ 9,90/mês. Cancele quando quiser.",
    },
    {
      id: "3",
      question: "Funciona bem para idosos e pessoas com vários remédios?",
      answer:
        "Sim! Você pode cadastrar vários medicamentos, com doses, horários e observações. Os lembretes são claros e você recebe notificações no app e por e-mail — ideal para idosos, doenças crônicas e cuidadores.",
    },
    {
      id: "4",
      question: "Vou receber notificações mesmo com o app fechado?",
      answer:
        "Sim! O AcalmeMe envia notificações no navegador e também por e-mail (se você ativar), para garantir que você nunca esqueça seus medicamentos.",
    },
    {
      id: "5",
      question: "Quais são os bônus incluídos?",
      answer:
        "Além dos lembretes de medicamentos, você ganha acesso a: Diário Emocional para registrar seus sentimentos, Sessões de Calma com músicas relaxantes, Modo Crise para momentos difíceis e sistema de recompensas por uso diário.",
    },
  ];

  const handleFaqToggle = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const themeButtonLabel =
    theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoAcalmeme}
              alt="Logo AcalmeMe"
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AcalmeMe
              </span>
              <span className="text-[11px] text-muted-foreground">
                Lembretes de medicação + bem-estar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative border border-border/60 overflow-hidden"
              onClick={toggleTheme}
              aria-label={themeButtonLabel}
              title={themeButtonLabel}
              disabled={!themeReady}
            >
              <span className="relative flex items-center justify-center">
                <Sun
                  className={`h-4 w-4 transition-all duration-300 ${
                    theme === "dark"
                      ? "-rotate-90 scale-0 opacity-0"
                      : "rotate-0 scale-100 opacity-100"
                  }`}
                />
                <Moon
                  className={`h-4 w-4 transition-all duration-300 absolute ${
                    theme === "dark"
                      ? "rotate-0 scale-100 opacity-100"
                      : "rotate-90 scale-0 opacity-0"
                  }`}
                />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Button>
            <Button
              size="sm"
              className="gap-1 text-xs sm:text-sm px-3 sm:px-4 bg-gradient-hero text-white hover:opacity-90"
              onClick={() => navigate("/auth?mode=signup")}
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Criar conta</span>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="relative px-4 sm:px-6 py-16 sm:py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/imgPessoaOlhandoAPaisagem.png')",
                transform: `translateY(${heroOffset * 0.1}px) scale(1.1)`,
                transition: "transform 0.4s ease-out",
                filter: "brightness(0.95) saturate(2.85)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
          </div>

          <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Texto principal */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-xs sm:text-sm text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">30 dias grátis • sem cartão</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4">
                Nunca mais esqueça seus
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> medicamentos</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                Receba lembretes no app e por e-mail. Organize horários, doses e 
                ainda ganhe acesso a ferramentas de bem-estar como bônus.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant="premium"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-64 text-base py-6"
                  onClick={() => navigate("/auth")}
                >
                  <Pill className="w-5 h-5 mr-2" />
                  Começar meus 30 dias grátis
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Lembretes por e-mail</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Notificações no app</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </div>

            {/* Card mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-sm space-y-4">
                {/* Card simulando tela do app */}
                <div className="rounded-3xl border border-border/70 bg-card shadow-lg p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-hero flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Seus lembretes</span>
                        <span className="text-xs text-muted-foreground">
                          Hoje • 21:30
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold px-2 py-1 bg-primary/10 rounded-full">
                      3 pendentes
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Losartana 50mg</span>
                        <span className="text-xs text-muted-foreground">
                          1 comprimido • Pressão alta
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-medium">
                        21:30
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Metformina 850mg</span>
                        <span className="text-xs text-muted-foreground">
                          Tomar após o almoço
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-muted-foreground/10 text-muted-foreground">
                        13:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Vitamina D</span>
                        <span className="text-xs text-muted-foreground">
                          1 cápsula pela manhã
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-muted-foreground/10 text-muted-foreground">
                        08:00
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-primary/40 px-4 py-3 text-xs text-muted-foreground text-center">
                    Receba lembretes por e-mail e notificação 🔔
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN FEATURE - LEMBRETES */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary mb-4">
                <Pill className="w-4 h-4" />
                FUNÇÃO PRINCIPAL
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Lembretes de medicação inteligentes
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Configure seus horários uma vez e nunca mais esqueça um remédio.
                Receba alertas no navegador e por e-mail.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Bell,
                  title: "Notificações push",
                  desc: "Alertas no navegador nos horários exatos"
                },
                {
                  icon: Pill,
                  title: "E-mail backup",
                  desc: "Receba também por e-mail para não perder"
                },
                {
                  icon: Smartphone,
                  title: "Multi-dispositivo",
                  desc: "Acesse de qualquer lugar com internet"
                },
                {
                  icon: CheckCircle2,
                  title: "Histórico completo",
                  desc: "Registre o que tomou para acompanhamento"
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BONUS FEATURES */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20 bg-muted/30">
          <div className="max-w-6xl mx-auto py-12">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 px-4 py-2 text-xs font-medium text-secondary-foreground mb-4">
                <Sparkles className="w-4 h-4" />
                BÔNUS INCLUÍDOS
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Cuide também da sua saúde mental
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Além dos lembretes, você ganha acesso a ferramentas de bem-estar 
                para completar seu autocuidado.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Book className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Diário Emocional</h3>
                <p className="text-muted-foreground">
                  Registre seus sentimentos diariamente e acompanhe seu bem-estar 
                  emocional ao longo do tempo.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wind className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">Sessões de Calma</h3>
                <p className="text-muted-foreground">
                  Exercícios de respiração com música relaxante. Escolha 1, 3, 5 ou 
                  10 minutos para acalmar sua mente.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Heart className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-3">Modo Crise</h3>
                <p className="text-muted-foreground">
                  Para momentos difíceis: exercícios guiados de respiração para 
                  ajudar você a se acalmar rapidamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUEM É */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Feito especialmente para você
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg">
                O AcalmeMe foi criado para quem não pode se dar ao luxo de 
                esquecer um medicamento — seja por idade, rotina corrida ou 
                tratamento contínuo.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Idosos</p>
                  <p className="text-sm text-muted-foreground">
                    Lembretes claros e notificações por e-mail
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Doenças crônicas</p>
                  <p className="text-sm text-muted-foreground">
                    Hipertensão, diabetes, ansiedade e mais
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Cuidadores</p>
                  <p className="text-sm text-muted-foreground">
                    Organize a medicação de quem você cuida
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Rotina corrida</p>
                  <p className="text-sm text-muted-foreground">
                    Deixe o app lembrar por você
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-border/70 bg-muted/60">
              <img
                src="/pessoa-feliz.jpg"
                alt="Pessoa feliz usando o app"
                className="w-full h-64 sm:h-80 object-cover"
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              Tire suas dúvidas antes de criar sua conta
            </p>

            <div className="space-y-3">
              {faqItems.map((item) => {
                const isOpen = openFaq === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-border rounded-2xl bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => handleFaqToggle(item.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-medium">{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-muted-foreground">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="px-4 sm:px-6 pb-20 sm:pb-24">
          <div className="max-w-4xl mx-auto text-center rounded-3xl bg-gradient-hero text-white shadow-lg px-8 sm:px-12 py-12 sm:py-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Comece hoje mesmo, é grátis!
            </h2>
            <p className="text-white/90 mb-8 max-w-lg mx-auto">
              30 dias para testar tudo sem compromisso. Depois, apenas R$ 9,90/mês.
              Cancele quando quiser.
            </p>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-base py-6 px-8"
              onClick={() => navigate("/auth")}
            >
              <Pill className="w-5 h-5 mr-2" />
              Criar minha conta grátis
            </Button>
            <p className="text-white/70 text-sm mt-4">
              Leva menos de 1 minuto para começar
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="px-4 sm:px-6 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoAcalmeme} alt="Logo" className="w-8 h-8" />
            <span className="font-semibold">AcalmeMe</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-muted-foreground">
            <a href="/privacy.html" className="hover:underline">
              Política de Privacidade
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="/terms.html" className="hover:underline">
              Termos de Uso
            </a>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © 2026 AcalmeMe. Cuidando da sua saúde com carinho.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
