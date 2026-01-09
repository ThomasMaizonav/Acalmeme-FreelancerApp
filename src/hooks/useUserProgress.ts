import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProgress {
  current_streak: number;
  best_streak: number;
  total_practice_days: number;
  last_activity_date: string | null;
}

const toDateOnly = (d: Date) => d.toISOString().split("T")[0];

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>({
    current_streak: 0,
    best_streak: 0,
    total_practice_days: 0,
    last_activity_date: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProgress = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("user_progress")
        .select("current_streak,best_streak,total_practice_days,last_activity_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProgress({
          current_streak: data.current_streak ?? 0,
          best_streak: data.best_streak ?? 0,
          total_practice_days: data.total_practice_days ?? 0,
          last_activity_date: data.last_activity_date ?? null,
        });
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateProgress = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1) Puxa o progresso mais recente direto do banco (evita stale state)
      const { data: currentRow, error: readError } = await supabase
        .from("user_progress")
        .select("current_streak,best_streak,total_practice_days,last_activity_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (readError) throw readError;

      const current: UserProgress = {
        current_streak: currentRow?.current_streak ?? 0,
        best_streak: currentRow?.best_streak ?? 0,
        total_practice_days: currentRow?.total_practice_days ?? 0,
        last_activity_date: currentRow?.last_activity_date ?? null,
      };

      const today = toDateOnly(new Date());

      // 2) Se já atualizou hoje, não faz nada (evita spam)
      if (current.last_activity_date === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toDateOnly(yesterday);

      // 3) Calcula streak
      let newStreak = 1;
      if (current.last_activity_date === yesterdayStr) {
        newStreak = current.current_streak + 1;
      }

      const newBestStreak = Math.max(newStreak, current.best_streak);
      const newTotalDays = current.total_practice_days + 1;

      // 4) UPSERT com onConflict pra não dar 409/23505
      const { data: saved, error: upsertError } = await supabase
        .from("user_progress")
        .upsert(
          {
            user_id: user.id,
            current_streak: newStreak,
            best_streak: newBestStreak,
            total_practice_days: newTotalDays,
            last_activity_date: today,
          },
          { onConflict: "user_id" }
        )
        .select("current_streak,best_streak,total_practice_days,last_activity_date")
        .single();

      if (upsertError) throw upsertError;

      setProgress({
        current_streak: saved.current_streak ?? 0,
        best_streak: saved.best_streak ?? 0,
        total_practice_days: saved.total_practice_days ?? 0,
        last_activity_date: saved.last_activity_date ?? null,
      });

      // 5) Toasts (igual ao seu)
      if (newStreak === 7 || newStreak === 15) {
        toast({
          title: "🏅 Nova medalha conquistada!",
          description: `Você completou ${newStreak} dias consecutivos!`,
        });
      } else if (newStreak === 30) {
        toast({
          title: "👑 Coroa conquistada!",
          description: "30 dias de prática! Você é incrível!",
        });
      } else if (newStreak > 1) {
        toast({
          title: `⭐ ${newStreak} dias seguidos!`,
          description: "Continue assim!",
        });
      } else {
        toast({
          title: "✨ Primeira estrela!",
          description: "Você começou sua jornada de autocuidado!",
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Erro ao atualizar progresso",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    progress,
    isLoading,
    updateProgress,
    refetch: fetchProgress,
  };
};
