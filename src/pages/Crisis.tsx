import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type Meditation = {
  id: number;
  title: string;
  duration: string;
  focus: string;
  description: string;
};

type Verse = {
  ref: string;
  text: string;
};

type GratitudeEntry = {
  entry_date: string;
  items: string[];
};

const meditations: Meditation[] = [
  {
    id: 1,
    title: "Pausa de 3 minutos",
    duration: "3 min",
    focus: "Respiração",
    description: "Feche os olhos, respire fundo e permita que o corpo desacelere.",
  },
  {
    id: 2,
    title: "Entrega das preocupações",
    duration: "5 min",
    focus: "Ansiedade",
    description: "Mentalmente entregue a Deus tudo que está pesado hoje.",
  },
  {
    id: 3,
    title: "Gratidão silenciosa",
    duration: "4 min",
    focus: "Gratidão",
    description: "Reconecte-se com o que já deu certo e com o que você tem de bom.",
  },
  {
    id: 4,
    title: "Antes de dormir",
    duration: "6 min",
    focus: "Sono",
    description: "Desconecte dos problemas do dia e descanse o coração.",
  },
  {
    id: 5,
    title: "Força para recomeçar",
    duration: "5 min",
    focus: "Ânimo",
    description: "Respire fundo e permita que Deus renove sua coragem.",
  },
];

const verses: Verse[] = [
  {
    ref: "1 Pedro 5:7",
    text: "Lancem sobre Ele toda a sua ansiedade, porque Ele tem cuidado de vocês.",
  },
  {
    ref: "Filipenses 4:7",
    text: "A paz de Deus, que excede todo entendimento, guardará o coração e a mente de vocês.",
  },
  {
    ref: "Salmos 46:10",
    text: "Aquietem-se e saibam que Eu sou Deus.",
  },
  {
    ref: "Mateus 11:28",
    text: "Venham a mim todos os que estão cansados e sobrecarregados, e Eu lhes darei descanso.",
  },
  {
    ref: "Isaías 41:10",
    text: "Não temas, porque Eu sou contigo; não te assombres, porque Eu sou o teu Deus.",
  },
];

const longPrayer = `
Senhor, acalma meu coração neste momento.
Tira de mim todo peso, toda ansiedade e todo medo.
Me ajuda a descansar nos Teus braços e a lembrar que não estou sozinho.
Que a Tua presença traga clareza para minha mente, leveza para minha alma
e força para continuar caminhando, mesmo quando tudo parece difícil.

Guarda meus pensamentos, renova minhas forças e me lembra que cada dia tem sua graça.
Obrigado porque Tu és meu refúgio, meu descanso e minha esperança.
Que a Tua paz me acompanhe agora e durante todo o dia.
Amém.
`;

const gratitudeSuggestions = [
  "Acordar com saúde",
  "Respirar com calma",
  "Minha família",
  "Amigos de verdade",
  "Um momento de paz",
  "Ter onde dormir",
  "Comida na mesa",
  "Oração",
  "Trabalho",
  "Força para recomeçar",
  "Pequenas vitórias",
  "Cuidar de mim",
  "Um bom banho",
  "Um abraço sincero",
  "O sol de hoje",
  "Aprender algo novo",
  "Minha fé",
  "Meu esforço",
];

const normalizeGratidao = (items: string[] | null | undefined) => {
  const normalized = (items ?? []).map((item) => item ?? "").slice(0, 3);
  while (normalized.length < 3) {
    normalized.push("");
  }
  return normalized;
};

