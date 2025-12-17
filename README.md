# AcalmeMe

Aplicativo web focado em lembretes inteligentes de medicação, rotinas de bem-estar e experiências guiadas para momentos de crise.

## Tecnologias

- React + TypeScript (Vite)
- Tailwind CSS com componentes shadcn/ui
- Supabase (autenticação, banco e funções serverless)
- React Router, React Query e Radix UI

## Pré-requisitos

- Node.js 18+
- npm

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente:

   ```bash
   cp .env.example .env.local
   ```

   Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com as chaves do seu projeto no [Supabase](https://supabase.com/).  
   Opcionalmente ajuste as URLs de redirecionamento se o servidor rodar em outra porta/host.

3. Execute o servidor local:

   ```bash
   npm run dev
   ```

   A aplicação ficará disponível em `http://localhost:8080`.

## Scripts úteis

| Comando        | Descrição                              |
| -------------- | -------------------------------------- |
| `npm run dev`  | Ambiente de desenvolvimento (Vite)     |
| `npm run build`| Build para produção                    |
| `npm run lint` | Verifica o código com ESLint           |
| `npm run preview` | Serve o build gerado localmente    |

## Estrutura principal

- `src/pages`: páginas da aplicação (Landing, Auth, Dashboard, etc.)
- `src/components`: componentes reutilizáveis e UI base.
- `src/hooks`: hooks para estado e integrações (Supabase, assinaturas, etc.).
- `src/integrations/supabase`: tipagens e cliente do Supabase.

## Supabase

Todos os recursos dinâmicos dependem das credenciais configuradas nas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.  
Sem elas, apenas a landing page será carregada (rotas protegidas exigem backend funcionando).

---

Ficou com dúvidas ou quer sugerir melhorias? Abra uma issue ou mande uma mensagem! 💙
