import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProgress {
  current_streak: number;
  best_streak: number;
  total_practice_days: number;
  last_activity_date: string | null;
}

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>({
    current_streak: 0,
    best_streak: 0,
    total_practice_days: 0,
    last_activity_date: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProgress({
          current_streak: data.current_streak || 0,
          best_streak: data.best_streak || 0,
          total_practice_days: data.total_practice_days || 0,
          last_activity_date: data.last_activity_date,
        });
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      
      // Check if already completed today
      if (progress.last_activity_date === today) {
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = 1;
      
      // If last activity was yesterday, increment streak
      if (progress.last_activity_date === yesterdayStr) {
        newStreak = progress.current_streak + 1;
      }

      const newBestStreak = Math.max(newStreak, progress.best_streak);
      const newTotalDays = progress.total_practice_days + 1;

      const { data, error } = await supabase
        .from("user_progress")
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          best_streak: newBestStreak,
          total_practice_days: newTotalDays,
          last_activity_date: today,
        })
        .select()
        .single();

      if (error) throw error;

      setProgress({
        current_streak: data.current_streak,
        best_streak: data.best_streak,
        total_practice_days: data.total_practice_days,
        last_activity_date: data.last_activity_date,
      });

      // Show reward notification
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
  };

  return {
    progress,
    isLoading,
    updateProgress,
    refetch: fetchProgress,
  };
};
