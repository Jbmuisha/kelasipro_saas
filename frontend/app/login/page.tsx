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

    if (!email.endsWith("@gmail.com")) {
      setError("Vous devez utiliser une adresse Gmail pour vous connecter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Erreur lors de la connexion");
      } else {
        localStorage.setItem("token", data.token);

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
        <button type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      </form>
      <p>
        Mot de passe oublié ? <a href="/forgot-password">Cliquez ici</a>
      </p>
    </div>
  );
}
