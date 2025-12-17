import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscription = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscriptionStatus(data.status);
        // User is premium if subscription is active or trialing
        const premium = data.status === 'active' || data.status === 'trialing';
        setIsPremium(premium);
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isPremium,
    isLoading,
    subscriptionStatus,
    refreshSubscription: checkSubscription
  };
};
