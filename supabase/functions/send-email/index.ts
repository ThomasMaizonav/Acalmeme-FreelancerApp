import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    // Apenas para debug (opcional)
    console.log("Send-email function triggered at", new Date().toISOString());

    // Aqui você colocará depois a lógica real:
    // - buscar usuários
    // - verificar trial expirado
    // - enviar email (Resend, SendGrid, etc.)

    return new Response(
      JSON.stringify({
        ok: true,
        message: "send-email cron executed successfully",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("send-email error:", err);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
