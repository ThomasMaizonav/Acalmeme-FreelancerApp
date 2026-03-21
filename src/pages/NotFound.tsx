import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/language";

const NotFound = () => {
  const navigate = useNavigate();
  const { text } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {text({ pt: "Página não encontrada", en: "Page not found" })}
        </p>
        <h1 className="text-3xl font-bold">
          {text({ pt: "Ops! Você se perdeu.", en: "Oops! You got lost." })}
        </h1>
        <p className="text-muted-foreground">
          {text({
            pt: "A página que você tentou acessar não existe ou foi movida.",
            en: "The page you tried to access does not exist or has been moved.",
          })}
        </p>
        <Button onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {text({ pt: "Voltar para o dashboard", en: "Back to dashboard" })}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
