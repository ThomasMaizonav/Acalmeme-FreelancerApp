import { Star, Award, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RewardsDisplayProps {
  currentStreak: number;
}

export const RewardsDisplay = ({ currentStreak }: RewardsDisplayProps) => {
  // Calculate rewards based on streak
  const stars = Math.min(currentStreak, 6);
  const medals = currentStreak >= 7 ? Math.floor(currentStreak / 7) : 0;
  const hasCrown = currentStreak >= 30;

  return (
    <Card className="p-6 glass shadow-soft">
      <h3 className="text-xl font-semibold mb-4 text-center">Suas Recompensas</h3>
      
      <div className="space-y-6">
        {/* Current Streak */}
        <div className="text-center">
          <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-1">
            {currentStreak}
          </div>
          <p className="text-sm text-muted-foreground">dias consecutivos</p>
        </div>

        {/* Stars (1-6 days) */}
        {currentStreak > 0 && currentStreak < 7 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Estrelas Conquistadas</p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: stars }).map((_, i) => (
                <Star
                  key={i}
                  className="w-8 h-8 text-secondary fill-secondary animate-calm-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
              {Array.from({ length: 6 - stars }).map((_, i) => (
                <Star
                  key={`empty-${i}`}
                  className="w-8 h-8 text-muted-foreground/30"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {7 - currentStreak} {7 - currentStreak === 1 ? 'dia' : 'dias'} para ganhar uma medalha
            </p>
          </div>
        )}

        {/* Medals (7+ days) */}
        {medals > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Medalhas Conquistadas</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {Array.from({ length: Math.min(medals, 4) }).map((_, i) => (
                <Award
                  key={i}
                  className="w-10 h-10 text-accent fill-accent animate-calm-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            {medals > 1 && (
              <p className="text-sm font-semibold text-accent mt-2">
                × {medals} {medals === 1 ? 'medalha' : 'medalhas'}
              </p>
            )}
            {!hasCrown && (
              <p className="text-xs text-muted-foreground mt-2">
                {30 - currentStreak} {30 - currentStreak === 1 ? 'dia' : 'dias'} para ganhar a coroa
              </p>
            )}
          </div>
        )}

        {/* Crown (30+ days) */}
        {hasCrown && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Conquista Máxima</p>
            <div className="flex justify-center">
              <Crown className="w-16 h-16 text-primary fill-primary animate-calm-pulse" />
            </div>
            <p className="text-lg font-bold bg-gradient-hero bg-clip-text text-transparent mt-2">
              Mestre da Calma
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              30 dias de prática consecutiva!
            </p>
          </div>
        )}

        {/* Motivational message */}
        {currentStreak === 0 ? (
          <p className="text-sm text-center text-muted-foreground italic">
            Complete uma atividade hoje para começar sua sequência ✨
          </p>
        ) : (
          <p className="text-sm text-center text-muted-foreground italic">
            Continue assim! Cada dia conta 💙
          </p>
        )}
      </div>
    </Card>
  );
};
