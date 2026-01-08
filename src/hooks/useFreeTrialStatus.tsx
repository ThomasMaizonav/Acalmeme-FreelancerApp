import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

export const useFreeTrialStatus = () => {
  const [isInFreeTrial, setIsInFreeTrial] = useState(false);
  const [freeTrialDaysLeft, setFreeTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isPremium } = useSubscription();

  useEffect(() => {
    checkFreeTrialStatus();
  }, [isPremium]);

  const checkFreeTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsInFreeTrial(false);
        setIsLoading(false);
        return;
      }

      // Check if user is admin - admins have free access
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (adminRole) {
        setIsAdmin(true);
        setIsInFreeTrial(false);
        setFreeTrialDaysLeft(0);
        setIsLoading(false);
        return;
      }

      // If already premium, no free trial
      if (isPremium) {
        setIsInFreeTrial(false);
        setFreeTrialDaysLeft(0);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("free_trial_started_at, free_trial_used")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || (!profile.free_trial_used && !profile.free_trial_started_at)) {
        const startedAt = new Date().toISOString();
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            free_trial_started_at: startedAt,
            free_trial_used: false,
          });

        setIsInFreeTrial(true);
        setFreeTrialDaysLeft(30);
        return;
      }

      if (profile && !profile.free_trial_used && profile.free_trial_started_at) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });
        const toParts = (date: Date) =>
          formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
            if (part.type !== "literal") acc[part.type] = part.value;
            return acc;
          }, {});
        const partsToDate = (parts: Record<string, string>) =>
          new Date(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day),
            Number(parts.hour),
            Number(parts.minute),
            0,
            0,
          );

        const startParts = toParts(new Date(profile.free_trial_started_at));
        const nowParts = toParts(new Date());

        const startDayEnd = new Date(
          Number(startParts.year),
          Number(startParts.month) - 1,
          Number(startParts.day),
          23,
          59,
          0,
          0,
        );
        const nowLocal = partsToDate(nowParts);
        const hasPassedTodayCutoff =
          nowLocal.getHours() > 23 || (nowLocal.getHours() === 23 && nowLocal.getMinutes() >= 59);

        const diffMs = nowLocal.getTime() - startDayEnd.getTime();
        const fullDaysPassed = diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
        const daysLeft = Math.max(0, 30 - fullDaysPassed);

        const trialExpired = daysLeft === 0 && hasPassedTodayCutoff;

        if (!trialExpired) {
          setIsInFreeTrial(true);
          setFreeTrialDaysLeft(daysLeft);
        } else {
          setIsInFreeTrial(false);
          setFreeTrialDaysLeft(0);

          // Mark free trial as used
          await supabase
            .from("profiles")
            .update({ free_trial_used: true })
            .eq("id", user.id);
        }
      } else {
        setIsInFreeTrial(false);
        setFreeTrialDaysLeft(0);
      }
    } catch (error) {
      console.error("Error checking free trial status:", error);
      setIsInFreeTrial(false);
      setFreeTrialDaysLeft(0);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isInFreeTrial,
    freeTrialDaysLeft,
    isLoading,
    isAdmin,
    hasAccess: isPremium || isInFreeTrial || isAdmin,
  };
};
