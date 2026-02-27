"use client";

import { useEffect, useState } from "react";
import "@/styles/dashboard.css";
import { useRouter } from "next/navigation";
import {
  FaSchool,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaChartBar,
  FaUsers,
  FaCalendarAlt,
  FaBell,
  FaTasks,
  FaBook,
  FaClipboardList,
  FaGraduationCap,
  FaUserTie,
  FaChartLine,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaSearch,
  FaFilter,
  FaSort,
  FaEye,
  FaEdit,
  FaTrash,
  FaCalendarCheck,
  FaCalendarTimes,
  FaCalendarPlus,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaCalendar,
  FaCalendarMinus,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

type School = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  school_id?: string;
  status?: string;
  profile_image?: string;
};

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

// Statistic Card Component
const StatCard = ({ title, value, icon, color, trend }: { title: string; value: string | number; icon: React.ReactNode; color: string; trend?: { value: number; label: string } }) => (
  <div className="stat-card">
    <div className="stat-header">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="stat-title">{title}</div>
    </div>
    <div className="stat-value">{value}</div>
    {trend && (
      <div className="stat-trend" style={{ color: trend.value >= 0 ? '#22c55e' : '#ef4444' }}>
        {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
      </div>
    )}
  </div>
);

// Quick Action Card Component
const QuickActionCard = ({ title, description, icon, onClick, color }: { title: string; description: string; icon: React.ReactNode; onClick: () => void; color: string }) => (
  <div className="quick-action-card" onClick={onClick}>
    <div className="quick-action-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className="quick-action-content">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <div className="quick-action-arrow">→</div>
  </div>
);

// Recent Activity Component
const RecentActivity = ({ activities }: { activities: Array<{ title: string; time: string; type: 'success' | 'warning' | 'error' }> }) => (
  <div className="recent-activity">
    <h3>Activités Récentes</h3>
    <div className="activity-list">
      {activities.map((activity, index) => (
        <div key={index} className="activity-item">
          <div className={`activity-dot ${activity.type}`} />
          <div className="activity-content">
            <div className="activity-title">{activity.title}</div>
            <div className="activity-time">{activity.time}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Upcoming Events Component
const UpcomingEvents = ({ events }: { events: Array<{ title: string; date: string; type: string }> }) => (
  <div className="upcoming-events">
    <h3>Événements à Venir</h3>
    <div className="event-list">
      {events.map((event, index) => (
        <div key={index} className="event-item">
          <div className="event-date">{event.date}</div>
          <div className="event-content">
            <div className="event-title">{event.title}</div>
            <div className="event-type">{event.type}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function SchoolDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalTeachers: 0,
    totalStudents: 0,
    activeUsers: 0
  });

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH SCHOOLS =================
  const fetchSchools = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/schools`);
      if (!response.ok) {
        throw new Error("Failed to fetch schools");
      }
      const data = await response.json();
      setSchools(data.schools || []);
      calculateStats(data.schools || []);
    } catch (err) {
      console.error("Fetch schools error:", err);
      setError("Could not load schools.");
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= CALCULATE STATS =================
  const calculateStats = (schools: School[]) => {
    setStats({
      totalSchools: schools.length,
      totalTeachers: Math.floor(Math.random() * 50) + 10, // Mock data
      totalStudents: Math.floor(Math.random() * 1000) + 100, // Mock data
      activeUsers: Math.floor(Math.random() * 100) + 50 // Mock data
    });
  };

  // ================= QUICK ACTIONS =================
  const handleQuickAction = (action: string) => {
    showToast(`Action "${action}" clicked!`, "success");
  };

  // Mock data for activities and events
  const activities = [
    { title: "Nouvelle école ajoutée", time: "Il y a 2 heures", type: "success" as const },
    { title: "Mise à jour du profil", time: "Hier", type: "success" as const },
    { title: "Problème de connexion", time: "Il y a 3 jours", type: "warning" as const },
    { title: "Nouveau professeur inscrit", time: "Il y a 5 jours", type: "success" as const },
  ];

  const events = [
    { title: "Réunion des parents", date: "15 Mar", type: "Important" },
    { title: "Examen trimestriel", date: "20 Mar", type: "Académique" },
    { title: "Sortie scolaire", date: "25 Mar", type: "Activité" },
    { title: "Journée portes ouvertes", date: "30 Mar", type: "Événement" },
  ];

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <div className="school-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Bienvenue, Administrateur de l'École</h1>
          <p>Gérez efficacement votre établissement et suivez les performances en temps réel</p>
          <div className="welcome-stats">
            <div className="welcome-stat">
              <span className="stat-number">{stats.totalSchools}</span>
              <span className="stat-label">Écoles</span>
            </div>
            <div className="welcome-stat">
              <span className="stat-number">{stats.totalTeachers}</span>
              <span className="stat-label">Enseignants</span>
            </div>
            <div className="welcome-stat">
              <span className="stat-number">{stats.totalStudents}</span>
              <span className="stat-label">Élèves</span>
            </div>
          </div>
        </div>
        <div className="welcome-image">
          <div className="dashboard-illustration">
            <div className="illustration-shapes">
              <div className="shape shape-1"></div>
              <div className="shape shape-2"></div>
              <div className="shape shape-3"></div>
              <div className="shape shape-4"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Écoles"
          value={stats.totalSchools}
          icon={<FaSchool />}
          color="#3b82f6"
          trend={{ value: 12.5, label: "ce mois-ci" }}
        />
        <StatCard
          title="Enseignants Actifs"
          value={stats.totalTeachers}
          icon={<FaChalkboardTeacher />}
          color="#10b981"
          trend={{ value: 8.3, label: "cette semaine" }}
        />
        <StatCard
          title="Élèves Inscrits"
          value={stats.totalStudents}
          icon={<FaUserGraduate />}
          color="#f59e0b"
          trend={{ value: -2.1, label: "ce trimestre" }}
        />
        <StatCard
          title="Utilisateurs Connectés"
          value={stats.activeUsers}
          icon={<FaUsers />}
          color="#ef4444"
          trend={{ value: 15.7, label: "aujourd'hui" }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Actions Rapides</h3>
          <div className="quick-actions-grid">
            <QuickActionCard
              title="Gérer les Écoles"
              description="Ajouter, modifier ou supprimer des écoles"
              icon={<FaSchool />}
              onClick={() => handleQuickAction("Gérer les Écoles")}
              color="#3b82f6"
            />
            <QuickActionCard
              title="Gérer les Enseignants"
              description="Assigner et suivre les enseignants"
              icon={<FaChalkboardTeacher />}
              onClick={() => handleQuickAction("Gérer les Enseignants")}
              color="#10b981"
            />
            <QuickActionCard
              title="Gérer les Élèves"
              description="Inscrire et suivre les élèves"
              icon={<FaUserGraduate />}
              onClick={() => handleQuickAction("Gérer les Élèves")}
              color="#f59e0b"
            />
            <QuickActionCard
              title="Voir les Rapports"
              description="Accéder aux statistiques et rapports"
              icon={<FaChartBar />}
              onClick={() => handleQuickAction("Voir les Rapports")}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={activities} />

        {/* Upcoming Events */}
        <UpcomingEvents events={events} />

        {/* Performance Overview */}
        <div className="performance-overview">
          <h3>Aperçu des Performances</h3>
          <div className="performance-metrics">
            <div className="metric">
              <div className="metric-header">
                <span className="metric-label">Taux de Présence</span>
                <span className="metric-value">94.5%</span>
              </div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '94.5%', backgroundColor: '#10b981' }}></div>
              </div>
            </div>
            <div className="metric">
              <div className="metric-header">
                <span className="metric-label">Satisfaction</span>
                <span className="metric-value">4.2/5</span>
              </div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '84%', backgroundColor: '#f59e0b' }}></div>
              </div>
            </div>
            <div className="metric">
              <div className="metric-header">
                <span className="metric-label">Performance</span>
                <span className="metric-value">87.3%</span>
              </div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '87.3%', backgroundColor: '#3b82f6' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="dashboard-actions">
        <div className="action-group">
          <h4>Gestion Rapide</h4>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => handleQuickAction("Ajouter École")}>
              <FaPlus /> Ajouter École
            </button>
            <button className="action-btn secondary" onClick={() => handleQuickAction("Importer Données")}>
              <FaBook /> Importer Données
            </button>
            <button className="action-btn tertiary" onClick={() => handleQuickAction("Exporter Rapport")}>
              <FaClipboardList /> Exporter Rapport
            </button>
          </div>
        </div>
        
        <div className="search-group">
          <h4>Recherche Rapide</h4>
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input type="text" placeholder="Rechercher une école, enseignant ou élève..." />
            <button className="search-btn">Rechercher</button>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}
    </div>
  );
}