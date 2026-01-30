import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: "medication" | "water" | "exercise" | "custom";
  days_of_week: number[];
  is_active: boolean;
  reminder_times?: { id: string; scheduled_time: string; is_active?: boolean }[];
}

interface EditReminderDialogProps {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const EditReminderDialog = ({ reminder, open, onOpenChange, onUpdate }: EditReminderDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: reminder?.title || "",
    description: reminder?.description || "",
    reminder_type: reminder?.reminder_type || "custom",
    scheduled_times: reminder?.reminder_times?.map((time) => time.scheduled_time) || [],
    days_of_week: reminder?.days_of_week || [0, 1, 2, 3, 4, 5, 6],
  });
  const [timeDraft, setTimeDraft] = useState("08:00");

  const normalizeTimeValue = (value: string) => value.trim().slice(0, 5);

  const toUniqueSortedTimes = (times: string[]) =>
    Array.from(new Set(times.map(normalizeTimeValue).filter(Boolean))).sort();

  const addTimeValue = (value: string) => {
    const normalized = normalizeTimeValue(value);
    if (!normalized) return;
    setFormData(prev => ({
      ...prev,
      scheduled_times: toUniqueSortedTimes([...prev.scheduled_times, normalized]),
    }));
  };

  const removeTimeValue = (value: string) => {
    const normalized = normalizeTimeValue(value);
    setFormData(prev => ({
      ...prev,
      scheduled_times: toUniqueSortedTimes(prev.scheduled_times).filter((time) => time !== normalized),
    }));
  };

  const sortedTimes = toUniqueSortedTimes(formData.scheduled_times);

  useEffect(() => {
    if (!reminder || !open) return;
    const days = (reminder.days_of_week ?? [])
      .map((day) => Number(day))
      .filter((value) => Number.isFinite(value));

    const times =
      reminder.reminder_times
        ?.filter((time) => time.is_active ?? true)
        .map((time) => time.scheduled_time.slice(0, 5)) || [];
    const normalizedTimes = toUniqueSortedTimes(times);

    setFormData({
      title: reminder.title || "",
      description: reminder.description || "",
      reminder_type: reminder.reminder_type || "custom",
      scheduled_times: normalizedTimes,
      days_of_week: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
    });
    setTimeDraft(normalizedTimes[0] ?? "08:00");
  }, [reminder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminder) return;

    if (formData.days_of_week.length === 0) {
      toast({
        title: "Selecione ao menos um dia",
        description: "Escolha os dias da semana para receber o lembrete.",
        variant: "destructive",
      });
      return;
    }

    const uniqueTimes = toUniqueSortedTimes(formData.scheduled_times);
    const draftTime = normalizeTimeValue(timeDraft);
    const resolvedTimes = toUniqueSortedTimes(
      [...uniqueTimes, draftTime].filter(Boolean),
    );

    if (resolvedTimes.length === 0) {
      toast({
        title: "Defina pelo menos um horário",
        description: "Adicione um horário para salvar o lembrete.",
        variant: "destructive",
      });
      return;
    }

    const days = (formData.days_of_week ?? [])
      .map((day) => Number(day))
      .filter((value) => Number.isFinite(value));

    const { error } = await supabase
      .from("reminders")
      .update({
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type,
        days_of_week: days,
      })
      .eq("id", reminder.id);

    if (error) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await supabase
        .from("reminder_times")
        .delete()
        .eq("reminder_id", reminder.id);

      const { error: timesError } = await supabase
        .from("reminder_times")
      .insert(
          resolvedTimes.map((time) => ({
            reminder_id: reminder.id,
            scheduled_time: time,
            is_active: true,
          }))
        );

      if (timesError) {
        toast({
          title: "Erro ao salvar horários",
          description: timesError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lembrete atualizado!",
      });
      onOpenChange(false);
      onUpdate();
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  if (!reminder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lembrete</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="edit-type">Tipo</Label>
            <Select
              value={formData.reminder_type}
              onValueChange={(value: "medication" | "water" | "exercise" | "custom") => 
                setFormData({ ...formData, reminder_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medication">Medicamento</SelectItem>
                <SelectItem value="water">Água</SelectItem>
                <SelectItem value="exercise">Exercício</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Horários</Label>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Horários selecionados</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {sortedTimes.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Nenhum horário selecionado.
                  </span>
                ) : (
                  sortedTimes.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeTimeValue(time)}
                      className="gap-1"
                      aria-label={`Remover horário ${time}`}
                    >
                      {time}
                      <X className="h-3 w-3" />
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <Label htmlFor="edit-custom-time" className="text-xs text-muted-foreground">
                  Adicionar horário personalizado
                </Label>
                <Input
                  id="edit-custom-time"
                  type="time"
                  value={timeDraft}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  step={300}
                  className="sm:max-w-[160px]"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => addTimeValue(timeDraft)}
              >
                Adicionar horário
              </Button>
            </div>
          </div>

          <div>
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                  className={
                    formData.days_of_week.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "bg-white text-foreground border-border hover:bg-white/90"
                  }
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
