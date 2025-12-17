import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: "medication" | "water" | "exercise" | "custom";
  scheduled_time: string;
  days_of_week: string[];
  is_active: boolean;
  sound_url: string | null;
}

interface EditReminderDialogProps {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const DAYS_MAP = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom"
};

const NOTIFICATION_SOUNDS = [
  { value: "default", label: "Som padrão" },
  { value: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", label: "Sino suave" },
  { value: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3", label: "Notificação alegre" },
  { value: "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3", label: "Alerta calmo" },
];

export const EditReminderDialog = ({ reminder, open, onOpenChange, onUpdate }: EditReminderDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: reminder?.title || "",
    description: reminder?.description || "",
    reminder_type: reminder?.reminder_type || "custom",
    scheduled_time: reminder?.scheduled_time || "08:00",
    days_of_week: reminder?.days_of_week || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    sound_url: reminder?.sound_url || "default",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminder) return;

    const { error } = await supabase
      .from("reminders")
      .update({
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type,
        scheduled_time: formData.scheduled_time,
        days_of_week: formData.days_of_week,
        sound_url: formData.sound_url === "default" ? null : formData.sound_url,
      })
      .eq("id", reminder.id);

    if (error) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lembrete atualizado!",
      });
      onOpenChange(false);
      onUpdate();
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
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
            <Label htmlFor="edit-time">Horário</Label>
            <Input
              id="edit-time"
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-sound">Som de notificação</Label>
            <Select
              value={formData.sound_url}
              onValueChange={(value) => setFormData({ ...formData, sound_url: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_SOUNDS.map(sound => (
                  <SelectItem key={sound.value} value={sound.value}>
                    {sound.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(DAYS_MAP).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={formData.days_of_week.includes(key) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(key)}
                >
                  {label}
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
