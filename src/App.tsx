import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PremiumGuard } from "@/components/PremiumGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/crisis"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <Crisis />
                </PremiumGuard>
              }
            />
            <Route
              path="/calm-sessions"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <CalmSession />
                </PremiumGuard>
              }
            />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/dashboard"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <Dashboard />
                </PremiumGuard>
              }
            />
            <Route
              path="/journal"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <JournalNew />
                </PremiumGuard>
              }
            />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="/reminders"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <Reminders />
                </PremiumGuard>
              }
            />
            <Route path="/plans" element={<Plans />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/stripe-setup" element={<StripeSetup />} />
            <Route
              path="/settings"
              element={
                <PremiumGuard feature="o acesso ao app">
                  <Settings />
                </PremiumGuard>
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

export default App;
