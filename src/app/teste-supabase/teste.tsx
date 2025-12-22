"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TesteSupabase() {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sua_tabela")
        .select("*")
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    })();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Teste Supabase</h1>
      <p>Abra o console do navegador (F12)</p>
    </div>
  );
}
