import { Capacitor } from "@capacitor/core";
import type { User } from "@supabase/supabase-js";
import {
  LOG_LEVEL,
  Purchases,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";

const isNativeApp = Capacitor.isNativePlatform();
const defaultEntitlementId = "premium";
const defaultOfferingId = "default";

let configuredUserId: string | null = null;
let configurePromise: Promise<boolean> | null = null;

const getPlatformApiKey = () => {
  switch (Capacitor.getPlatform()) {
    case "ios":
      return import.meta.env.VITE_REVENUECAT_APPLE_API_KEY?.trim();
    case "android":
      return import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY?.trim();
    default:
      return undefined;
  }
};

export const getRevenueCatEntitlementId = () =>
  import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID?.trim() || defaultEntitlementId;

export const getRevenueCatOfferingId = () =>
  import.meta.env.VITE_REVENUECAT_OFFERING_ID?.trim() || defaultOfferingId;

export const getNativeBillingSetupError = () => {
  if (!isNativeApp) return null;

  const platform = Capacitor.getPlatform();
  const apiKey = getPlatformApiKey();
  if (apiKey) return null;

  if (platform === "ios") {
    return "Defina VITE_REVENUECAT_APPLE_API_KEY para habilitar compras no iOS.";
  }

  if (platform === "android") {
    return "Defina VITE_REVENUECAT_GOOGLE_API_KEY para habilitar compras no Android.";
  }

  return "Chave pública do RevenueCat não configurada para esta plataforma.";
};

export const isNativeBillingEnabled = () => isNativeApp && !getNativeBillingSetupError();

const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

const syncSubscriberAttributes = async (user: User) => {
  const tasks: Promise<unknown>[] = [];

  if (user.email) {
    tasks.push(Purchases.setEmail({ email: user.email }));
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  if (fullName) {
    tasks.push(Purchases.setDisplayName({ displayName: fullName }));
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
};

export const ensureRevenueCatConfigured = async (user?: User | null) => {
  if (!isNativeBillingEnabled()) return false;

  const currentUser = user ?? (await getCurrentUser());
  if (!currentUser) return false;

  if (configurePromise && configuredUserId === currentUser.id) {
    return configurePromise;
  }

  configurePromise = (async () => {
    const apiKey = getPlatformApiKey();
    if (!apiKey) return false;

    try {
      const { isConfigured } = await Purchases.isConfigured();

      if (!isConfigured) {
        await Purchases.setLogLevel({
          level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO,
        });
        await Purchases.configure({
          apiKey,
          appUserID: currentUser.id,
        });
      } else {
        const { appUserID } = await Purchases.getAppUserID();
        if (appUserID !== currentUser.id) {
          await Purchases.logIn({ appUserID: currentUser.id });
        }
      }

      await syncSubscriberAttributes(currentUser);
      configuredUserId = currentUser.id;
      return true;
    } catch (error) {
      configuredUserId = null;
      console.error("RevenueCat configuration failed:", error);
      return false;
    }
  })();

  return configurePromise;
};

export const addRevenueCatCustomerInfoListener = async (
  listener: CustomerInfoUpdateListener,
) => {
  const user = await getCurrentUser();
  if (!(await ensureRevenueCatConfigured(user))) {
    return null;
  }

  const listenerId = await Purchases.addCustomerInfoUpdateListener(listener);
  return async () => {
    try {
      await Purchases.removeCustomerInfoUpdateListener({
        listenerToRemove: listenerId,
      });
    } catch (error) {
      console.error("Failed to remove RevenueCat listener:", error);
    }
  };
};

export const getRevenueCatCustomerInfo = async (user?: User | null) => {
  if (!(await ensureRevenueCatConfigured(user))) {
    return null;
  }

  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo;
};

const pickOffering = (offerings: PurchasesOfferings) => {
  const preferredOfferingId = getRevenueCatOfferingId();

  if (offerings.all[preferredOfferingId]) {
    return offerings.all[preferredOfferingId];
  }

  return offerings.current ?? Object.values(offerings.all)[0] ?? null;
};

export const getRevenueCatOffering = async (user?: User | null) => {
  if (!(await ensureRevenueCatConfigured(user))) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  return pickOffering(offerings);
};

export const getPreferredRevenueCatPackage = (offering: PurchasesOffering | null) => {
  if (!offering) return null;

  return (
    offering.monthly ??
    offering.annual ??
    offering.sixMonth ??
    offering.threeMonth ??
    offering.twoMonth ??
    offering.weekly ??
    offering.availablePackages[0] ??
    null
  );
};

export const purchaseRevenueCatPackage = async (aPackage: PurchasesPackage) => {
  if (!(await ensureRevenueCatConfigured())) {
    throw new Error("RevenueCat not configured");
  }

  return Purchases.purchasePackage({ aPackage });
};

export const restoreRevenueCatPurchases = async () => {
  if (!(await ensureRevenueCatConfigured())) {
    throw new Error("RevenueCat not configured");
  }

  return Purchases.restorePurchases();
};

export const getActiveRevenueCatEntitlement = (
  customerInfo: CustomerInfo | null | undefined,
): PurchasesEntitlementInfo | null => {
  if (!customerInfo) return null;

  const activeEntitlements = customerInfo.entitlements.active;
  const preferredEntitlement = activeEntitlements[getRevenueCatEntitlementId()];

  if (preferredEntitlement) {
    return preferredEntitlement;
  }

  return Object.values(activeEntitlements)[0] ?? null;
};

export const mapRevenueCatStatus = (
  entitlement: PurchasesEntitlementInfo | null,
): string | null => {
  if (!entitlement) return null;
  if (entitlement.isActive) {
    return entitlement.periodType === "TRIAL" ? "trialing" : "active";
  }
  if (entitlement.billingIssueDetectedAt) {
    return "past_due";
  }
  return "canceled";
};

export const getRevenueCatManagementUrl = (customerInfo: CustomerInfo | null | undefined) =>
  customerInfo?.managementURL ?? null;
