import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/language";

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const { text } = useLanguage();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const handleSession = (hasSession: boolean) => {
      if (!active) return;
      if (!hasSession) {
        navigate("/auth");
        return;
      }
      setChecking(false);
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(!!session);
    };

    checkSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(!!session);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          {text({ pt: "Carregando...", en: "Loading..." })}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
