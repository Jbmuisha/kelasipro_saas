"use client";

import { useEffect, useState } from "react";
import "../../styles/dashboard.css"; // Crée ce fichier pour ton CSS
import { useRouter } from "next/navigation";

type School = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchSchools = async () => {
      const token = localStorage.getItem("token"); // Récupérer le token JWT

      try {
        const res = await fetch("http://localhost:5000/api/schools", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Erreur lors du chargement des écoles.");
        } else {
          setSchools(data.schools);
        }
      } catch (err) {
        setError("Erreur serveur, réessayez plus tard.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  return (
    <div className="dashboard-container">
      <h1>Super Admin Dashboard</h1>

      {loading && <p>Chargement des écoles...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="school-list">
        {schools.length === 0 && !loading && <p>Aucune école trouvée.</p>}
        {schools.map((school) => (
          <div key={school.id} className="school-card">
            <h2>{school.name}</h2>
            <p>Email: {school.email || "N/A"}</p>
            <p>Téléphone: {school.phone || "N/A"}</p>
            <button onClick={() => router.push(`/dashboard/admin/school/${school.id}`)}>
              Gérer l'école
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
