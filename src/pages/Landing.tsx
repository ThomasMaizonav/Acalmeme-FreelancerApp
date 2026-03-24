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
        "O AcalmeMe é um app criado para ajudar quem entra em crise de ansiedade no trabalho e precisa se reorganizar rápido. Em vez de ser um app genérico de bem-estar, ele te coloca direto em um protocolo de 3 minutos com respiração guiada e foco prático. Como bônus, você ainda tem lembretes de medicação, diário emocional e sessões de calma.",
    },
    {
      id: "2",
      question: "Quanto custa? Tem período de teste?",
      answer:
        "Você pode usar o AcalmeMe gratuitamente por 30 dias completos, sem precisar colocar cartão de crédito. Depois do período de teste, o plano custa apenas R$ 9,90/mês. Cancele quando quiser.",
    },
    {
      id: "3",
      question: "Funciona em uma crise de ansiedade de verdade?",
      answer:
        "O foco do app é te ajudar no pico da ansiedade com um passo a passo curto e direto, pensado para momentos em que você precisa voltar ao controle sem sair totalmente da rotina. Ele não substitui terapia ou atendimento médico, mas funciona como apoio imediato.",
    },
    {
      id: "4",
      question: "Dá para usar no trabalho sem chamar atenção?",
      answer:
        "Sim. O fluxo foi pensado para ser rápido, discreto e direto ao ponto. Você consegue usar no celular ou navegador em uma pausa curta, antes de reunião, no banheiro, no elevador ou na própria mesa.",
    },
    {
      id: "5",
      question: "Tem lembrete de medicação e outros bônus?",
      answer:
        "Sim. Os bônus incluem lembretes de medicação por app e e-mail, diário emocional para rastrear gatilhos e sessões de calma de 1, 3, 5 ou 10 minutos para prevenir que a ansiedade escale.",
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
                Crise de ansiedade no trabalho
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
                <span className="font-medium">Protocolo de 3 minutos • 30 dias grátis</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4">
                Pare a crise de ansiedade em
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> 3 minutos</span>,
                mesmo no trabalho
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                Abra o app, siga a respiração guiada e saia do pico da ansiedade sem
                depender de força de vontade. E ainda leve bônus como lembretes de
                medicação, diário emocional e sessões rápidas de calma.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant="premium"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-64 text-base py-6"
                  onClick={() => navigate("/auth")}
                >
                  <Wind className="w-5 h-5 mr-2" />
                  Começar meu protocolo grátis
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Modo crise guiado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Uso discreto no trabalho</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Bônus: lembretes de medicação</span>
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
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Modo crise no trabalho</span>
                        <span className="text-xs text-muted-foreground">
                          Agora • protocolo de 3 min
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold px-2 py-1 bg-primary/10 rounded-full">
                      em andamento
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Respiração guiada</span>
                        <span className="text-xs text-muted-foreground">
                          60 segundos para baixar o pico da ansiedade
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-medium">
                        01:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Aterramento rápido</span>
                        <span className="text-xs text-muted-foreground">
                          Volte para o presente sem sair do ambiente
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-muted-foreground/10 text-muted-foreground">
                        02:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">Bônus: lembrete de medicação</span>
                        <span className="text-xs text-muted-foreground">
                          Sertralina 50mg • amanhã às 08:00
                        </span>
                      </div>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-muted-foreground/10 text-muted-foreground">
                        ativo
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-primary/40 px-4 py-3 text-xs text-muted-foreground text-center">
                    Abra, respire, recupere o controle e volte para o trabalho
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN FEATURE */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary mb-4">
                <Heart className="w-4 h-4" />
                FUNÇÃO PRINCIPAL
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Seu protocolo rápido para crises de ansiedade no trabalho
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Quando a ansiedade dispara, você não precisa escolher entre sumir do
                expediente ou fingir que está tudo bem. O AcalmeMe te conduz por um
                fluxo curto para reduzir o pico e recuperar o foco.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Heart,
                  title: "Acesso imediato",
                  desc: "Entrou em crise? Abra e comece sem configurar nada"
                },
                {
                  icon: Wind,
                  title: "Respiração guiada",
                  desc: "Passos visuais e simples para baixar a ativação"
                },
                {
                  icon: Smartphone,
                  title: "Discreto no expediente",
                  desc: "Use no celular em uma pausa curta, sem exposição"
                },
                {
                  icon: CheckCircle2,
                  title: "Volta ao foco",
                  desc: "Feche o protocolo com orientação prática para retomar a tarefa"
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
                O app vai além da crise, mas sem perder o foco
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A proposta principal é te ajudar na hora do aperto. Como
                complemento, você também acompanha sua rotina e reduz novos gatilhos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Pill className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Lembretes de Medicação</h3>
                <p className="text-muted-foreground">
                  Receba alertas no app e por e-mail para não esquecer antidepressivos,
                  ansiolíticos ou outros remédios da sua rotina.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Book className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">Diário Emocional</h3>
                <p className="text-muted-foreground">
                  Registre gatilhos, sintomas e dias mais difíceis para entender o
                  que mais pesa na sua rotina.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-8 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Wind className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-3">Sessões de Calma</h3>
                <p className="text-muted-foreground">
                  Faça práticas de 1, 3, 5 ou 10 minutos para evitar que a ansiedade
                  vá se acumulando ao longo do dia.
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
                Feito para quem precisa se recompor rápido no expediente
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg">
                Se sua ansiedade aperta antes de reunião, apresentação, cobrança ou
                excesso de estímulo, o AcalmeMe foi desenhado para esse contexto
                real: pouco tempo, pouco espaço e zero margem para travar.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Antes de reuniões</p>
                  <p className="text-sm text-muted-foreground">
                    Para baixar a ativação sem desaparecer por meia hora
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Picos de cobrança</p>
                  <p className="text-sm text-muted-foreground">
                    Quando o coração acelera, a mão sua e a mente trava
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Quem já faz tratamento</p>
                  <p className="text-sm text-muted-foreground">
                    Use com lembretes de medicação e apoio complementar
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-semibold mb-1">Rotina corrida</p>
                  <p className="text-sm text-muted-foreground">
                    Tenha um recurso prático no bolso para usar rápido
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
              Tenha um plano de 3 minutos para quando a ansiedade bater no trabalho
            </h2>
            <p className="text-white/90 mb-8 max-w-lg mx-auto">
              Teste por 30 dias sem cartão. Se fizer sentido, continue por apenas
              R$ 9,90/mês com lembretes de medicação e ferramentas extras incluídas.
            </p>
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-base py-6 px-8"
              onClick={() => navigate("/auth")}
            >
              <Wind className="w-5 h-5 mr-2" />
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
