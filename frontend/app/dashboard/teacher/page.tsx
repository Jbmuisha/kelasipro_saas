"use client";

import { useEffect, useState } from "react";
import "@/styles/dashboard.css";
import "@/app/dashboard/teacher/teacher.css";
import { useRouter } from "next/navigation";
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBook,
  FaClipboardList,
  FaCalendarAlt,
  FaChartBar,
  FaBell,
  FaTasks,
  FaPlus,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

type Teacher = {
  id: string;
  name: string;
  email: string;
  role: string;
  school_id?: string;
  profile_image?: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  class?: string;
  status?: string;
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  class: string;
  status: 'pending' | 'completed' | 'overdue';
  total_students: number;
  completed_students: number;
};

type Class = {
  id: string;
  name: string;
  students_count: number;
  subject: string;
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

// Assignment List Component
const AssignmentList = ({ assignments, onEdit, onDelete }: { assignments: Assignment[]; onEdit: (id: string) => void; onDelete: (id: string) => void }) => (
  <div className="assignment-list">
    <h3>Mes Devoirs</h3>
    <div className="assignment-filters">
      <button className="filter-btn active">Tous</button>
      <button className="filter-btn">En cours</button>
      <button className="filter-btn">Terminés</button>
      <button className="filter-btn">En retard</button>
    </div>
    <div className="assignments-grid">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="assignment-card">
          <div className="assignment-header">
            <h4>{assignment.title}</h4>
            <div className="assignment-actions">
              <button onClick={() => onEdit(assignment.id)} className="action-btn edit">
                <FaEdit />
              </button>
              <button onClick={() => onDelete(assignment.id)} className="action-btn delete">
                <FaTrash />
              </button>
            </div>
          </div>
          <p className="assignment-description">{assignment.description}</p>
          <div className="assignment-meta">
            <span className="assignment-class">{assignment.class}</span>
            <span className="assignment-date">Échéance: {new Date(assignment.due_date).toLocaleDateString()}</span>
          </div>
          <div className="assignment-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${(assignment.completed_students / assignment.total_students) * 100}%`,
                  backgroundColor: assignment.status === 'overdue' ? '#ef4444' : '#3b82f6'
                }}
              ></div>
            </div>
            <div className="progress-text">
              {assignment.completed_students}/{assignment.total_students} élèves ont terminé
            </div>
          </div>
          <div className="assignment-status">
            <span className={`status-badge ${assignment.status}`}>
              {assignment.status === 'pending' && 'En cours'}
              {assignment.status === 'completed' && 'Terminé'}
              {assignment.status === 'overdue' && 'En retard'}
            </span>
          </div>
        </div>
      ))}
    </div>
    <button className="add-assignment-btn" onClick={() => onEdit('new')}>
      <FaPlus /> Ajouter un devoir
    </button>
  </div>
);

