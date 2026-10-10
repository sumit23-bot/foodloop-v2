import React from 'react';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  PlusCircle, 
  MapPin, 
  HeartHandshake, 
  ShieldAlert, 
  ShieldCheck, 
  Gift, 
  Award, 
  MessageSquare, 
  Mail, 
  FileText,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export default function Sidebar({ 
  activeView, 
  onNavigate, 
  currentUser, 
  onOpenAuth, 
  onLogout, 
  onSelectPersona, 
  onOpenAssistant, 
  onOpenTerms,
  isOpenOnMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  animalCount = 0
}) {
  const getInitials = (name) => {
    if (!name) return 'FL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (user) => {
    if (!user) return 'Visitor';
    if (user.role === 'ADMIN') return 'Safety Admin';
    if (user.role === 'NGO') return 'Verified NGO';
    if (user.role === 'ANIMAL_SHELTER') return 'Animal Shelter';
    if (user.role === 'DONOR') return 'Food Donor';
    return user.role || 'Member';
  };

  const getCurrentPersonaValue = () => {
    if (!currentUser) return 'GUEST';
    if (currentUser.role === 'ADMIN') return 'ADMIN';
    if (currentUser.role === 'NGO') return 'NGO';
    if (currentUser.role === 'ANIMAL_SHELTER') return 'ANIMAL';
    if (currentUser.role === 'DONOR') return 'DONOR';
    return 'GUEST';
  };

  const handleNavClick = (view) => {
    onNavigate(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {isOpenOnMobile && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile} 
          aria-hidden="true" 
        />
      )}
      <aside 
        className={`app-sidebar ${isOpenOnMobile ? 'drawer-open' : ''}`}
        aria-label="Application Sidebar"
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-header">
            <div className="sidebar-brand-title-wrap">
              <h1>FoodLoop</h1>
              <p>Surplus food rescue network</p>
            </div>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={isOpenOnMobile ? onCloseMobile : onToggleCollapse}
              aria-label={isOpenOnMobile ? "Close navigation drawer" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isOpenOnMobile ? "Close navigation" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isOpenOnMobile ? (
                <X size={16} strokeWidth={2} />
              ) : isCollapsed ? (
                <ChevronRight size={16} strokeWidth={2} />
              ) : (
                <ChevronLeft size={16} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* OVERVIEW */}
          <div className="nav-group">
            <div className="nav-group-title">Overview</div>
            <ul className="nav-group-items">
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'OVERVIEW' ? 'active' : ''}`}
                  aria-current={activeView === 'OVERVIEW' ? 'page' : undefined}
                  onClick={() => handleNavClick('OVERVIEW')}
                  title="Dashboard"
                >
                  <span className="nav-item-icon">
                    <LayoutDashboard size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Dashboard</span>
                </button>
              </li>
            </ul>
          </div>

          {/* OPERATIONS */}
          <div className="nav-group">
            <div className="nav-group-title">Operations</div>
            <ul className="nav-group-items">
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'RESCUE' ? 'active' : ''}`}
                  aria-current={activeView === 'RESCUE' ? 'page' : undefined}
                  onClick={() => handleNavClick('RESCUE')}
                  title="Rescue hub"
                >
                  <span className="nav-item-icon">
                    <UtensilsCrossed size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Rescue hub</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'POST' ? 'active' : ''}`}
                  aria-current={activeView === 'POST' ? 'page' : undefined}
                  onClick={() => handleNavClick('POST')}
                  title="Post surplus food"
                >
                  <span className="nav-item-icon">
                    <PlusCircle size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Post surplus food</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'RADAR' ? 'active' : ''}`}
                  aria-current={activeView === 'RADAR' ? 'page' : undefined}
                  onClick={() => handleNavClick('RADAR')}
                  title="Radar map"
                >
                  <span className="nav-item-icon">
                    <MapPin size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Radar map</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'ANIMAL' ? 'active' : ''}`}
                  aria-current={activeView === 'ANIMAL' ? 'page' : undefined}
                  onClick={() => handleNavClick('ANIMAL')}
                  title="Animal and gaushala loop"
                >
                  <span className="nav-item-icon">
                    <HeartHandshake size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Animal and gaushala loop</span>
                  {animalCount > 0 && (
                    <span className="nav-item-badge">{animalCount}</span>
                  )}
                </button>
              </li>
            </ul>
          </div>

          {/* TRUST AND SAFETY */}
          <div className="nav-group">
            <div className="nav-group-title">Trust and Safety</div>
            <ul className="nav-group-items">
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'INCIDENTS' ? 'active' : ''}`}
                  aria-current={activeView === 'INCIDENTS' ? 'page' : undefined}
                  onClick={() => handleNavClick('INCIDENTS')}
                  title="Incidents and disputes"
                >
                  <span className="nav-item-icon">
                    <ShieldAlert size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Incidents and disputes</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'VERIFY' ? 'active' : ''}`}
                  aria-current={activeView === 'VERIFY' ? 'page' : undefined}
                  onClick={() => handleNavClick('VERIFY')}
                  title="NGO verification"
                >
                  <span className="nav-item-icon">
                    <ShieldCheck size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">NGO verification</span>
                </button>
              </li>
            </ul>
          </div>

          {/* IMPACT */}
          <div className="nav-group">
            <div className="nav-group-title">Impact</div>
            <ul className="nav-group-items">
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'SPONSOR' ? 'active' : ''}`}
                  aria-current={activeView === 'SPONSOR' ? 'page' : undefined}
                  onClick={() => handleNavClick('SPONSOR')}
                  title="Sponsor a meal"
                >
                  <span className="nav-item-icon">
                    <Gift size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Sponsor a meal</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'IMPACT' ? 'active' : ''}`}
                  aria-current={activeView === 'IMPACT' ? 'page' : undefined}
                  onClick={() => handleNavClick('IMPACT')}
                  title="My impact"
                >
                  <span className="nav-item-icon">
                    <Award size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">My impact</span>
                </button>
              </li>
            </ul>
          </div>

          {/* HELP */}
          <div className="nav-group">
            <div className="nav-group-title">Help</div>
            <ul className="nav-group-items">
              <li>
                <button
                  type="button"
                  className="nav-item-link"
                  onClick={() => {
                    if (onOpenAssistant) onOpenAssistant();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title="Assistant"
                >
                  <span className="nav-item-icon">
                    <MessageSquare size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Assistant</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-link ${activeView === 'CONTACT' ? 'active' : ''}`}
                  aria-current={activeView === 'CONTACT' ? 'page' : undefined}
                  onClick={() => handleNavClick('CONTACT')}
                  title="Contact"
                >
                  <span className="nav-item-icon">
                    <Mail size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Contact</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="nav-item-link"
                  onClick={() => {
                    if (onOpenTerms) onOpenTerms();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title="Terms"
                >
                  <span className="nav-item-icon">
                    <FileText size={18} strokeWidth={1.5} />
                  </span>
                  <span className="nav-item-text">Terms</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer: Account Block & Demo Mode Select */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar" aria-hidden="true">
              {getInitials(currentUser?.name || currentUser?.organization)}
            </div>
            <div className="user-meta">
              <div className="user-name" title={currentUser?.name || currentUser?.organization || 'Visitor'}>
                {currentUser?.name || currentUser?.organization || 'Visitor'}
              </div>
              <div className="user-role-row">
                <span className="user-role-label">{getRoleLabel(currentUser)}</span>
                {currentUser ? (
                  <button 
                    type="button" 
                    className="auth-action-btn"
                    onClick={onLogout}
                  >
                    Sign out
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="auth-action-btn"
                    onClick={onOpenAuth}
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="demo-mode-box">
            <label htmlFor="demo-role-select" className="demo-mode-label">Demo Mode</label>
            <select
              id="demo-role-select"
              className="demo-mode-select"
              value={getCurrentPersonaValue()}
              onChange={(e) => onSelectPersona(e.target.value)}
              aria-label="Switch demo persona"
            >
              <option value="GUEST">Visitor (Logged Out)</option>
              <option value="DONOR">Food Donor</option>
              <option value="NGO">Verified NGO</option>
              <option value="ANIMAL">Animal Shelter</option>
              <option value="ADMIN">Food Safety Admin</option>
            </select>
          </div>
        </div>
      </aside>
    </>
  );
}
