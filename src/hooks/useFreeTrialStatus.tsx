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
  const toSaoPauloDate = (date: Date) => {
    const parts = toParts(date);
    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0, 0, 0);
  };

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
      const nextMidnight = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate() + 1,
        0,
        0,
        5,
        0,
      );

      const delay = Math.max(0, nextMidnight.getTime() - nowLocal.getTime());
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
      const trialStartIso = profile?.free_trial_started_at || user.created_at || null;

      if (!trialStartIso) {
        setIsInFreeTrial(false);
        setFreeTrialDaysLeft(0);
        return;
      }

      if (profile && !profile.free_trial_started_at) {
        await updateProfile(user.id, key, { free_trial_started_at: trialStartIso });
      }

      const startDate = toSaoPauloDate(new Date(trialStartIso));
      const todayDate = toSaoPauloDate(new Date());
      const diffMs = todayDate.getTime() - startDate.getTime();
      const daysPassed = diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
      const daysLeft = Math.max(0, 30 - daysPassed);

      if (daysLeft > 0) {
        setIsInFreeTrial(true);
        setFreeTrialDaysLeft(daysLeft);
      } else {
        setIsInFreeTrial(false);
        setFreeTrialDaysLeft(0);

        if (profile && !profile.free_trial_used) {
          await updateProfile(user.id, key, { free_trial_used: true });
        }
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
