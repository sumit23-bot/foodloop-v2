import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';

export default function AppShell({
  activeView,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  onSelectPersona,
  onOpenAssistant,
  onOpenTerms,
  onOpenImpact,
  searchTerm,
  onSearchChange,
  animalCount = 0,
  children
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('foodloop_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1100) {
      return true;
    }
    return false;
  });

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileDrawerOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('foodloop_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  // If in standalone Auth view, render standalone without shell navigation
  if (activeView === 'AUTH') {
    return (
      <div className="auth-shell-wrapper">
        <div className="top-hairline" aria-hidden="true">
          <div className="hairline-saffron"></div>
          <div className="hairline-white"></div>
          <div className="hairline-green"></div>
        </div>
        <main id="main-content">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 3px hairline on top */}
      <div className="top-hairline" aria-hidden="true">
        <div className="hairline-saffron"></div>
        <div className="hairline-white"></div>
        <div className="hairline-green"></div>
      </div>

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar navigation */}
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onSelectPersona={onSelectPersona}
        onOpenAssistant={onOpenAssistant}
        onOpenTerms={onOpenTerms}
        isOpenOnMobile={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        animalCount={animalCount}
      />

      {/* Main layout column */}
      <div className="app-main-wrap">
        <Topbar
          activeView={activeView}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onToggleMobileDrawer={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenAssistant={onOpenAssistant}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenImpact={onOpenImpact}
        />

        <main id="main-content" className="app-content" tabIndex={-1}>
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <MobileNav
          activeView={activeView}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
