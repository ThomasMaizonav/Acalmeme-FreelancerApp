import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Plus, Trash2, Edit, Mail, Pill, Droplets, Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EditReminderDialog } from "@/components/EditReminderDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: "medication" | "water" | "exercise" | "custom";
  scheduled_time: string;
  days_of_week: string[];
  is_active: boolean;
  sound_url: string | null;
  send_email: boolean;
  email: string | null;
  last_sent_at?: string | null;
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

const Reminders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [userEmail, setUserEmail] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminder_type: "custom",
    scheduled_time: "08:00",
    days_of_week: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    send_email: false,
    email: "",
  });

  useEffect(() => {
    checkAuth();
    loadReminders();
    checkNotificationPermission();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      const email = session.user.email ?? "";
      setUserEmail(email);
      setFormData(prev => ({
        ...prev,
        email: email || prev.email,
      }));
    }
  };

  const checkNotificationPermission = () => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes nos horários configurados.",
        });
      }
    }
  };

  const loadReminders = async () => {
    const { data, error } = await supabase
      .from("reminders")
      .select("id, title, description, reminder_type, scheduled_time, days_of_week, is_active, sound_url, send_email, email, created_at, updated_at, user_id")
      .order("scheduled_time");

    if (error) {
      toast({
        title: "Erro ao carregar lembretes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setReminders(data || []);
      scheduleNotifications(data || []);
    }
  };

  const scheduleNotifications = (reminders: Reminder[]) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    reminders.forEach(reminder => {
      if (!reminder.is_active) return;

      const now = new Date();
      const [hours, minutes] = reminder.scheduled_time.split(":");
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const timeout = scheduledTime.getTime() - now.getTime();

      setTimeout(() => {
        if (reminder.sound_url && reminder.sound_url !== "default") {
          const audio = new Audio(reminder.sound_url);
          audio.play().catch(e => console.log("Erro ao reproduzir som:", e));
        }
        
        new Notification(reminder.title, {
          body: reminder.description || "Hora do seu lembrete!",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          requireInteraction: true,
        });
      }, timeout);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("reminders").insert([{
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      reminder_type: formData.reminder_type as "medication" | "water" | "exercise" | "custom",
      scheduled_time: formData.scheduled_time,
      days_of_week: formData.days_of_week,
      send_email: formData.send_email,
      email: formData.send_email ? (formData.email || user.email) : null,
    }]);

    if (error) {
      toast({
        title: "Erro ao criar lembrete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lembrete criado",
        description: formData.send_email
          ? "Você receberá uma notificação e um e-mail nesse horário."
          : "Seu lembrete foi configurado com sucesso.",
      });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        reminder_type: "custom",
        scheduled_time: "08:00",
        days_of_week: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        send_email: false,
        email: userEmail,
      });
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
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar lembrete",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lembrete removido",
      });
      loadReminders();
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
      <div className="max-w-4xl mx-auto space-y-6">
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Lembrete</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detalhes adicionais..."
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

                  <div>
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      required
                    />
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

                  <div className="space-y-2 border-t pt-4">
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
                    {formData.send_email && (
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          placeholder={userEmail || "seu@email.com"}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Se você não preencher, usaremos o e-mail da sua conta.
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full">
                    Criar Lembrete
                  </Button>
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
                    <CardContent className="pt-6">
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
                                {reminder.scheduled_time}
                              </span>
                              <span className="text-muted-foreground">
                                {reminder.days_of_week
                                  .map(d => DAYS_MAP[d as keyof typeof DAYS_MAP])
                                  .join(", ")}
                              </span>
                            </div>
                            {reminder.send_email && reminder.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Envia e-mail para {reminder.email}
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
                            onClick={() => deleteReminder(reminder.id)}
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
      </div>
    </div>
  );
};

export default Reminders;
