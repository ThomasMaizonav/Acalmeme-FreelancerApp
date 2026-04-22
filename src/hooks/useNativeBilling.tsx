import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import {
  addRevenueCatCustomerInfoListener,
  getActiveRevenueCatEntitlement,
  getNativeBillingSetupError,
  getPreferredRevenueCatPackage,
  getRevenueCatCustomerInfo,
  getRevenueCatManagementUrl,
  getRevenueCatOffering,
  isNativeBillingEnabled,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from "@/lib/revenuecat";

const isNativeApp = Capacitor.isNativePlatform();

export const useNativeBilling = () => {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(isNativeApp);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(getNativeBillingSetupError());

  const refresh = useCallback(async () => {
    if (!isNativeApp) {
      setIsLoading(false);
      return;
    }

    const setupError = getNativeBillingSetupError();
    if (setupError) {
      setError(setupError);
      setOffering(null);
      setCurrentPackage(null);
      setCustomerInfo(null);
      setIsLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(null);
      setOffering(null);
      setCurrentPackage(null);
      setCustomerInfo(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [nextCustomerInfo, nextOffering] = await Promise.all([
        getRevenueCatCustomerInfo(user),
        getRevenueCatOffering(user),
      ]);

      setCustomerInfo(nextCustomerInfo);
      setOffering(nextOffering);
      setCurrentPackage(getPreferredRevenueCatPackage(nextOffering));
    } catch (refreshError) {
      console.error("Failed to refresh native billing:", refreshError);
      setError("Não foi possível carregar os produtos da loja.");
      setOffering(null);
      setCurrentPackage(null);
      setCustomerInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let removeCustomerInfoListener: (() => Promise<void>) | null = null;

    const start = async () => {
      await refresh();

      removeCustomerInfoListener = await addRevenueCatCustomerInfoListener((nextCustomerInfo) => {
        if (!isMounted) return;
        setCustomerInfo(nextCustomerInfo);
      });
    };

    void start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        void refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (removeCustomerInfoListener) {
        void removeCustomerInfoListener();
      }
    };
  }, [refresh]);

  const purchaseCurrentPackage = useCallback(async () => {
    if (!currentPackage) {
      throw new Error("No package available");
    }

    setIsPurchasing(true);
    try {
      const result = await purchaseRevenueCatPackage(currentPackage);
      setCustomerInfo(result.customerInfo);
      return result;
    } finally {
      setIsPurchasing(false);
    }
  }, [currentPackage]);

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const result = await restoreRevenueCatPurchases();
      setCustomerInfo(result.customerInfo);
      return result;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const activeEntitlement = useMemo(
    () => getActiveRevenueCatEntitlement(customerInfo),
    [customerInfo],
  );

  return {
    isNativeBillingEnabled: isNativeBillingEnabled(),
    isReady: isNativeBillingEnabled() && !error,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    offering,
    currentPackage,
    customerInfo,
    activeEntitlement,
    managementUrl: getRevenueCatManagementUrl(customerInfo),
    refresh,
    purchaseCurrentPackage,
    restorePurchases,
  };
};
