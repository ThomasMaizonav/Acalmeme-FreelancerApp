import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, VolumeX, Play, Pause, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import { PremiumGuard } from "@/components/PremiumGuard";

const DURATIONS = [
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

// Very calm ambient pad/keyboard music URL (royalty-free)
const RELAXING_MUSIC_URL = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3?filename=ambient-piano-ampamp-strings-10711.mp3";

const Crisis = () => {
  const navigate = useNavigate();
  const { updateProgress } = useUserProgress();
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [message, setMessage] = useState("Inspire profundamente...");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);
  const [progressUpdated, setProgressUpdated] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio(RELAXING_MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!progressUpdated && sessionStarted) {
      updateProgress();
      setProgressUpdated(true);
    }
  }, [updateProgress, progressUpdated, sessionStarted]);

  useEffect(() => {
    if (!sessionStarted || isPaused) return;

    const phases = [
      { name: "inhale" as const, duration: 4000, message: "Inspire profundamente..." },
      { name: "hold" as const, duration: 4000, message: "Segure o ar..." },
      { name: "exhale" as const, duration: 6000, message: "Solte lentamente..." },
    ];

    let currentPhaseIndex = 0;
    let phaseTimer: NodeJS.Timeout;

    const cyclePhases = () => {
      const currentPhase = phases[currentPhaseIndex];
      setPhase(currentPhase.name);
      setMessage(currentPhase.message);

      phaseTimer = setTimeout(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        
        if (currentPhaseIndex === 0) {
          setCycleCount(prev => prev + 1);
        }
        
        cyclePhases();
      }, currentPhase.duration);
    };

    cyclePhases();

    return () => clearTimeout(phaseTimer);
  }, [sessionStarted, isPaused]);

  useEffect(() => {
    if (sessionStarted && !isPaused && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && sessionStarted) {
      // Session ended
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [sessionStarted, isPaused, timeRemaining]);

  useEffect(() => {
    if (soundEnabled && sessionStarted && !isPaused && audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [soundEnabled, sessionStarted, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (seconds: number) => {
    setSelectedDuration(seconds);
    setTimeRemaining(seconds);
    setSessionStarted(true);
    setCycleCount(0);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setSelectedDuration(null);
    setTimeRemaining(0);
    setCycleCount(0);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const motivationalMessages = [
    "Você está seguro agora.",
    "Respire comigo.",
    "Vai passar.",
    "Você está fazendo muito bem.",
    "Um momento de cada vez.",
  ];

  return (
    <PremiumGuard feature="as Sessões de Calma">
      <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-secondary/10 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Sessão de Calma</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-full"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>

        {!sessionStarted ? (
          // Duration selection screen
          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Escolha a duração</h2>
              <p className="text-muted-foreground mb-6">
                Quanto tempo você precisa para se acalmar?
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {DURATIONS.map((duration) => (
                  <Button
                    key={duration.seconds}
                    variant="outline"
                    size="lg"
                    className="h-16 text-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={() => startSession(duration.seconds)}
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                {soundEnabled ? "🎵 Música relaxante ativada" : "🔇 Música desativada"}
              </p>
            </Card>
          </div>
        ) : (
          <>
            {/* Main breathing circle */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="relative">
                {/* Outer glow */}
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-hero blur-3xl transition-all duration-[4000ms] ${
                    phase === "inhale" || phase === "hold"
                      ? "scale-150 opacity-40"
                      : "scale-100 opacity-20"
                  }`}
                />

                {/* Main breathing circle */}
                <div
                  className={`breathe-circle w-56 h-56 md:w-72 md:h-72 bg-gradient-hero flex items-center justify-center relative z-10 shadow-calm ${
                    phase === "inhale"
                      ? "breathe-in"
                      : phase === "hold"
                      ? "breathe-hold"
                      : "breathe-out"
                  }`}
                  style={{ transition: isPaused ? "none" : undefined }}
                >
                  <div className="text-center text-white px-4">
                    {!isPaused ? (
                      <>
                        <p className="text-lg md:text-xl font-medium mb-2">{message}</p>
                        <p className="text-3xl md:text-4xl font-bold">{formatTime(timeRemaining)}</p>
                        <p className="text-sm opacity-80 mt-2">Ciclo {cycleCount + 1}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-medium mb-2">Pausado</p>
                        <p className="text-3xl font-bold">{formatTime(timeRemaining)}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls and messages */}
            <div className="p-6 sm:p-8">
              {timeRemaining > 0 ? (
                <div className="text-center">
                  <p className="text-lg md:text-xl text-foreground/80 mb-6 animate-calm-pulse">
                    {motivationalMessages[cycleCount % motivationalMessages.length]}
                  </p>
                  
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={togglePause}
                      className="gap-2"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-5 h-5" />
                          Continuar
                        </>
                      ) : (
                        <>
                          <Pause className="w-5 h-5" />
                          Pausar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={resetSession}
                    >
                      Encerrar
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="p-6 rounded-2xl max-w-md mx-auto text-center">
                  <p className="text-lg font-medium mb-4">
                    🎉 Parabéns! Você completou a sessão.
                  </p>
                  <p className="text-muted-foreground mb-6">
                    Você fez {cycleCount} ciclos de respiração.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="default" 
                      onClick={() => navigate("/dashboard")}
                    >
                      Voltar ao início
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetSession}
                    >
                      Nova sessão
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </PremiumGuard>
  );
};

export default Crisis;
