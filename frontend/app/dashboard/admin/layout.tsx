"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaSchool,
  FaUsers,
  FaUserTie,
  FaUserGraduate,
  FaMoneyBillWave,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import "./superadmin.css";

/* ---------------- Translation System ---------------- */

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    schools: "Écoles",
    admins: "Administrateurs",
    teachers: "Enseignants",
    students: "Étudiants",
    subscriptions: "Abonnements",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher écoles, utilisateurs...",
    owner: "Propriétaire de la plateforme",
    users: "Utilisateurs",
    addUser: "Ajouter un utilisateur",
    editUser: "Modifier l'utilisateur",
    updateUser: "Mettre à jour l'utilisateur",
    createUser: "Créer l'utilisateur",
    name: "Nom",
    email: "Email",
    role: "Rôle",
    school: "École",
    status: "Statut",
    createdAt: "Créé le",
    actions: "Actions",
    searchUsers: "Rechercher des utilisateurs...",
    allRoles: "Tous les rôles",
    allStatus: "Tous les statuts",
    active: "Actif",
    inactive: "Inactif",
    loading: "Chargement",
    noUsersFound: "Aucun utilisateur trouvé",
    cancel: "Annuler",
    profileImage: "Image de profil",
  },
  en: {
    dashboard: "Dashboard",
    schools: "Schools",
    admins: "Admins",
    teachers: "Teachers",
    students: "Students",
    subscriptions: "Subscriptions",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search schools, users...",
    owner: "Platform Owner",
    users: "Users",
    addUser: "Add User",
    editUser: "Edit User",
    updateUser: "Update User",
    createUser: "Create User",
    name: "Name",
    email: "Email",
    role: "Role",
    school: "School",
    status: "Status",
    createdAt: "Created At",
    actions: "Actions",
    searchUsers: "Search users...",
    allRoles: "All Roles",
    allStatus: "All Status",
    active: "Active",
    inactive: "Inactive",
    loading: "Loading",
    noUsersFound: "No users found",
    cancel: "Cancel",
    profileImage: "Profile Image",
  },
};

function useTranslation(language: "fr" | "en") {
  return translations[language];
}

/* ---------------- Responsive Hook ---------------- */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}

/* ---------------- Component ---------------- */

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  const menu = [
    { name: t.dashboard, href: "/dashboard/superadmin", icon: <FaTachometerAlt /> },
    { name: t.users, href: "/dashboard/admin/users", icon: <FaUsers /> },
    { name: t.schools, href: "/dashboard/superadmin/schools", icon: <FaSchool /> },
    { name: t.admins, href: "/dashboard/superadmin/admins", icon: <FaUserTie /> },
    { name: t.teachers, href: "/dashboard/superadmin/teachers", icon: <FaUsers /> },
    { name: t.students, href: "/dashboard/superadmin/students", icon: <FaUserGraduate /> },
    { name: t.subscriptions, href: "/dashboard/superadmin/subscriptions", icon: <FaMoneyBillWave /> },
    { name: t.reports, href: "/dashboard/superadmin/reports", icon: <FaChartLine /> },
    { name: t.settings, href: "/dashboard/superadmin/settings", icon: <FaCog /> },
  ];

  return (
    <div className={`super-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className="super-sidebar">
        <div className="super-logo">
          🚀 SP!K <span>Super Admin</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input
              type="text"
              placeholder={t.search}
              className="super-search"
            />
          </div>
        )}

        <ul className="super-menu">
          {menu.map((item) => (
            <li
              key={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <Link href={item.href}>
                <span className="icon">{item.icon}</span>
                {sidebarOpen && item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="logout">
          <FaSignOutAlt /> {sidebarOpen && t.logout}
        </div>
      </aside>

      {/* Main */}
      <div className="super-main">
        <header className="super-topbar">

          <div className="topbar-left">
            {!sidebarOpen && (
              <div className="super-logo" style={{ fontSize: '18px', marginBottom: '0', marginRight: '20px' }}>
                🚀 SP!K <span style={{ fontSize: '11px' }}>Super Admin</span>
              </div>
            )}
            {!isMobile && (
              <input
                type="text"
                placeholder={t.search}
                className="super-search"
              />
            )}
          </div>

          <div className="topbar-right">
            <div className="language-selector">
              <button
                onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
                className="language-btn"
              >
                {language === "fr" ? "EN" : "FR"}
              </button>
            </div>

            <div className="notification-icon">
              <FaBell />
              <span className="notification-badge">3</span>
            </div>

            <div className="super-profile">
              <img
                src="https://i.pravatar.cc/40"
                alt="profile"
                className="avatar"
              />
              <div className="profile-info">
                <strong>Super Admin</strong>
                <p>{t.owner}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="super-content">{children}</main>
      </div>
    </div>
  );
}