// Class Overview Component
const ClassOverview = ({ classes }: { classes: Class[] }) => (
  <div className="class-overview">
    <h3>Mes Classes</h3>
    <div className="classes-grid">
      {classes.map((classItem) => (
        <div key={classItem.id} className="class-card">
          <div className="class-header">
            <h4>{classItem.name}</h4>
            <span className="class-subject">{classItem.subject}</span>
          </div>
          <div className="class-stats">
            <div className="stat">
              <span className="stat-label">Élèves</span>
              <span className="stat-value">{classItem.students_count}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Présence</span>
              <span className="stat-value">94%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Moyenne</span>
              <span className="stat-value">12.5/20</span>
            </div>
          </div>
          <div className="class-actions">
            <button className="class-action-btn">Voir les détails</button>
            <button className="class-action-btn secondary">Appel</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Performance Overview Component
const PerformanceOverview = () => (
  <div className="performance-overview">
    <h3>Performance Globale</h3>
    <div className="performance-metrics">
      <div className="metric">
        <div className="metric-header">
          <span className="metric-label">Taux de Réussite</span>
          <span className="metric-value">87.5%</span>
        </div>
        <div className="metric-bar">
          <div className="metric-fill" style={{ width: '87.5%', backgroundColor: '#10b981' }}></div>
        </div>
      </div>
      <div className="metric">
        <div className="metric-header">
          <span className="metric-label">Participation</span>
          <span className="metric-value">92.3%</span>
        </div>
        <div className="metric-bar">
          <div className="metric-fill" style={{ width: '92.3%', backgroundColor: '#f59e0b' }}></div>
        </div>
      </div>
      <div className="metric">
        <div className="metric-header">
          <span className="metric-label">Ponctualité</span>
          <span className="metric-value">95.8%</span>
        </div>
        <div className="metric-bar">
          <div className="metric-fill" style={{ width: '95.8%', backgroundColor: '#3b82f6' }}></div>
        </div>
      </div>
    </div>
    <div className="performance-chart">
      <h4>Évolution Mensuelle</h4>
      <div className="chart-placeholder">
        <div className="chart-bars">
          <div className="bar" style={{ height: '60%' }}></div>
          <div className="bar" style={{ height: '80%' }}></div>
          <div className="bar" style={{ height: '70%' }}></div>
          <div className="bar" style={{ height: '90%' }}></div>
          <div className="bar" style={{ height: '85%' }}></div>
          <div className="bar" style={{ height: '95%' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    pendingAssignments: 0,
    completedAssignments: 0
  });

  // Mock data for assignments and classes
  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Devoir de Mathématiques',
      description: 'Exercices sur les équations du second degré',
      due_date: '2024-03-15',
      class: '3ème A',
      status: 'pending',
      total_students: 25,
      completed_students: 18
    },
    {
      id: '2',
      title: 'Rédaction Française',
      description: 'Rédiger une dissertation sur la littérature française',
      due_date: '2024-03-20',
      class: '2nde B',
      status: 'completed',
      total_students: 22,
      completed_students: 22
    },
    {
      id: '3',
      title: 'TP Sciences',
      description: 'Expérience sur les réactions chimiques',
      due_date: '2024-03-10',
      class: '1ère S',
      status: 'overdue',
      total_students: 20,
      completed_students: 15
    }
  ]);

  const [classes] = useState<Class[]>([
    { id: '1', name: '3ème A', students_count: 25, subject: 'Mathématiques' },
    { id: '2', name: '2nde B', students_count: 22, subject: 'Français' },
    { id: '3', name: '1ère S', students_count: 20, subject: 'Sciences' },
    { id: '4', name: 'Terminale ES', students_count: 18, subject: 'Économie' }
  ]);

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH TEACHER INFO =================
  const fetchTeacherInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/teachers/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch teacher info");
      }
      
      const data = await response.json();
      setTeacher(data.teacher);
      calculateStats();
    } catch (err) {
      console.error("Fetch teacher error:", err);
      setError("Could not load teacher information.");
    } finally {
      setLoading(false);
    }
  };

  // ================= CALCULATE STATS =================
  const calculateStats = () => {
    setStats({
      totalClasses: classes.length,
      totalStudents: classes.reduce((sum, cls) => sum + cls.students_count, 0),
      pendingAssignments: assignments.filter(a => a.status === 'pending').length,
      completedAssignments: assignments.filter(a => a.status === 'completed').length
    });
  };

  // ================= HANDLERS =================
  const handleEditAssignment = (id: string) => {
    showToast(`Modifier le devoir ${id}`, "info");
  };

  const handleDeleteAssignment = (id: string) => {
    showToast(`Supprimer le devoir ${id}`, "warning");
  };

  const handleAddAssignment = () => {
    showToast("Ajouter un nouveau devoir", "success");
  };

  useEffect(() => {
    fetchTeacherInfo();
  }, []);

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="loading-spinner">Chargement du tableau de bord enseignant...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Bienvenue, {teacher?.name || 'Cher Enseignant'}</h1>
          <p>Tableau de bord de gestion pédagogique et administrative</p>
          <div className="welcome-stats">
            <div className="welcome-stat">
              <span className="stat-number">{stats.totalClasses}</span>
              <span className="stat-label">Classes</span>
            </div>
            <div className="welcome-stat">
              <span className="stat-number">{stats.totalStudents}</span>
              <span className="stat-label">Élèves</span>
            </div>
            <div className="welcome-stat">
              <span className="stat-number">{stats.pendingAssignments}</span>
              <span className="stat-label">Devoirs</span>
            </div>
          </div>
        </div>
        <div className="welcome-image">
          <div className="teacher-illustration">
            <div className="illustration-shapes">
              <div className="shape shape-1"></div>
              <div className="shape shape-2"></div>
              <div className="shape shape-3"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={<FaChalkboardTeacher />}
          color="#3b82f6"
          trend={{ value: 12.5, label: "ce semestre" }}
        />
        <StatCard
          title="Total Élèves"
          value={stats.totalStudents}
          icon={<FaUserGraduate />}
          color="#10b981"
          trend={{ value: 8.3, label: "cette année" }}
        />
        <StatCard
          title="Devoirs en Cours"
          value={stats.pendingAssignments}
          icon={<FaClipboardList />}
          color="#f59e0b"
          trend={{ value: -2.1, label: "cette semaine" }}
        />
        <StatCard
          title="Devoirs Terminés"
          value={stats.completedAssignments}
          icon={<FaCheckCircle />}
          color="#22c55e"
          trend={{ value: 15.7, label: "ce mois-ci" }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Actions Rapides</h3>
          <div className="quick-actions-grid">
            <QuickActionCard
              title="Créer un Devoir"
              description="Assigner des exercices à vos classes"
              icon={<FaClipboardList />}
              onClick={handleAddAssignment}
              color="#3b82f6"
            />
            <QuickActionCard
              title="Gérer les Classes"
              description="Suivre la performance de vos classes"
              icon={<FaChalkboardTeacher />}
              onClick={() => showToast("Gérer les Classes", "info")}
              color="#10b981"
            />
            <QuickActionCard
              title="Appel Élèves"
              description="Prendre l'appel et suivre l'assiduité"
              icon={<FaUserGraduate />}
              onClick={() => showToast("Appel Élèves", "info")}
              color="#f59e0b"
            />
            <QuickActionCard
              title="Notes et Évaluations"
              description="Saisir et consulter les notes"
              icon={<FaBook />}
              onClick={() => showToast("Notes et Évaluations", "info")}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Assignment List */}
        <AssignmentList 
          assignments={assignments} 
          onEdit={handleEditAssignment} 
          onDelete={handleDeleteAssignment} 
        />

        {/* Class Overview */}
        <ClassOverview classes={classes} />

        {/* Performance Overview */}
        <PerformanceOverview />
      </div>

      {/* Footer Actions */}
      <div className="dashboard-actions">
        <div className="action-group">
          <h4>Gestion Pédagogique</h4>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={handleAddAssignment}>
              <FaPlus /> Nouveau Devoir
            </button>
            <button className="action-btn secondary" onClick={() => showToast("Programmer Évaluation", "info")}>
              <FaCalendarAlt /> Programmer Évaluation
            </button>
            <button className="action-btn tertiary" onClick={() => showToast("Exporter Notes", "info")}>
              <FaChartBar /> Exporter Notes
            </button>
          </div>
        </div>
        
        <div className="search-group">
          <h4>Recherche</h4>
          <div className="search-box">
            <FaSearch />
            <input type="text" placeholder="Rechercher un élève, devoir ou classe..." />
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