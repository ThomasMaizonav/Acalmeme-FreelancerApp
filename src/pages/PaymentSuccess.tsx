import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/i18n/language";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();
  const [secondsLeft, setSecondsLeft] = useState(3);
  const { text } = useLanguage();

  // Keep subscription status fresh while user is being redirected.
  useEffect(() => {
    refreshSubscription();
    const interval = setInterval(() => {
      refreshSubscription();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshSubscription]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const timeout = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [secondsLeft, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center px-6 text-center">
      <p className="text-xl sm:text-2xl font-semibold">
        {text({
          pt: `Você está sendo redirecionado para a página principal em ${Math.max(
            secondsLeft,
            0,
          )}...`,
          en: `You are being redirected to the main page in ${Math.max(secondsLeft, 0)}...`,
        })}
      </p>
    </div>
  );
};

export default PaymentSuccess;
