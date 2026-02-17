"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Vérifie que l'email est Gmail
    if (!email.endsWith("@gmail.com")) {
      setError("Vous devez utiliser une adresse Gmail pour vous connecter.");
      return;
    }

    if (!password) {
      setError("Veuillez entrer votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Affiche l'erreur reçue du backend
        setError(data.message || "Erreur lors de la connexion.");
        console.log(`[LOGIN FAILED] ${data.message || "Unknown error"}`);
      } else {
        // Stocke le token dans localStorage
        localStorage.setItem("token", data.token);
        console.log(`[LOGIN SUCCESS] User logged in: ${email}`);

        // Redirection selon le rôle
        switch (data.user.role) {
          case "SUPER_ADMIN":
            router.push("/dashboard/admin");
            break;
          case "SCHOOL_ADMIN":
            router.push("/dashboard/school");
            break;
          case "TEACHER":
            router.push("/dashboard/teacher");
            break;
          case "STUDENT":
            router.push("/dashboard/student");
            break;
          default:
            router.push("/");
        }
      }
    } catch (err) {
      console.error("[LOGIN ERROR]", err);
      setError("Erreur serveur, réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>KelasiPro Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
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
  );
}
