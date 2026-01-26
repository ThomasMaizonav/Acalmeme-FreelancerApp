import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

export const useFreeTrialStatus = () => {
  const [isInFreeTrial, setIsInFreeTrial] = useState(false);
  const [freeTrialDaysLeft, setFreeTrialDaysLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isPremium } = useSubscription();

  const saoPauloFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const toParts = (date: Date) =>
    saoPauloFormatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
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
      Number(parts.second || "0"),
      0,
    );

  const getSaoPauloNow = () => partsToDate(toParts(new Date()));

  const profileSelect = "id,user_id,free_trial_started_at,free_trial_used";

  const fetchProfile = async (userId: string) => {
    const { data: byUserId, error: userIdError } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("user_id", userId)
      .maybeSingle();

    if (byUserId) {
      return { profile: byUserId, key: "user_id" as const };
    }

    if (userIdError) {
      console.warn("Error loading profile by user_id:", userIdError);
    }

    const { data: byId, error: idError } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", userId)
      .maybeSingle();

    if (byId) {
      return { profile: byId, key: "id" as const };
    }

    if (idError) {
      console.warn("Error loading profile by id:", idError);
    }

    return { profile: null, key: "user_id" as const };
  };

  const upsertProfile = async (
    userId: string,
    key: "user_id" | "id",
    values: Record<string, unknown>,
  ) => {
    const payload = { ...values, [key]: userId } as Record<string, unknown>;
    const { error } = await supabase
      .from("profiles")
      .upsert(payload as any);

    if (!error) return;

    if (key === "user_id") {
      const fallbackPayload = { ...values, id: userId } as Record<string, unknown>;
      const { error: fallbackError } = await supabase
        .from("profiles")
        .upsert(fallbackPayload as any);
      if (fallbackError) throw fallbackError;
      return;
    }

    throw error;
  };

  const updateProfile = async (
    userId: string,
    key: "user_id" | "id",
    values: Record<string, unknown>,
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update(values as any)
      .eq(key, userId);

    if (!error) return;

    if (key === "user_id") {
      const { error: fallbackError } = await supabase
        .from("profiles")
        .update(values as any)
        .eq("id", userId);
      if (fallbackError) throw fallbackError;
      return;
    }

    throw error;
  };

  useEffect(() => {
    let timeoutId: number | null = null;
    let canceled = false;

    const scheduleNextCheck = () => {
      const nowLocal = getSaoPauloNow();
      const cutoff = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate(),
        23,
        59,
        0,
        0,
      );

      if (nowLocal.getTime() > cutoff.getTime()) {
        cutoff.setDate(cutoff.getDate() + 1);
      }

      const delay = cutoff.getTime() - nowLocal.getTime() + 1000;
      timeoutId = window.setTimeout(async () => {
        await checkFreeTrialStatus();
        if (!canceled) {
          scheduleNextCheck();
        }
      }, delay);
    };

    checkFreeTrialStatus();
    scheduleNextCheck();

    return () => {
      canceled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
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

      const { profile, key } = await fetchProfile(user.id);

      if (!profile || (!profile.free_trial_used && !profile.free_trial_started_at)) {
        const startedAt = new Date().toISOString();

        if (!profile) {
          await upsertProfile(user.id, key, {
            free_trial_started_at: startedAt,
            free_trial_used: false,
          });
        } else {
          await updateProfile(user.id, key, {
            free_trial_started_at: startedAt,
          });
        }

        setIsInFreeTrial(true);
        setFreeTrialDaysLeft(30);
        return;
      }

      if (profile && !profile.free_trial_used && profile.free_trial_started_at) {
        const startParts = toParts(new Date(profile.free_trial_started_at));
        const nowLocal = getSaoPauloNow();
        const startDayEnd = new Date(
          Number(startParts.year),
          Number(startParts.month) - 1,
          Number(startParts.day),
          23,
          59,
          0,
          0,
        );
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
          await updateProfile(user.id, key, { free_trial_used: true });
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
