"use client";

import Link from 'next/link';
import { useState } from 'react';

// Simple SVG icons to replace emojis
const DashboardIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const SchoolIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16 4c0 1.11.89 2 2 2s2-.89 2-2-.89-2-2-2-2 .89-2 2zm4 18v-6h-4v-4h4v-6h4v6h4v4h-4v6h-4z"/>
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.54.21.89.7 1 1.27l-2.87 2.25 1.13 3.28c.1.28-.05.59-.32.73l-2.42 1.18-2.42-1.18c-.28-.14-.42-.45-.32-.73l1.13-3.28-2.87-2.25c.11-.57.46-1.06 1-1.27l2.87 2.25 1.13-3.28c.1-.28.39-.42.68-.32l2.42 1.18 2.42-1.18c.29-.1.58.04.68.32l1.13 3.28 2.87-2.25z"/>
  </svg>
);

const LogoutIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);

const LanguageIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState('en');

  const t = (key: string) => {
    const translations = {
      en: {
        dashboard: 'Super Admin Dashboard',
        schools: 'Schools',
        users: 'Users',
        settings: 'Settings',
        logout: 'Logout',
        language: 'Language'
      },
      fr: {
        dashboard: 'Tableau de bord Super Admin',
        schools: 'Écoles',
        users: 'Utilisateurs',
        settings: 'Paramètres',
        logout: 'Déconnexion',
        language: 'Langue'
      }
    };
    return translations[language as keyof typeof translations][key as keyof typeof translations.en];
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-content">
          <h1 className="header-title">{t('dashboard')}</h1>
          <div className="header-actions">
            <div className="language-selector">
              <LanguageIcon className="language-icon" />
              <label>{t('language')}:</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <button className="logout-btn">
              <LogoutIcon className="logout-icon" />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>
      
      <div className="admin-main">
        <nav className="admin-sidebar">
          <div className="sidebar-brand">
            <h2>KelasiPro</h2>
          </div>
          <ul className="sidebar-menu">
            <li>
              <Link href="/dashboard/admin" className="sidebar-link">
                <DashboardIcon className="menu-icon" />
                {t('dashboard')}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin/schools" className="sidebar-link">
                <SchoolIcon className="menu-icon" />
                {t('schools')}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin/users" className="sidebar-link">
                <UsersIcon className="menu-icon" />
                {t('users')}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin/settings" className="sidebar-link">
                <SettingsIcon className="menu-icon" />
                {t('settings')}
              </Link>
            </li>
          </ul>
        </nav>
        
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}