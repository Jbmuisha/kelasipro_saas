"use client";

import { useState } from "react";
import "../../styles/login.css"; // on peut réutiliser le CSS du login

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.endsWith("@gmail.com")) {
      setError("Veuillez entrer une adresse Gmail valide.");
      return;
    }

    setError("");
    // TODO: Appeler le backend pour envoyer l'email de réinitialisation
    setMessage(`Si ce compte existe, un email a été envoyé à ${email}.`);
    console.log("Demande de réinitialisation pour :", email);
  };

  return (
    <div className="container">
      <h1>Réinitialiser le mot de passe</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Entrez votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Envoyer le lien</button>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        {message && <p style={{ color: "green", textAlign: "center" }}>{message}</p>}
      </form>
      <p>
        Retour au <a href="/login">Login</a>
      </p>
    </div>
  );
}
