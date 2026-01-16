import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import logo from "../assets/SodeliLogoBranca.jpeg";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8080";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "session_expired") {
      setErrorMsg("Sua sessão expirou. Faça login novamente.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Falha no login");
        setLoading(false);
        return;
      }

      // salva o JWT real
      localStorage.setItem("auth_token", data.token);

      setLoading(false);
      onLogin();
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao conectar no servidor");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Sodéli" className="h-10 w-auto" />
          <div className="leading-tight">
            <div className="font-semibold text-gray-900">Grupo Sodéli</div>
            <div className="text-sm text-gray-500">
              Dashboard de Monitoramento
            </div>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-1">Entrar</h1>
        <p className="text-sm text-gray-500 mb-6">
          Acesse sua conta para ver os dashboards.
        </p>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full h-10 px-3 rounded-md border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-red-200"
              placeholder="seuemail@sodeli.com.br"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              required
              className="mt-1 w-full h-10 px-3 rounded-md border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-red-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full h-10 rounded-md font-medium text-white transition-colors",
              loading ? "bg-[#F4002B]/70" : "bg-[#F4002B] hover:bg-[#d80026]"
            )}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-400"></div>
      </div>
    </div>
  );
}
