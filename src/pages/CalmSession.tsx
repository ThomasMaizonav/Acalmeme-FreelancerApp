import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Volume2, VolumeX, Play, Pause, Clock } from "lucide-react";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useLanguage } from "@/i18n/language";

const DURATIONS = [
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

const RELAXING_MUSIC_URL = "/meditationMusic.mp3";

const CalmSession = () => {
  const navigate = useNavigate();
  const { updateProgress } = useUserProgress();
  const { text } = useLanguage();
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
    updateProgress();
  }, [updateProgress]);

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
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
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
        <h1 className="text-lg font-semibold">{text({ pt: "Sessão de Calma", en: "Calm Session" })}</h1>
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
            <h2 className="text-2xl font-bold mb-2">{text({ pt: "Escolha a duração", en: "Choose the duration" })}</h2>
            <p className="text-muted-foreground mb-6">
              {text({ pt: "Respire com calma e escolha quanto tempo deseja meditar.", en: "Breathe calmly and choose how long you want to meditate." })}
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
              {soundEnabled
                ? text({ pt: "🎵 Música leve ativada", en: "🎵 Soft music enabled" })
                : text({ pt: "🔇 Música desativada", en: "🔇 Music disabled" })}
            </p>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center px-6">
            <Card className="w-full max-w-md p-6 sm:p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedDuration
                  ? text({
                      pt: `Sessão de ${Math.floor(selectedDuration / 60)} min`,
                      en: `${Math.floor(selectedDuration / 60)} min session`,
                    })
                  : text({ pt: "Sessão", en: "Session" })}
              </p>
              <div className="text-4xl font-bold mb-4">{formatTime(timeRemaining)}</div>
              <p className="text-sm text-muted-foreground">
                {text({
                  pt: "Inspire pelo nariz, segure um instante e solte devagar pela boca.",
                  en: "Inhale through your nose, hold for a moment, and exhale slowly through your mouth.",
                })}
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
                        {text({ pt: "Continuar", en: "Resume" })}
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5" />
                        {text({ pt: "Pausar", en: "Pause" })}
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="lg" onClick={resetSession}>
                    {text({ pt: "Encerrar", en: "End" })}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="p-6 rounded-2xl max-w-md mx-auto text-center">
                <p className="text-lg font-medium mb-4">
                  {text({ pt: "🎉 Parabéns! Você completou a sessão.", en: "🎉 Congratulations! You completed the session." })}
                </p>
                <p className="text-muted-foreground mb-6">
                  {text({ pt: "Reserve um momento para sentir a tranquilidade.", en: "Take a moment to feel the calm." })}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="default" onClick={() => navigate(-1)}>
                    {text({ pt: "Voltar", en: "Back" })}
                  </Button>
                  <Button variant="outline" onClick={resetSession}>
                    {text({ pt: "Nova sessão", en: "New session" })}
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
