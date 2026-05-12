/**
 * Demo Controls Sidebar
 * Left sidebar with persona card, session controls, and activity feed
 */

'use client';

import type { CustomerProfile } from '@/lib/types';

interface Session {
  session_id: string;
  session_number: number;
  session_type: string;
  activity_summary: string;
  signals_added: number;
  completed_at: string;
}

interface DemoControlsProps {
  currentPersona: CustomerProfile | null;
  sessions: Session[];
  currentSessionIndex: number;
  onChangePersona: () => void;
  onPrevSession: () => void;
  onNextSession: () => void;
}

export default function DemoControls({
  currentPersona,
  sessions,
  currentSessionIndex,
  onChangePersona,
  onPrevSession,
  onNextSession
}: DemoControlsProps) {
  const firstName = currentPersona?.customer_name?.split(' ')[0] || 'No Persona';
  const currentSession = sessions[currentSessionIndex];
  const hasSessions = sessions.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: '📝 Style Quiz',
      swipe: '👆 Swipe Session',
      chat: '💬 Chat Session',
      save: '💾 Saved Outfits',
      outfit_edit: '✏️ Outfit Edit',
      product_like: '❤️ Product Like',
      style_feedback: '⭐ Style Feedback'
    };
    return labels[type] || type;
  };

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
                {currentSessionIndex + 1}/{sessions.length || 1}
              </span>
            </div>
            <div className="stat-compact">
              <span className="stat-label-compact" style={{ color: 'rgba(255,255,255,0.6)' }}>Signals:</span>
              <span className="stat-value-compact" style={{ color: '#fff' }}>
                {sessions.slice(0, currentSessionIndex + 1).reduce((sum, s) => sum + (s.signals_added || 0), 0)}
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
          <button
            className="scrubber-btn-compact"
            onClick={onPrevSession}
            disabled={!hasSessions || currentSessionIndex === 0}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12 4l-8 6 8 6V4z"/>
            </svg>
          </button>

          <div className="session-info-compact">
            <div className="session-label-compact" style={{ color: '#fff' }}>
              Session {currentSessionIndex + 1} / {sessions.length || 1}
            </div>
            <div className="session-date-compact" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {currentSession ? formatDate(currentSession.completed_at) : 'No sessions'}
            </div>
          </div>

          <button
            className="scrubber-btn-compact"
            onClick={onNextSession}
            disabled={!hasSessions || currentSessionIndex === sessions.length - 1}
          >
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
          {currentSession ? (
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {getSessionTypeLabel(currentSession.session_type)}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  {currentSession.activity_summary || 'No activity summary'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                Added {currentSession.signals_added} new signals
              </div>
            </div>
          ) : (
            <div className="activity-placeholder" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {currentPersona ? 'No session data available' : 'No persona selected'}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts (Sticky Bottom) */}
      <div className="keyboard-shortcuts-sticky" style={{ color: 'rgba(255,255,255,0.7)' }}>
        <kbd>←</kbd> Previous <span className="shortcut-divider">•</span> <kbd>→</kbd> Next
      </div>
    </aside>
  );
}
