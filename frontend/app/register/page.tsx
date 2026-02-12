"use client";

import { useState } from "react";
import "../../styles/register.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Vérification email Gmail
    if (!email.endsWith("@gmail.com")) {
      setError("Vous devez utiliser une adresse Gmail.");
      return;
    }

    // ✅ Vérification mot de passe
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setError("");
    console.log({ email, password });
    // Ici, tu feras l'inscription avec backend (hash + JWT)
  };

  return (
    <div className="container">
      <h1>KelasiPro Register</h1>
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email Gmail"
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
        <input
          type="password"
          placeholder="Confirmer mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">S'inscrire</button>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      </form>
      <p>
        Déjà un compte ? <a href="/login">Connectez-vous</a>
      </p>
    </div>
  );
}
