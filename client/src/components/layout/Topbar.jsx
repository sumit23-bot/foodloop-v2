import React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Search, MessageSquare, User } from 'lucide-react';

const VIEW_BREADCRUMBS = {
  OVERVIEW: { section: 'Home', title: 'Overview' },
  RESCUE: { section: 'Operations', title: 'Rescue hub' },
  POST: { section: 'Operations', title: 'Post surplus food' },
  RADAR: { section: 'Operations', title: 'Radar map' },
  ANIMAL: { section: 'Operations', title: 'Animal and gaushala loop' },
  INCIDENTS: { section: 'Trust and Safety', title: 'Incidents and disputes' },
  VERIFY: { section: 'Trust and Safety', title: 'NGO verification' },
  SPONSOR: { section: 'Impact', title: 'Sponsor a meal' },
  IMPACT: { section: 'Impact', title: 'My impact' },
  CONTACT: { section: 'Help', title: 'Contact' }
};

export default function Topbar({ 
  activeView, 
  searchTerm = '', 
  onSearchChange, 
  onToggleMobileDrawer, 
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenAssistant, 
  currentUser, 
  onOpenAuth, 
  onOpenImpact 
}) {
  const currentBreadcrumb = VIEW_BREADCRUMBS[activeView] || { section: 'Portal', title: 'Dashboard' };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-toggle-btn mobile-drawer-toggle"
          onClick={onToggleSidebar || onToggleMobileDrawer}
          aria-label={isSidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
          title={isSidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
        >
          <span className="sidebar-toggle-icon-desktop">
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.5} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={1.5} />
            )}
          </span>
          <span className="sidebar-toggle-icon-mobile">
            <Menu size={20} strokeWidth={1.5} />
          </span>
        </button>

        <nav aria-label="Breadcrumb" className="topbar-breadcrumb">
          <span>{currentBreadcrumb.section}</span>
          <span aria-hidden="true">/</span>
          <span className="current">{currentBreadcrumb.title}</span>
        </nav>
      </div>

      <div className="topbar-center">
        <div className="topbar-search-wrap">
          <Search size={15} strokeWidth={1.5} className="topbar-search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Search listings, donor ID, location..."
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label="Search listings"
          />
        </div>
      </div>

      <div className="topbar-right">
        <div className="network-badge" title="Verified coverage zones">
          <span className="network-dot" aria-hidden="true"></span>
          <span>Network live: Delhi-NCR &amp; Dehradun</span>
        </div>

        <button
          type="button"
          className="topbar-assistant-btn"
          onClick={onOpenAssistant}
          aria-label="Open AI Assistant"
        >
          <MessageSquare size={15} strokeWidth={1.5} />
          <span>Assistant</span>
        </button>

        {currentUser ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenImpact}
            aria-label="View user account impact"
          >
            <User size={14} strokeWidth={1.5} />
            <span>{currentUser.name || currentUser.organization || 'Account'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAuth}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
