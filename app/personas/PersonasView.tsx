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
        background: '#0C0C0D',
        borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Persona Card with Navigation Arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Previous Arrow */}
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                color: currentIndex === 0 ? '#444' : '#fff',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Previous persona (←)"
            >
              <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12 4l-8 6 8 6V4z"/>
              </svg>
            </button>

            {/* Persona Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              flex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Avatar */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#fff',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {currentPersona.customer_name ? (
                  <img
                    src={`/customers/${encodeURIComponent(currentPersona.customer_name)}.png`}
                    alt={currentPersona.customer_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const parent = (e.target as HTMLElement).parentElement;
                      const personaName = currentPersona.customer_name || '';
                      const initial = personaName.split(' ')[0]?.charAt(0) || '?';
                      if (parent) parent.textContent = initial;
                    }}
                  />
                ) : (
                  firstName.charAt(0)
                )}
              </div>

              {/* Persona Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h1 style={{
                    color: '#fff',
                    fontSize: '22px',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {currentPersona.customer_name}
                  </h1>
                  <span style={{
                    color: '#666',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {currentIndex + 1} / {profiles.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', color: '#999', fontSize: '13px' }}>
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
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Change Persona
              </button>
            </div>
            </div>

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              disabled={currentIndex === profiles.length - 1}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                color: currentIndex === profiles.length - 1 ? '#444' : '#fff',
                cursor: currentIndex === profiles.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Next persona (→)"
            >
              <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 4v12l8-6-8-6z"/>
              </svg>
            </button>
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
