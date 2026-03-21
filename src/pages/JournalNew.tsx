import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookHeart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PremiumGuard } from "@/components/PremiumGuard";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Capacitor } from "@capacitor/core";

interface JournalEntry {
  id: string;
  entry_date: string;
  content: string;
  mood?: string;
}

const JournalNew = () => {
  const isNativeApp = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateProgress } = useUserProgress();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entry, setEntry] = useState("");
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [weekEntries, setWeekEntries] = useState<Map<string, JournalEntry>>(new Map());
  const [progressUpdated, setProgressUpdated] = useState(false);

  useEffect(() => {
    loadEntryForDate(selectedDate);
    loadWeekEntries(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!progressUpdated) {
      updateProgress();
      setProgressUpdated(true);
    }
  }, [progressUpdated, updateProgress]);

  const loadWeekEntries = async (date: Date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", format(weekStart, "yyyy-MM-dd"))
        .lte("entry_date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;

      const entriesMap = new Map<string, JournalEntry>();
      data?.forEach(entry => {
        entriesMap.set(entry.entry_date, entry);
      });
      setWeekEntries(entriesMap);
    } catch (error: any) {
      console.error("Erro ao carregar entradas da semana:", error);
    }
  };

  const loadEntryForDate = async (date: Date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(date, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", dateStr)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingEntry(data);
        setEntry(data.content);
      } else {
        setExistingEntry(null);
        setEntry("");
      }
    } catch (error: any) {
      console.error("Erro ao carregar entrada:", error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'prev' ? -7 : 7);
    setSelectedDate(newDate);
  };

  const handleSave = async () => {
    if (!entry.trim()) {
      toast({
        title: "Escreva algo primeiro",
        description: "Compartilhe como você está se sentindo hoje.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Você precisa estar logado", variant: "destructive" });
        return;
      }

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      if (existingEntry) {
        const { error } = await supabase
          .from("journal_entries")
          .update({ content: entry, updated_at: new Date().toISOString() })
          .eq("id", existingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("journal_entries")
          .insert({
            user_id: user.id,
            entry_date: dateStr,
            content: entry,
          });

        if (error) throw error;
      }

      toast({
        title: "Entrada salva! 💚",
        description: "Seu registro emocional foi guardado com carinho.",
      });
      
      loadEntryForDate(selectedDate);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a entrada",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumGuard feature="o Diário Emocional ilimitado">
      <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4 shadow-calm">
              <BookHeart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Diário Emocional</h1>
            <p className="text-muted-foreground">
              Um espaço seguro para seus sentimentos
            </p>
          </div>

          <Card className="p-6 glass mb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateWeek('prev')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium">
                  {format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "dd MMM", { locale: ptBR })} - {format(endOfWeek(selectedDate, { weekStartsOn: 0 }), "dd MMM yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateWeek('next')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, index) => {
                  const date = addDays(startOfWeek(selectedDate, { weekStartsOn: 0 }), index);
                  const dateStr = format(date, "yyyy-MM-dd");
                  const hasEntry = weekEntries.has(dateStr);
                  const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  const weekdayLabel = isNativeApp
                    ? ["D", "S", "T", "Q", "Q", "S", "S"][index]
                    : format(date, "EEE", { locale: ptBR });

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg transition-all",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && hasEntry && "bg-primary/10",
                        !isSelected && !hasEntry && "hover:bg-muted",
                        isToday && !isSelected && "ring-2 ring-primary"
                      )}
                    >
                      <span className="text-xs mb-1">
                        {weekdayLabel}
                      </span>
                      <span className="text-sm font-semibold">
                        {format(date, "d")}
                      </span>
                      {hasEntry && (
                        <div className={cn(
                          "w-1 h-1 rounded-full mt-1",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="p-6 glass">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Como você está se sentindo neste dia?
                </label>
                <Textarea
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="Escreva aqui seus pensamentos, sentimentos e reflexões..."
                  className="min-h-[300px] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : existingEntry ? "Atualizar entrada" : "Salvar entrada"}
                </Button>
                <Button
                  onClick={() => setEntry("")}
                  variant="outline"
                  size="lg"
                >
                  Limpar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Suas entradas são privadas e seguras. Apenas você pode vê-las.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PremiumGuard>
  );
};

export default JournalNew;
