import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PremiumGuard } from "@/components/PremiumGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/integrations/supabase/client";
import { ensureRevenueCatConfigured, isNativeBillingEnabled } from "@/lib/revenuecat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "@/i18n/language";

const Landing = lazy(() => import("./pages/Landing"));
const Crisis = lazy(() => import("./pages/Crisis"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const JournalNew = lazy(() => import("./pages/JournalNew"));
const Admin = lazy(() => import("./pages/Admin"));
const CalmSession = lazy(() => import("./pages/CalmSession"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Plans = lazy(() => import("./pages/Plans"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const StripeSetup = lazy(() => import("./pages/StripeSetup"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();
const isNativeApp = Capacitor.isNativePlatform();

const appAccessFeature = {
  pt: "o acesso ao app",
  en: "app access",
};

const App = () => {
  const { text } = useLanguage();

  useEffect(() => {
    if (!isNativeBillingEnabled()) return;

    const syncCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureRevenueCatConfigured(user);
      }
    };

    void syncCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void ensureRevenueCatConfigured(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center text-muted-foreground">
                {text({ pt: "Carregando...", en: "Loading..." })}
              </div>
            }
          >
            <Routes>
              <Route path="/" element={isNativeApp ? <Navigate to="/auth" replace /> : <Landing />} />
              <Route
                path="/crisis"
                element={
                  <AuthGuard>
                    <PremiumGuard feature={appAccessFeature}>
                      <Crisis />
                    </PremiumGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/calm-sessions"
                element={
                  <AuthGuard>
                    <PremiumGuard feature={appAccessFeature}>
                      <CalmSession />
                    </PremiumGuard>
                  </AuthGuard>
                }
              />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route
                path="/dashboard"
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                }
              />
              <Route
                path="/journal"
                element={
                  <AuthGuard>
                    <PremiumGuard feature={appAccessFeature}>
                      <JournalNew />
                    </PremiumGuard>
                  </AuthGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <AuthGuard>
                    <Admin />
                  </AuthGuard>
                }
              />
              <Route
                path="/reminders"
                element={
                  <AuthGuard>
                    <PremiumGuard feature={appAccessFeature}>
                      <Reminders />
                    </PremiumGuard>
                  </AuthGuard>
                }
              />
              <Route path="/plans" element={<Plans />} />
              <Route
                path="/admin-panel"
                element={
                  <AuthGuard>
                    <AdminPanel />
                  </AuthGuard>
                }
              />
              <Route
                path="/payment-success"
                element={
                  <AuthGuard>
                    <PaymentSuccess />
                  </AuthGuard>
                }
              />
              <Route path="/stripe-setup" element={<StripeSetup />} />
              <Route
                path="/settings"
                element={
                  <AuthGuard>
                    <PremiumGuard feature={appAccessFeature}>
                      <Settings />
                    </PremiumGuard>
                  </AuthGuard>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
