import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Landing = lazy(() => import("./pages/Landing"));
const Crisis = lazy(() => import("./pages/Crisis"));
const Auth = lazy(() => import("./pages/Auth"));
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
            <Route path="/crisis" element={<Crisis />} />
            <Route path="/calm-sessions" element={<CalmSession />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/journal" element={<JournalNew />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/stripe-setup" element={<StripeSetup />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
