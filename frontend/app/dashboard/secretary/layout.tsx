"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaSchool,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import "./secretary.css";

/* ---------------- Translation System ---------------- */

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    teachers: "Enseignants",
    students: "Élèves",
    classes: "Classes",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher...",
    schoolAdmin: "Administrateur de l'école",
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
    teachers: "Teachers",
    students: "Students",
    classes: "Classes",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search...",
    schoolAdmin: "School Administrator",
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

export default function SecretaryLayout({
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
    { name: t.dashboard, href: "/dashboard/secretary", icon: <FaTachometerAlt /> },
    { name: "All Users", href: "/dashboard/secretary/users", icon: <FaChalkboardTeacher /> },
    { name: t.classes, href: "/dashboard/secretary/classes", icon: <FaSchool /> },
    { name: t.settings, href: "/dashboard/secretary/settings", icon: <FaCog /> },
  ];

  return (
    <div className={`school-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className="school-sidebar">
        <div className="school-logo">
          📚 SP!K <span>Secretary</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input
              type="text"
              placeholder={t.search}
              className="school-search"
            />
          </div>
        )}

        <ul className="school-menu">
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
      <div className="school-main">
        <header className="school-topbar">

          <div className="topbar-left">
            {!sidebarOpen && (
              <div className="school-logo" style={{ fontSize: '18px', marginBottom: '0', marginRight: '20px' }}>
                📚 SP!K <span style={{ fontSize: '11px' }}>Secretary</span>
              </div>
            )}
            {!isMobile && (
              <input
                type="text"
                placeholder={t.search}
                className="school-search"
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

            <div className="school-profile">
              <img
                src="https://i.pravatar.cc/40"
                alt="profile"
                className="avatar"
              />
              <div className="profile-info">
                <strong>Secretary</strong>
                <p>Secretary</p>
              </div>
            </div>
          </div>
        </header>

        <main className="school-content">{children}</main>
      </div>
    </div>
  );
}
