import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const StripeSetup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Configuração do Stripe</h1>
        
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            As chaves do Stripe já foram configuradas. Agora você precisa criar um produto e preço no seu dashboard do Stripe.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Passo 1: Criar Produto no Stripe</CardTitle>
              <CardDescription>
                Acesse seu dashboard do Stripe e crie um produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2">
                <li>Acesse <a href="https://dashboard.stripe.com/test/products" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe Dashboard - Produtos</a></li>
                <li>Clique em "Adicionar produto"</li>
                <li>Nome: "Premium Plan" (ou o nome que preferir)</li>
                <li>Descrição: "Acesso completo a todos os recursos"</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passo 2: Criar Preço</CardTitle>
              <CardDescription>
                Configure o preço da assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2">
                <li>No produto criado, clique em "Adicionar preço"</li>
                <li>Modelo de preço: "Recorrente"</li>
                <li>Valor: R$ 9,90</li>
                <li>Frequência de cobrança: Mensal</li>
                <li>Clique em "Salvar preço"</li>
                <li>Copie o ID do preço (começa com "price_")</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passo 3: Configurar Webhook</CardTitle>
              <CardDescription>
                Configure o webhook para receber eventos do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2">
                <li>Acesse <a href="https://dashboard.stripe.com/test/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe Dashboard - Webhooks</a></li>
                <li>Clique em "Adicionar endpoint"</li>
                <li>URL do endpoint: <code className="bg-muted px-2 py-1 rounded">https://tnknmeojdskdpmqcftwk.supabase.co/functions/v1/stripe-webhook</code></li>
                <li>Selecione os eventos:
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>checkout.session.completed</li>
                    <li>customer.subscription.updated</li>
                    <li>customer.subscription.deleted</li>
                  </ul>
                </li>
                <li>Clique em "Adicionar endpoint"</li>
                <li>Copie o "Signing secret" (começa com "whsec_")</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passo 4: Atualizar Configuração</CardTitle>
              <CardDescription>
                Cole os valores copiados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você precisará adicionar o webhook secret quando solicitado pelo sistema.
                O Price ID pode ser configurado como variável de ambiente ou diretamente no código.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StripeSetup;
