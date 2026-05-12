'use client';

/**
 * Simplified Personas View
 * Navigate between static persona profiles
 */

import { useState, useEffect } from 'react';
import type { CustomerProfile } from '@/lib/types';
import ProfileView from '@/components/profile/ProfileView';
import PersonaModal from './components/PersonaModal';

interface PersonasViewProps {
  profiles: CustomerProfile[];
}

export default function PersonasView({ profiles }: PersonasViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);

  const currentPersona = profiles[currentIndex];
  const firstName = currentPersona?.customer_name?.split(' ')[0] || 'Unknown';

  // Keyboard navigation
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < profiles.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, profiles.length]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSelectPersona = (profile: CustomerProfile) => {
    const index = profiles.findIndex(p => p.customer_id === profile.customer_id);
    if (index >= 0) {
      setCurrentIndex(index);
    }
    setShowPersonaSelector(false);
  };

  if (!currentPersona) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF9F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>No personas available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Persona Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        borderBottom: '1px solid #333',
        padding: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                style={{
                  background: currentIndex === 0 ? '#2a2a2a' : '#3a3a3a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: currentIndex === 0 ? '#666' : '#fff',
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M12 4l-8 6 8 6V4z"/>
                </svg>
                Previous
              </button>

              <span style={{ color: '#999', fontSize: '14px' }}>
                {currentIndex + 1} / {profiles.length}
              </span>

              <button
                onClick={handleNext}
                disabled={currentIndex === profiles.length - 1}
                style={{
                  background: currentIndex === profiles.length - 1 ? '#2a2a2a' : '#3a3a3a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: currentIndex === profiles.length - 1 ? '#666' : '#fff',
                  cursor: currentIndex === profiles.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 4v12l8-6-8-6z"/>
                </svg>
              </button>
            </div>

            <span style={{
              background: '#c41e3a',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              INTERNAL USE ONLY
            </span>
          </div>

          {/* Persona Card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Avatar */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: '#fff',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {currentPersona.customer_name ? (
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
                  firstName.charAt(0)
                )}
              </div>

              {/* Persona Info */}
              <div style={{ flex: 1 }}>
                <h1 style={{
                  color: '#fff',
                  fontSize: '28px',
                  fontWeight: '600',
                  margin: '0 0 8px 0'
                }}>
                  {currentPersona.customer_name}
                </h1>
                <div style={{ display: 'flex', gap: '24px', color: '#999', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: '#666' }}>Gender:</span>{' '}
                    <span style={{ color: '#fff' }}>{currentPersona.gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Confidence:</span>{' '}
                    <span style={{ color: '#fff' }}>{Math.round((currentPersona.confidence_score || 0) * 100)}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Signals:</span>{' '}
                    <span style={{ color: '#fff' }}>{currentPersona.total_signals || 0}</span>
                  </div>
                </div>
              </div>

              {/* Change Persona Button */}
              <button
                onClick={() => setShowPersonaSelector(true)}
                style={{
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Change Persona
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div style={{
            marginTop: '16px',
            textAlign: 'center',
            color: '#666',
            fontSize: '12px'
          }}>
            <kbd style={{
              background: '#2a2a2a',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #3a3a3a'
            }}>←</kbd>
            {' '}Previous{' '}
            <span style={{ margin: '0 8px' }}>•</span>
            {' '}<kbd style={{
              background: '#2a2a2a',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #3a3a3a'
            }}>→</kbd>
            {' '}Next
          </div>
        </div>
      </div>

      {/* Profile View */}
      <ProfileView profile={currentPersona} />

      {/* Persona Selector Modal */}
      {showPersonaSelector && (
        <PersonaModal
          profiles={profiles}
          selectedPersona={currentPersona}
          onSelect={handleSelectPersona}
          onClose={() => setShowPersonaSelector(false)}
        />
      )}
    </>
  );
}
