"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../../styles/login.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const identifier = email.trim();

    if (!identifier) {
      setError("Veuillez entrer votre email ou ID.");
      return;
    }

    if (!password) {
      setError("Veuillez entrer votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("[LOGIN] Failed to parse response:", jsonErr);
        setError("Erreur serveur. Réponse invalide.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Erreur lors de la connexion.");
        console.log(`[LOGIN FAILED] ${data.message || "Unknown error"}`);
      } else {
        // Clear any previous session data - both localStorage and cookies
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("school_id");
        localStorage.removeItem("school_type");
        localStorage.removeItem("impersonation");
        localStorage.removeItem("admin_token_backup");
        localStorage.removeItem("admin_user_backup");
        
        // Clear cookie to ensure clean authentication state
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Store new session data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.school_id) {
          localStorage.setItem("school_id", String(data.user.school_id));
        }

        // Always set school_type deterministically from the logged-in user.
        // This prevents stale level from a previous session (primaire/secondaire/maternelle)
        // from leaking into the new session.
        const resolvedSchoolType =
          (data.user.admin_level || data.user.school_type || "primaire").toLowerCase();
        localStorage.setItem("school_type", resolvedSchoolType);

        // CRITICAL: Set cookie for middleware
        document.cookie = `token=${data.token}; path=/; SameSite=Strict; Secure=false`;

        console.log(`[LOGIN SUCCESS] User: ${identifier}, Role: ${data.user.role}`);

        // Respect middleware returnTo or fallback to role route
        const role = data.user.role;
        const routes: Record<string, string> = {
          SUPER_ADMIN: "/dashboard/admin",
          SCHOOL_ADMIN: "/dashboard/school",
          TEACHER: "/dashboard/teacher",
          STUDENT: "/dashboard/student",
          SECRETARY: "/dashboard/secretary",
          PARENT: "/dashboard/parent",
          ASSISTANT: "/dashboard/assistant",
        };

        const returnTo = searchParams.get('returnTo') || routes[role] || '/';
        router.push(decodeURIComponent(returnTo));
      }
    } catch (err) {
      console.error("[LOGIN ERROR]", err);
      setError("Erreur serveur, réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <h1>KelasiPro Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Email ou ID (ex: 2026xxx)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{ cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
        <p className="forgot-password">
          Mot de passe oublié ? <a href="/forgot-password">Cliquez ici</a>
        </p>
      </div>
    </div>
  );
}
