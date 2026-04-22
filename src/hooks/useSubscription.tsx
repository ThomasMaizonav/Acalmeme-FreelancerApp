import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import {
  addRevenueCatCustomerInfoListener,
  getActiveRevenueCatEntitlement,
  getRevenueCatCustomerInfo,
  mapRevenueCatStatus,
} from "@/lib/revenuecat";

export const useSubscription = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let removeRevenueCatListener: (() => Promise<void>) | null = null;

    const loadSubscription = async () => {
      await checkSubscription();

      if (!Capacitor.isNativePlatform()) {
        return;
      }

      removeRevenueCatListener = await addRevenueCatCustomerInfoListener((customerInfo) => {
        if (!isMounted) return;

        const entitlement = getActiveRevenueCatEntitlement(customerInfo);
        if (entitlement?.isActive) {
          setIsPremium(true);
          setSubscriptionStatus(mapRevenueCatStatus(entitlement));
        } else {
          void checkSubscription();
        }
      });
    };

    void loadSubscription();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        void checkSubscription();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (removeRevenueCatListener) {
        void removeRevenueCatListener();
      }
    };
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      const [{ data, error }, nativeCustomerInfo] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        Capacitor.isNativePlatform() ? getRevenueCatCustomerInfo(user) : Promise.resolve(null),
      ]);

      if (error) throw error;

      const nativeEntitlement = getActiveRevenueCatEntitlement(nativeCustomerInfo);
      const nativeStatus = mapRevenueCatStatus(nativeEntitlement);
      const hasNativeAccess = Boolean(nativeEntitlement?.isActive);

      if (data) {
        setSubscriptionStatus(data.status);
        const premium = data.status === 'active' || data.status === 'trialing';
        setIsPremium(premium || hasNativeAccess);
      } else if (hasNativeAccess) {
        setSubscriptionStatus(nativeStatus);
        setIsPremium(true);
      } else {
        setSubscriptionStatus(null);
        setIsPremium(false);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsPremium(false);
      setSubscriptionStatus(null);
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
