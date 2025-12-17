import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserProgress = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
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
        setCurrentStreak(data.current_streak || 0);
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

      const today = new Date().toISOString().split('T')[0];

      // Get current progress
      const { data: currentProgress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!currentProgress) {
        // First time - create new progress
        const { error } = await supabase
          .from("user_progress")
          .insert({
            user_id: user.id,
            current_streak: 1,
            best_streak: 1,
            total_practice_days: 1,
            last_activity_date: today
          });

        if (error) throw error;
        setCurrentStreak(1);
        
        toast({
          title: "Primeira estrela! ⭐",
          description: "Você começou sua jornada de autocuidado!",
        });
      } else {
        const lastActivity = currentProgress.last_activity_date;
        
        // Already practiced today
        if (lastActivity === today) {
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = currentProgress.current_streak;
        
        // Consecutive day
        if (lastActivity === yesterdayStr) {
          newStreak += 1;
        } else {
          // Streak broken
          newStreak = 1;
        }

        const newBestStreak = Math.max(newStreak, currentProgress.best_streak);

        const { error } = await supabase
          .from("user_progress")
          .update({
            current_streak: newStreak,
            best_streak: newBestStreak,
            total_practice_days: currentProgress.total_practice_days + 1,
            last_activity_date: today
          })
          .eq("user_id", user.id);

        if (error) throw error;
        
        setCurrentStreak(newStreak);

        // Show achievement toasts
        if (newStreak === 7) {
          toast({
            title: "Primeira medalha! 🏅",
            description: "7 dias consecutivos de autocuidado!",
          });
        } else if (newStreak === 15) {
          toast({
            title: "Segunda medalha! 🏅🏅",
            description: "15 dias consecutivos! Incrível!",
          });
        } else if (newStreak === 30) {
          toast({
            title: "Coroa conquistada! 👑",
            description: "30 dias consecutivos! Você é incrível!",
          });
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  return {
    currentStreak,
    isLoading,
    updateProgress,
    refreshProgress: fetchProgress
  };
};
