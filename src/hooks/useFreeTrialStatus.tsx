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

      if (profile && !profile.free_trial_used && profile.free_trial_started_at) {
        const startDate = new Date(profile.free_trial_started_at);
        const now = new Date();
        const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          setIsInFreeTrial(true);
          setFreeTrialDaysLeft(diffDays);
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