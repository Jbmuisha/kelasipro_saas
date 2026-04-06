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
        // Clear any previous session data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("school_id");
        localStorage.removeItem("school_type");

        // Store new session data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.school_id) {
          localStorage.setItem("school_id", String(data.user.school_id));
        }

        // Store admin_level as school_type if available
        if (data.user.admin_level) {
          localStorage.setItem("school_type", data.user.admin_level);
        }

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
