import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

export default function Index() {
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (isAuthenticated) {
          window.location.href = createPageUrl("Dashboard");
        } else {
          base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
      }
    };

    checkAuthAndRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full mb-4 shadow-lg">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent mb-2">
          Visita+
        </h2>
        <p className="text-slate-600">Carregando aplicação...</p>
      </div>
    </div>
  );
}