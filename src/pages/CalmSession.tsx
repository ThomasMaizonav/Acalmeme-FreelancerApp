import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, VolumeX, Play, Pause, Clock } from "lucide-react";

const DURATIONS = [
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

const RELAXING_MUSIC_URL =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3?filename=ambient-piano-ampamp-strings-10711.mp3";

const CalmSession = () => {
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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
    if (soundEnabled && sessionStarted && !isPaused && audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [soundEnabled, sessionStarted, isPaused]);

  useEffect(() => {
    if (!sessionStarted || isPaused || timeRemaining <= 0) return;

    const timer = setTimeout(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sessionStarted, isPaused, timeRemaining]);

  useEffect(() => {
    if (sessionStarted && timeRemaining === 0 && audioRef.current) {
      audioRef.current.pause();
    }
  }, [sessionStarted, timeRemaining]);

  const startSession = (seconds: number) => {
    setSelectedDuration(seconds);
    setTimeRemaining(seconds);
    setSessionStarted(true);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setSelectedDuration(null);
    setTimeRemaining(0);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-secondary/10 flex flex-col">
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
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Escolha a duração</h2>
            <p className="text-muted-foreground mb-6">
              Respire com calma e escolha quanto tempo deseja meditar.
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
              {soundEnabled ? "🎵 Música leve ativada" : "🔇 Música desativada"}
            </p>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center px-6">
            <Card className="w-full max-w-md p-6 sm:p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedDuration ? `Sessão de ${Math.floor(selectedDuration / 60)} min` : "Sessão"}
              </p>
              <div className="text-4xl font-bold mb-4">{formatTime(timeRemaining)}</div>
              <p className="text-sm text-muted-foreground">
                Inspire pelo nariz, segure um instante e solte devagar pela boca.
              </p>
            </Card>
          </div>

          <div className="p-6 sm:p-8">
            {timeRemaining > 0 ? (
              <div className="text-center">
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
                  <Button variant="ghost" size="lg" onClick={resetSession}>
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
                  Reserve um momento para sentir a tranquilidade.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="default" onClick={() => navigate(-1)}>
                    Voltar
                  </Button>
                  <Button variant="outline" onClick={resetSession}>
                    Nova sessão
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CalmSession;