const Crisis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateProgress } = useUserProgress();
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"Inspire" | "Segure" | "Expire">("Inspire");
  const [breathCount, setBreathCount] = useState(0);
  const [gratidao, setGratidao] = useState(["", "", ""]);
  const [savingGratidao, setSavingGratidao] = useState(false);
  const [gratitudeHistory, setGratitudeHistory] = useState<GratitudeEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const todayEntryDate = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    updateProgress();
  }, [updateProgress]);

  const loadGratidao = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .select("items")
        .eq("user_id", userId)
        .eq("entry_date", todayEntryDate)
        .maybeSingle();

      if (error) throw error;
      if (data?.items) {
        setGratidao(normalizeGratidao(data.items));
      } else {
        setGratidao(["", "", ""]);
      }
    } catch (error) {
      console.error("Erro ao carregar gratidão:", error);
    }
  };

  const loadGratitudeHistory = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .select("entry_date, items")
        .eq("user_id", userId)
        .lte("entry_date", todayEntryDate)
        .order("entry_date", { ascending: false })
        .limit(14);

      if (error) throw error;
      setGratitudeHistory((data as GratitudeEntry[]) ?? []);
    } catch (error) {
      console.error("Erro ao carregar histórico de gratidão:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await Promise.all([loadGratidao(user.id), loadGratitudeHistory(user.id)]);
    };

    loadAll();
  }, [todayEntryDate]);

  const updateGratidao = (index: number, value: string) => {
    setGratidao((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addSuggestion = (suggestion: string) => {
    const trimmed = suggestion.trim();
    if (!trimmed) return;

    setGratidao((prev) => {
      const normalized = prev.map((item) => item.trim());
      if (normalized.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }

      const emptyIndex = normalized.findIndex((item) => !item);
      if (emptyIndex === -1) {
        toast({
          title: "Você já preencheu os 3 motivos",
          description: "Apague um campo para adicionar outro.",
        });
        return prev;
      }

      const updated = [...prev];
      updated[emptyIndex] = trimmed;
      return updated;
    });
  };

  const handleSaveGratidao = async () => {
    const cleaned = gratidao.map((item) => item.trim());
    if (cleaned.every((item) => !item)) {
      toast({
        title: "Escreva pelo menos 1 motivo",
        description: "Você pode começar com algo simples do seu dia.",
        variant: "destructive",
      });
      return;
    }

    setSavingGratidao(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para salvar.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("gratitude_entries")
        .upsert(
          {
            user_id: user.id,
            entry_date: todayEntryDate,
            items: normalizeGratidao(cleaned),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,entry_date" }
        );

      if (error) throw error;

      toast({
        title: "Gratidão salva ✨",
        description: "Seu registro foi guardado com carinho.",
      });
      await loadGratitudeHistory(user.id);
    } catch (error: any) {
      console.error("Erro ao salvar gratidão:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível salvar agora.",
        variant: "destructive",
      });
    } finally {
      setSavingGratidao(false);
    }
  };

  const today = new Date();
  const dayIndex = today.getDate();

  const meditationOfTheDay = meditations[dayIndex % meditations.length];
  const verseOfTheDay = verses[dayIndex % verses.length];

  useEffect(() => {
    if (!breathingActive) return;

    const phases: ("Inspire" | "Segure" | "Expire")[] = ["Inspire", "Segure", "Expire"];
    let index = 0;
    setBreathingPhase(phases[index]);

    const interval = setInterval(() => {
      index = (index + 1) % phases.length;
      setBreathingPhase(phases[index]);

      if (index === 0) setBreathCount((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [breathingActive]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>

        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Modo Crise</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Respire fundo, entregue o peso a Deus e encontre paz.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Meditação do dia</h2>
            <p className="text-xl font-semibold">{meditationOfTheDay.title}</p>
            <p className="text-sm text-muted-foreground">
              {meditationOfTheDay.duration} • {meditationOfTheDay.focus}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {meditationOfTheDay.description}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Versículo de encorajamento</h2>
            <p className="text-sm leading-relaxed mb-3">“{verseOfTheDay.text}”</p>
            <p className="text-sm font-medium text-muted-foreground text-right">
              {verseOfTheDay.ref}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-3">
            <h2 className="text-lg font-semibold">Exercício de respiração</h2>
            <p className="text-sm text-muted-foreground">
              Inspire por 4s → Segure 4s → Expire 4s.
            </p>

            <button
              onClick={() => {
                if (breathingActive) {
                  setBreathingActive(false);
                  setBreathCount(0);
                } else setBreathingActive(true);
              }}
              className="mt-3 inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              {breathingActive ? "Parar respiração" : "Iniciar respiração"}
            </button>

            {breathCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Ciclos completos: {breathCount}
              </p>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative h-40 w-40">
              <div
                className={`absolute inset-0 rounded-full border-[3px] border-primary/70 flex items-center justify-center transition-all duration-500 ${
                  breathingActive ? "scale-110" : "scale-95"
                }`}
              >
                <div
                  className={`h-24 w-24 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center ${
                    breathingActive ? "animate-pulse" : ""
                  }`}
                >
                  <span className="text-sm font-semibold">{breathingPhase}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold">3 motivos pelos quais sou grato hoje</h2>
          <p className="text-sm text-muted-foreground">
            Escrever gratidão diariamente ajuda sua mente a lembrar que ainda existe luz mesmo nos dias difíceis.
          </p>

          <div className="flex flex-wrap gap-2">
            {gratitudeSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSuggestion(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {gratidao.map((item, index) => (
              <input
                key={index}
                value={item}
                onChange={(e) => updateGratidao(index, e.target.value)}
                placeholder={`Motivo ${index + 1}`}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm"
              />
            ))}
          </div>

          <Button onClick={handleSaveGratidao} disabled={savingGratidao}>
            {savingGratidao ? "Salvando..." : "Salvar gratidão"}
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Histórico recente</h2>
          <p className="text-sm text-muted-foreground">
            Veja seus registros recentes (inclui hoje).
          </p>

          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : gratitudeHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há registros.</p>
          ) : (
            <div className="space-y-3">
              {gratitudeHistory.map((entry) => {
                const dateLabel = format(new Date(`${entry.entry_date}T00:00:00`), "dd/MM/yyyy");
                const items = (entry.items ?? []).filter((item) => item?.trim());

                return (
                  <div key={entry.entry_date} className="rounded-xl border border-border bg-background/70 p-4">
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">Sem motivos salvos.</p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {items.map((item, index) => (
                          <div key={`${entry.entry_date}-${index}`} className="flex gap-2 text-sm">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Oração de paz</h2>
          <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
            {longPrayer}
          </p>
        </section>
      </div>
    </div>
  );
};

export default Crisis;
