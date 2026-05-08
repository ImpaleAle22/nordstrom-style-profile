/**
 * Demo Controls Sidebar
 * Left sidebar with persona card, session controls, and activity feed
 */

'use client';

import { useState } from 'react';
import type { CustomerProfile } from '@/lib/types';

interface DemoControlsProps {
  currentPersona: CustomerProfile | null;
  onChangePersona: () => void;
}

export default function DemoControls({ currentPersona, onChangePersona }: DemoControlsProps) {
  const firstName = currentPersona?.customer_name?.split(' ')[0] || 'No Persona';

  return (
    <aside className="demo-sidebar" style={{ color: '#fff' }}>
      <div className="demo-header">
        <h3 style={{ color: '#fff', margin: 0 }}>🎮 Demo Controls</h3>
        <span className="demo-badge">Internal Use Only</span>
      </div>

      {/* Current Persona Card */}
      <div className="demo-section persona-card-section">
        <div className="current-persona-card">
          <div className="persona-card-header-compact">
            <div className="persona-avatar-small" id="personaAvatar">
              {currentPersona ? (
                <img
                  src={`/personas/${encodeURIComponent(currentPersona.customer_name)}.png`}
                  alt={currentPersona.customer_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) parent.textContent = firstName.charAt(0);
                  }}
                />
              ) : (
                <span style={{ fontSize: '20px', color: '#666' }}>?</span>
              )}
            </div>
            <div className="persona-info-compact">
              <div className="persona-name-compact" id="currentPersonaName" style={{ color: '#fff' }}>
                {currentPersona?.customer_name || 'No Persona'}
              </div>
              <div className="persona-type-compact" id="currentPersonaType" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {currentPersona?.gender || '—'}
              </div>
            </div>
          </div>
          <div className="persona-stats-compact">
            <div className="stat-compact">
              <span className="stat-label-compact" style={{ color: 'rgba(255,255,255,0.6)' }}>Sessions:</span>
              <span className="stat-value-compact" id="sessionsCount" style={{ color: '#fff' }}>
                {currentPersona?.sessions_processed || 0}
              </span>
            </div>
            <div className="stat-compact">
              <span className="stat-label-compact" style={{ color: 'rgba(255,255,255,0.6)' }}>Gender:</span>
              <span className="stat-value-compact" id="customerGender" style={{ color: '#fff' }}>
                {currentPersona?.gender || '—'}
              </span>
            </div>
          </div>
          <button className="change-persona-btn" id="changePersonaBtn" onClick={onChangePersona}>
            Change Persona
          </button>
        </div>
      </div>

      {/* Session Navigation */}
      <div className="demo-section session-nav-section">
        <div className="session-scrubber-compact">
          <button className="scrubber-btn-compact" id="prevBtn" disabled>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12 4l-8 6 8 6V4z"/>
            </svg>
          </button>

          <div className="session-info-compact">
            <div className="session-label-compact" style={{ color: '#fff' }}>
              Session <span id="currentSession">1</span> / <span id="totalSessions">1</span>
            </div>
            <div className="session-date-compact" id="sessionDate" style={{ color: 'rgba(255,255,255,0.6)' }}>Current State</div>
          </div>

          <button className="scrubber-btn-compact" id="nextBtn" disabled>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 4v12l8-6-8-6z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="demo-section">
        <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>Activity This Session</h4>
        <div className="activity-feed" id="activityFeed">
          <div className="activity-placeholder" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {currentPersona ? 'Viewing current profile state' : 'No session selected'}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts (Sticky Bottom) */}
      <div className="keyboard-shortcuts-sticky" style={{ color: 'rgba(255,255,255,0.7)' }}>
        <kbd>←</kbd> Previous <span className="shortcut-divider">•</span> <kbd>→</kbd> Next
      </div>
    </aside>
  );
}
