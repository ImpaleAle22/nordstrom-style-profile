/**
 * Persona Selector Modal
 * Overlay for selecting which persona to load
 */

'use client';

import { useEffect } from 'react';
import type { CustomerProfile } from '@/lib/types';

interface PersonaModalProps {
  profiles: CustomerProfile[];
  selectedPersona: CustomerProfile | null;
  onSelect: (profile: CustomerProfile) => void;
  onClose?: () => void;
}

export default function PersonaModal({
  profiles,
  selectedPersona,
  onSelect,
  onClose
}: PersonaModalProps) {
  // Handle escape key to close and enter to select
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && onClose) {
        onClose();
      }

      // Enter to select highlighted persona (if one is selected)
      if (e.key === 'Enter' && selectedPersona) {
        onSelect(selectedPersona);
      }

      // Numbers 1-9 to quick-select personas
      const num = parseInt(e.key);
      if (num >= 1 && num <= profiles.length) {
        onSelect(profiles[num - 1]);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [onClose, selectedPersona, profiles, onSelect]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0C0C0D',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>👥</div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: 0 }}>
                Select a Persona
              </h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >
                ×
              </button>
            )}
          </div>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
            Choose a customer profile to explore their style journey
          </p>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div style={{
          marginBottom: '24px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <span>⌨️ Shortcuts:</span>
          <span><kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>1-9</kbd> Select persona</span>
          <span><kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Esc</kbd> Close</span>
          <span><kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Enter</kbd> Confirm selection</span>
        </div>

        {/* Persona Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px'
        }}>
          {profiles.map((profile, index) => {
            const pillarEntries = Object.entries(profile.pillars);
            const topPillars = pillarEntries
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 3);

            const firstName = profile.customer_name.split(' ')[0];
            const isSelected = selectedPersona?.customer_id === profile.customer_id;

            return (
              <button
                key={profile.customer_id}
                onClick={() => onSelect(profile)}
                style={{
                  textAlign: 'left',
                  borderRadius: '12px',
                  padding: '24px',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  width: '100%',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {/* Number Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)'
                }}>
                  {index + 1}
                </div>

                {/* Persona header with avatar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <img
                    src={`/personas/${encodeURIComponent(profile.customer_name)}.png`}
                    alt={profile.customer_name}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    width: '52px',
                    height: '52px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}>
                    <span style={{ color: '#fff' }}>{firstName.charAt(0)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#fff',
                      marginBottom: '4px',
                      margin: 0
                    }}>
                      {profile.customer_name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>{profile.gender}</p>
                  </div>
                </div>

                {/* Style pillars */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#9ca3af',
                    marginBottom: '8px'
                  }}>TOP STYLE PILLARS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {topPillars.map(([pillar, weight]) => (
                      <span
                        key={pillar}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#fff'
                        }}
                      >
                        {pillar.charAt(0).toUpperCase() + pillar.slice(1)} {weight}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Sessions:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{profile.sessions_processed}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Confidence:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>
                      {(profile.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
