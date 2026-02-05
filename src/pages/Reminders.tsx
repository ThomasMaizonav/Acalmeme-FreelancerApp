import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type Weekday } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Plus, Trash2, Edit, Mail, Pill, Droplets, Dumbbell, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EditReminderDialog } from "@/components/EditReminderDialog";
import { useUserProgress } from "@/hooks/useUserProgress";

interface ReminderTime {
  id: string;
  scheduled_time: string;
  is_active: boolean;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: "medication" | "water" | "exercise" | "custom";
  days_of_week: number[];
  is_active: boolean;
  send_email: boolean;
  email: string | null;
  send_push?: boolean | null;
  timezone?: string | null;
  last_sent_at?: string | null;
  reminder_times?: ReminderTime[];
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

const BRAZIL_TIMEZONE = "America/Sao_Paulo";
const BRAZIL_TIMEZONE_LABEL = "Horário de Brasília (America/Sao_Paulo)";
const scheduledTimeouts: number[] = [];
const LOCAL_NOTIFICATION_ID_BASE = 400_000_000;
const LOCAL_NOTIFICATION_ID_RANGE = 100_000_000;

const clearScheduledNotifications = () => {
  scheduledTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  scheduledTimeouts.length = 0;
};

const normalizePermission = (value?: string): NotificationPermission => {
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";
  return "default";
};

const parseTime = (value: string) => {
  const [hour, minute] = value.split(":").map((item) => Number(item));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const toWeekday = (day: number) => day + 1;

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const makeLocalNotificationId = (reminderId: string, weekday: number, time: string) =>
  LOCAL_NOTIFICATION_ID_BASE + (hashString(`${reminderId}:${weekday}:${time}`) % LOCAL_NOTIFICATION_ID_RANGE);

const Reminders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateProgress } = useUserProgress();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteReminderTarget, setDeleteReminderTarget] = useState<Reminder | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [timeDraft, setTimeDraft] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminder_type: "custom",
    scheduled_times: [],
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    send_email: false,
    send_push: true,
  });

  const normalizeDays = (days?: Array<number | string> | null) =>
    (days ?? []).map((day) => Number(day)).filter((value) => Number.isFinite(value));

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
    checkAuth();
    loadReminders();
    void checkNotificationPermission();
  }, []);

  useEffect(() => {
    updateProgress();
  }, [updateProgress]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setFormData(prev => ({
        ...prev,
        send_email: prev.send_email,
      }));
    }
  };

  const checkNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.checkPermissions();
      setNotificationPermission(normalizePermission(permission.display));
      return;
    }

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.requestPermissions();
      const normalized = normalizePermission(permission.display);
      setNotificationPermission(normalized);

      if (normalized === "granted") {
        await scheduleNotifications(reminders);
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes nos horários configurados.",
        });
      }
      return;
    }

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        await scheduleNotifications(reminders);
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes nos horários configurados.",
        });
      }
    }
  };

  const loadReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("reminders")
      .select(`
        id, title, description, reminder_type, days_of_week, is_active, send_email, send_push, email, timezone, created_at, updated_at, user_id,
        reminder_times (id, scheduled_time, is_active, created_at)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar lembretes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const normalized = (data ?? []).map((reminder) => ({
        ...reminder,
        days_of_week: normalizeDays(reminder.days_of_week),
        reminder_times: reminder.reminder_times ?? [],
      }));
      setReminders((normalized as Reminder[]) || []);
      void scheduleNotifications((normalized as Reminder[]) || []);
    }
  };


  const getNextReminderDate = (daysOfWeek: number[], scheduledTime: string) => {
    if (!daysOfWeek || daysOfWeek.length === 0) return null;

    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const now = new Date();

    for (let offset = 0; offset <= 7; offset += 1) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(hours, minutes, 0, 0);

      if (!daysOfWeek.includes(candidate.getDay())) continue;
      if (candidate <= now) continue;

      return candidate;
    }

    return null;
  };

  const scheduleNextReminder = (reminder: Reminder, time: ReminderTime) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!reminder.is_active) return;
    if (reminder.send_push === false) return;
    if (!(time.is_active ?? true)) return;

    const nextDate = getNextReminderDate(reminder.days_of_week, time.scheduled_time);
    if (!nextDate) return;

    const timeout = nextDate.getTime() - Date.now();
    const timeoutId = window.setTimeout(() => {
      new Notification(reminder.title, {
        body: reminder.description || "Hora do seu lembrete!",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: true,
      });

      const index = scheduledTimeouts.indexOf(timeoutId);
      if (index >= 0) {
        scheduledTimeouts.splice(index, 1);
      }

      scheduleNextReminder(reminder, time);
    }, timeout);

    scheduledTimeouts.push(timeoutId);
  };

  const scheduleNotifications = async (reminders: Reminder[]) => {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.checkPermissions();
      if (normalizePermission(permission.display) !== "granted") return;

      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications
        .map((notification) => notification.id)
        .filter(
          (id): id is number =>
            typeof id === "number" &&
            id >= LOCAL_NOTIFICATION_ID_BASE &&
            id < LOCAL_NOTIFICATION_ID_BASE + LOCAL_NOTIFICATION_ID_RANGE
        )
        .map((id) => ({ id }));

      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }

      const notifications = [];
      const usedIds = new Set<number>();

      reminders.forEach((reminder) => {
        if (!reminder.is_active) return;
        if (reminder.send_push === false) return;

        const days = normalizeDays(reminder.days_of_week);
        if (days.length === 0) return;

        reminder.reminder_times?.forEach((time) => {
          if (!(time.is_active ?? true)) return;
          const parsed = parseTime(time.scheduled_time);
          if (!parsed) return;

          days.forEach((day) => {
            const weekday = toWeekday(day) as Weekday;
            const id = makeLocalNotificationId(reminder.id, weekday, time.scheduled_time);
            if (usedIds.has(id)) return;
            usedIds.add(id);

            notifications.push({
              id,
              title: reminder.title || "Lembrete",
              body: reminder.description || "Hora do seu lembrete!",
              schedule: {
                on: {
                  weekday,
                  hour: parsed.hour,
                  minute: parsed.minute,
                  second: 0,
                },
                allowWhileIdle: true,
              },
              extra: {
                reminderId: reminder.id,
                reminderTimeId: time.id,
                source: "reminders",
              },
            });
          });
        });
      });

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
      return;
    }

    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    clearScheduledNotifications();
    reminders.forEach(reminder => {
      if (reminder.send_push === false) return;
      reminder.reminder_times?.forEach(time => scheduleNextReminder(reminder, time));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    const resolvedTimes = toUniqueSortedTimes([...uniqueTimes, draftTime].filter(Boolean));

    if (resolvedTimes.length === 0) {
      toast({
        title: "Defina pelo menos um horário",
        description: "É obrigatório escolher ao menos um horário.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.send_email && !formData.send_push) {
      toast({
        title: "Ative ao menos uma notificação",
        description: "Escolha receber no celular e/ou por e-mail.",
        variant: "destructive",
      });
      return;
    }

    const { error: timezoneError } = await supabase
      .from("profiles")
      .update({ timezone: BRAZIL_TIMEZONE })
      .eq("id", user.id);

    if (timezoneError) {
      console.warn("Erro ao salvar timezone do usuário:", timezoneError);
    }

    const { data: reminder, error: reminderError } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type as "medication" | "water" | "exercise" | "custom",
        days_of_week: formData.days_of_week.map(d => Number(d)),
        send_email: formData.send_email,
        send_push: formData.send_push,
        email: formData.send_email ? user.email : null,
        timezone: BRAZIL_TIMEZONE,
      })
      .select("id")
      .single();

    if (reminderError || !reminder) {
      toast({
        title: "Erro ao criar lembrete",
        description: reminderError?.message || "Não foi possível salvar o lembrete.",
        variant: "destructive",
      });
      return;
    }

    const timesPayload = resolvedTimes.map(time => ({
      reminder_id: reminder.id,
      scheduled_time: time,
      is_active: true,
    }));

    const { error: timesError } = await supabase
      .from("reminder_times")
      .insert(timesPayload);

    if (timesError) {
      toast({
        title: "Erro ao salvar horários",
        description: timesError.message,
        variant: "destructive",
      });
    } else {
      const channelDescription = formData.send_push && formData.send_email
        ? "Você receberá uma notificação e um e-mail nesse horário."
        : formData.send_push
          ? "Você receberá uma notificação nesse horário."
          : formData.send_email
            ? "Você receberá um e-mail nesse horário."
            : "Seu lembrete foi configurado com sucesso.";

      toast({
        title: "Lembrete criado",
        description: channelDescription,
      });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        reminder_type: "custom",
        scheduled_times: [],
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        send_email: false,
        send_push: true,
      });
      setTimeDraft("");
      loadReminders();
    }
  };

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("reminders")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      loadReminders();
    }
  };

  const deleteReminder = async (id: string) => {
    const { error: logsError } = await supabase
      .from("reminder_logs")
      .delete()
      .eq("reminder_id", id);

    const { error: timesError } = await supabase
      .from("reminder_times")
      .delete()
      .eq("reminder_id", id);

    if (timesError) {
      toast({
        title: "Erro ao deletar horários",
        description: timesError.message,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar lembrete",
        description: logsError ? `${error.message} (${logsError.message})` : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lembrete removido",
      });
      loadReminders();
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

  const setDaysPreset = (days: number[]) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: days,
    }));
  };

  // Pequenos templates pra facilitar a criação dos lembretes
  const applyTemplate = (type: "medication" | "water" | "exercise") => {
    if (type === "medication") {
      setFormData(prev => ({
        ...prev,
        title: "Tomar remédio",
        description: "Lembrete para tomar o medicamento no horário correto.",
        reminder_type: "medication",
      }));
    }
    if (type === "water") {
      setFormData(prev => ({
        ...prev,
        title: "Beber água",
        description: "Faça uma pausa rápida para se hidratar.",
        reminder_type: "water",
      }));
    }
    if (type === "exercise") {
      setFormData(prev => ({
        ...prev,
        title: "Movimentar o corpo",
        description: "Faça um alongamento ou caminhada rápida.",
        reminder_type: "exercise",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Lembretes e Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationPermission !== "granted" && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-sm mb-4">
                    Ative as notificações para receber lembretes nos horários configurados.
                  </p>
                  <Button onClick={requestNotificationPermission}>
                    <Bell className="mr-2 h-4 w-4" />
                    Ativar Notificações
                  </Button>
                </CardContent>
              </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lembrete
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full max-h-[92vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lembrete</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-2"
                >
                  {/* templates */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applyTemplate("medication")}
                    >
                      <Pill className="h-4 w-4 mr-1" /> Medicamento
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applyTemplate("water")}
                    >
                      <Droplets className="h-4 w-4 mr-1" /> Água
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applyTemplate("exercise")}
                    >
                      <Dumbbell className="h-4 w-4 mr-1" /> Exercício
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Tomar remédio"
                      required
                    />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={formData.reminder_type}
                        onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
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
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detalhes adicionais..."
                    />
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
                        <Label htmlFor="custom-time" className="text-xs text-muted-foreground">
                          Adicionar horário personalizado
                        </Label>
                        <Input
                          id="custom-time"
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
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar horário
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Para um único horário, basta escolher acima e salvar.
                    </p>
                  </div>

                  <div>
                    <Label>Dias da semana</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDaysPreset([0, 1, 2, 3, 4, 5, 6])
                        }
                      >
                        Todos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDaysPreset([1, 2, 3, 4, 5])}
                      >
                        Dias úteis
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDaysPreset([0, 6])}
                      >
                        Fim de semana
                      </Button>
                    </div>
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
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.days_of_week.length > 0
                        ? `Selecionados: ${formData.days_of_week
                            .map(day => DAYS.find(item => item.value === day)?.label)
                            .filter(Boolean)
                            .join(", ")}`
                        : "Nenhum dia selecionado."}
                    </p>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="send_push" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notificação no celular
                      </Label>
                      <Switch
                        id="send_push"
                        checked={formData.send_push}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, send_push: checked }))
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receba alertas no app mesmo com a tela bloqueada.
                    </p>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="send_email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Enviar também por e-mail
                      </Label>
                      <Switch
                        id="send_email"
                        checked={formData.send_email}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, send_email: checked }))
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O envio será feito para o e-mail da sua conta.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Horários baseados em {BRAZIL_TIMEZONE_LABEL}.
                  </p>

                  <div className="sticky bottom-0 bg-background pt-3 pb-1">
                    <Button type="submit" className="w-full">
                      Criar Lembrete
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="space-y-3">
              {reminders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lembrete configurado ainda.
                </p>
              ) : (
                reminders.map((reminder) => (
                  <Card key={reminder.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{reminder.title}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10">
                              {reminder.reminder_type === "medication" && "Medicamento"}
                              {reminder.reminder_type === "water" && "Água"}
                              {reminder.reminder_type === "exercise" && "Exercício"}
                              {reminder.reminder_type === "custom" && "Personalizado"}
                            </span>
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="font-medium">
                                {Array.from(
                                  new Set(
                                    reminder.reminder_times
                                      ?.filter((time) => time.is_active ?? true)
                                      .map((time) => time.scheduled_time.slice(0, 5))
                                  )
                                )
                                  .sort()
                                  .join(" • ") || "--"}
                              </span>
                              <span className="text-muted-foreground">
                                {reminder.days_of_week
                                  .map(day => DAYS.find(item => item.value === day)?.label)
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                            {reminder.send_email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Envia e-mail para o e-mail cadastrado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reminder.is_active}
                            onCheckedChange={() => toggleReminder(reminder.id, reminder.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingReminder(reminder);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteReminderTarget(reminder)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <EditReminderDialog
          reminder={editingReminder}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={loadReminders}
        />

        <Dialog
          open={!!deleteReminderTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteReminderTarget(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir lembrete?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Essa ação não pode ser desfeita. O lembrete será removido.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteReminderTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deleteReminderTarget) return;
                  await deleteReminder(deleteReminderTarget.id);
                  setDeleteReminderTarget(null);
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Reminders;
