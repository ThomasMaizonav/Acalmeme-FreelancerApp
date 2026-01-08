import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Pagina nao encontrada
        </p>
        <h1 className="text-3xl font-bold">Ops! Voce se perdeu.</h1>
        <p className="text-muted-foreground">
          A pagina que voce tentou acessar nao existe ou foi movida.
        </p>
        <Button onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
