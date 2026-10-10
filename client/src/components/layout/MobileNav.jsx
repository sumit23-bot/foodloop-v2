import React from 'react';
import { LayoutDashboard, UtensilsCrossed, PlusCircle, MapPin, Award } from 'lucide-react';

export default function MobileNav({ activeView, onNavigate }) {
  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    { id: 'RESCUE', label: 'Rescue', icon: UtensilsCrossed },
    { id: 'POST', label: 'Post', icon: PlusCircle },
    { id: 'RADAR', label: 'Radar', icon: MapPin },
    { id: 'IMPACT', label: 'Impact', icon: Award }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-tab-btn ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(tab.id)}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
