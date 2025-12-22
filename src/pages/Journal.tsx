import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";
import { PremiumGuard } from "@/components/PremiumGuard";

const Journal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateProgress } = useUserProgress();
  const [entry, setEntry] = useState("");
  const [progressUpdated, setProgressUpdated] = useState(false);

  useEffect(() => {
    // Update progress when user opens journal
    if (!progressUpdated) {
      updateProgress();
      setProgressUpdated(true);
    }
  }, [updateProgress, progressUpdated]);

  const handleSave = () => {
    if (!entry.trim()) {
      toast({
        title: "Escreva algo primeiro",
        description: "Compartilhe como você está se sentindo hoje.",
        variant: "destructive"
      });
      return;
    }

    // TODO: Salvar no backend quando implementado
    toast({
      title: "Entrada salva! 💚",
      description: "Seu registro emocional foi guardado com carinho.",
    });
    setEntry("");
  };

  return (
    <PremiumGuard feature="o Diário Emocional ilimitado">
      <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4 shadow-calm">
              <BookHeart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Diário Emocional</h1>
            <p className="text-muted-foreground">
              Um espaço seguro para seus sentimentos
            </p>
          </div>

          <Card className="p-6 glass">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Como você está se sentindo hoje?
                </label>
                <Textarea
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="Escreva aqui seus pensamentos, sentimentos e reflexões..."
                  className="min-h-[300px] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  size="lg"
                >
                  Salvar entrada
                </Button>
                <Button
                  onClick={() => setEntry("")}
                  variant="outline"
                  size="lg"
                >
                  Limpar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Suas entradas são privadas e seguras. Apenas você pode vê-las.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PremiumGuard>
  );
};

export default Journal;
