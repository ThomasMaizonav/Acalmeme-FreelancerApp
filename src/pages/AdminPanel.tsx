import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, CreditCard, Calendar, Activity, Mail, Key, Search, Edit, Save, X, Eye, EyeOff, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UserWithSubscription {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  phone?: string;
  free_trial_started_at?: string;
  free_trial_used?: boolean;
  subscription?: {
    id?: string;
    status: string;
    current_period_end: string;
    current_period_start: string;
    trial_end: string | null;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
  };
}

interface FinancialMetrics {
  totalRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  churnRate: number;
  canceledThisMonth: number;
}

interface AuthEvent {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  user_email?: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithSubscription[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    mrr: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    churnRate: 0,
    canceledThisMonth: 0,
  });

  useEffect(() => {
    console.log("Supabase URL:", supabase.supabaseUrl);
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone?.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin-login');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadUsers(), loadAuthEvents()]);
      calculateMetrics();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const calculateMetrics = async () => {
    try {
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('*');

      if (!subscriptionsData) return;

      const activeSubscriptions = subscriptionsData.filter(
        s => s.status === 'active'
      ).length;

      const trialingSubscriptions = subscriptionsData.filter(
        s => s.status === 'trialing'
      ).length;

      const mrr = activeSubscriptions * 9.90;

      const oldestSub = subscriptionsData
        .filter(s => s.current_period_start)
        .sort((a, b) => 
          new Date(a.current_period_start!).getTime() - 
          new Date(b.current_period_start!).getTime()
        )[0];

      let totalRevenue = mrr;
      if (oldestSub?.current_period_start) {
        const monthsSinceStart = Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(oldestSub.current_period_start).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
          )
        );
        totalRevenue = mrr * monthsSinceStart;
      }

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const canceledThisMonth = subscriptionsData.filter(s => {
        if (s.status !== 'canceled' || !s.updated_at) return false;
        const updatedDate = new Date(s.updated_at);
        return updatedDate >= firstDayOfMonth;
      }).length;

      const totalSubs = subscriptionsData.length || 1;
      const churnRate = (canceledThisMonth / totalSubs) * 100;

      setMetrics({
        totalRevenue,
        mrr,
        activeSubscriptions,
        trialingSubscriptions,
        churnRate,
        canceledThisMonth,
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id,user_id,email,full_name,phone,created_at,free_trial_started_at,free_trial_used')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('*');

      const usersWithSubs = profilesData.map((profile: any) => {
        const authUserId = profile.user_id ?? profile.id;

        const subscription = subscriptionsData?.find(
          (sub: any) => sub.user_id === authUserId
        );

        return {
          ...profile,
          user_id: authUserId,
          id: authUserId, // <-- IMPORTANTÍSSIMO: id vira o user_id do auth
          subscription: subscription || undefined,
        };
      });

      setUsers(usersWithSubs);
      setFilteredUsers(usersWithSubs);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuthEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('auth_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email');

      const eventsWithEmails = eventsData.map(event => {
        const profile = profilesData?.find(p => p.id === event.user_id);
        return {
          ...event,
          user_email: profile?.email || 'N/A',
        };
      });

      setAuthEvents(eventsWithEmails);
    } catch (error) {
      console.error('Error loading auth events:', error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setSendingReset(true);
    try {
      const response = await supabase.functions.invoke('admin-send-password-reset', {
        body: { userEmail: email },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Email enviado",
        description: `Link de recuperação de senha enviado para ${email}`,
      });
      setIsResetPasswordDialogOpen(false);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o email",
        variant: "destructive",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleSaveUserChanges = async () => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    try {
      const response = await supabase.functions.invoke('admin-update-user', {
        body: { 
          userId: selectedUser.id,
          fullName: editedName || undefined,
          newPassword: newPassword || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Sucesso",
        description: "Dados do usuário atualizados com sucesso!",
      });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, full_name: editedName || u.full_name }
          : u
      ));
      
      setIsEditDialogOpen(false);
      setEditedName("");
      setNewPassword("");
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setEditedName(user.full_name || "");
    setNewPassword("");
    setIsEditDialogOpen(true);
  };

  const isUserPremium = (user: UserWithSubscription) =>
    user.subscription?.status === "active" || user.subscription?.status === "trialing";

  const togglePremiumAccess = async (user: UserWithSubscription) => {
    const uid = user.user_id || user.id;
    setUpdatingSubscriptionId(uid);
    try {
      const now = new Date();
      const next = new Date();
      next.setDate(next.getDate() + 30);

      if (isUserPremium(user)) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: true,
            current_period_end: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("user_id", uid);

        if (error) throw error;

        setUsers((prev) =>
          prev.map((item) =>
            item.user_id === uid
              ? {
                  ...item,
                  subscription: item.subscription
                    ? {
                        ...item.subscription,
                        status: "canceled",
                        current_period_end: now.toISOString(),
                      }
                    : undefined,
                }
              : item,
          ),
        );
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: uid,
              status: "active",
              cancel_at_period_end: false,
              current_period_start: now.toISOString(),
              current_period_end: next.toISOString(),
              updated_at: now.toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (error) throw error;

        setUsers((prev) =>
          prev.map((item) =>
            (item.user_id || item.id) === uid
              ? {
                  ...item,
                  subscription: {
                    ...(item.subscription || {}),
                    status: "active",
                    current_period_start: now.toISOString(),
                    current_period_end: next.toISOString(),
                    trial_end: item.subscription?.trial_end || null,
                    stripe_subscription_id: item.subscription?.stripe_subscription_id || null,
                    stripe_customer_id: item.subscription?.stripe_customer_id || null,
                  },
                }
              : item,
          ),
        );
      }

      toast({
        title: "Atualizado",
        description: isUserPremium(user)
          ? "Acesso premium removido."
          : "Acesso premium liberado.",
      });
    } catch (error: any) {
      console.error("Error toggling subscription:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a assinatura.",
        variant: "destructive",
      });
    } finally {
      setUpdatingSubscriptionId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Sem assinatura</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      trialing: "secondary",
      past_due: "destructive",
      canceled: "destructive",
    };

    const labels: Record<string, string> = {
      active: "Ativo",
      trialing: "Teste Grátis",
      past_due: "Atrasado",
      canceled: "Cancelado",
      incomplete: "Incompleto",
    };

    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, "default" | "secondary"> = {
      login: "default",
      signup: "secondary",
    };

    const labels: Record<string, string> = {
      login: "Login",
      signup: "Cadastro",
    };

    return <Badge variant={variants[eventType] || "outline"}>{labels[eventType] || eventType}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTrialEndDate = (user: UserWithSubscription) => {
    if (user.subscription?.current_period_end) {
      return formatDate(user.subscription.current_period_end);
    }
    if (user.free_trial_started_at && !user.free_trial_used) {
      const startDate = new Date(user.free_trial_started_at);
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return formatDate(endDate.toISOString());
    }
    return '-';
  };

  const getTrialStatus = (user: UserWithSubscription) => {
    if (user.subscription?.status === 'active') {
      return <Badge variant="default">Ativo</Badge>;
    }
    if (user.subscription?.status === 'trialing') {
      return <Badge variant="secondary">Trial Stripe</Badge>;
    }
    if (user.free_trial_started_at && !user.free_trial_used) {
      const startDate = new Date(user.free_trial_started_at);
      const now = new Date();
      const daysLeft = Math.ceil((30 * 24 * 60 * 60 * 1000 - (now.getTime() - startDate.getTime())) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return <Badge variant="secondary">{daysLeft} dias grátis</Badge>;
      }
    }
    return <Badge variant="destructive">Expirado</Badge>;
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-3xl sm:text-4xl font-bold">Painel Administrativo</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {metrics.mrr.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Receita Mensal Recorrente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {metrics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Estimativa acumulada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Pagantes ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.trialingSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Teste grátis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{metrics.canceledThisMonth} cancelamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Cadastrados</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Usuários e Assinaturas</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell className="text-sm">{user.phone || '-'}</TableCell>
                            <TableCell>
                              {getTrialStatus(user)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getTrialEndDate(user)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Dialog open={isResetPasswordDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                                  setIsResetPasswordDialogOpen(open);
                                  if (open) setSelectedUser(user);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      title="Enviar email de recuperação"
                                      onClick={() => setSelectedUser(user)}
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Enviar Recuperação de Senha</DialogTitle>
                                      <DialogDescription>
                                        Um email será enviado para o usuário com o link de recuperação.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <div>
                                        <Label>Email do usuário</Label>
                                        <Input value={user.email || ''} disabled />
                                      </div>
                                      <Button
                                        onClick={() => user.email && sendPasswordReset(user.email)}
                                        disabled={sendingReset || !user.email}
                                        className="w-full"
                                      >
                                        {sendingReset ? "Enviando..." : "Enviar Email de Recuperação"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Editar usuário"
                                  onClick={() => openEditDialog(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={isUserPremium(user) ? "destructive" : "secondary"}
                                  size="sm"
                                  title={isUserPremium(user) ? "Remover premium" : "Liberar premium"}
                                  onClick={() => togglePremiumAccess(user)}
                                  disabled={updatingSubscriptionId === user.user_id}
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
                <CardDescription>
                  Todas as transações e mudanças de status de assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Início do Período</TableHead>
                          <TableHead>Fim do Período</TableHead>
                          <TableHead>Valor Mensal</TableHead>
                          <TableHead>ID Stripe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers
                          .filter(u => u.subscription)
                          .sort((a, b) => {
                            const dateA = a.subscription?.current_period_start || '0';
                            const dateB = b.subscription?.current_period_start || '0';
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                          })
                          .map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium text-sm">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(user.subscription?.status)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {user.subscription?.current_period_start 
                                  ? formatDate(user.subscription.current_period_start)
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {user.subscription?.current_period_end 
                                  ? formatDate(user.subscription.current_period_end)
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-sm font-semibold">
                                {user.subscription?.status === 'active' ? 'R$ 9,90' : '-'}
                              </TableCell>
                              <TableCell className="text-xs font-mono max-w-[150px] truncate">
                                {user.subscription?.stripe_customer_id || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        {filteredUsers.filter(u => u.subscription).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              Nenhum pagamento registrado ainda
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Atividade de Usuários</CardTitle>
                <CardDescription>
                  Últimos 50 eventos de login e cadastro
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Data e Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {authEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.user_email}</TableCell>
                            <TableCell>
                              {getEventBadge(event.event_type)}
                            </TableCell>
                            <TableCell className="text-sm">{formatDateTime(event.created_at)}</TableCell>
                          </TableRow>
                        ))}
                        {authEvents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Nenhum evento registrado ainda
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Edit Dialog with Name and Password */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere o nome ou defina uma nova senha para o usuário.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" value={selectedUser.email || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome completo</Label>
                  <Input
                    id="edit-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Digite o novo nome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">Nova senha (opcional)</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Deixe vazio para não alterar"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Cadastrado em</Label>
                    <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="mt-1">{getTrialStatus(selectedUser)}</div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveUserChanges}
                    disabled={isSaving || (!editedName && !newPassword)}
                    className="flex-1"
                  >
                    {isSaving ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPanel;
