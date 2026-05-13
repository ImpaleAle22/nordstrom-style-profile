'use client';

/**
 * Persona Demo UI - Demo Controls + Profile View Split Layout
 * With session time-scrubbing functionality
 */

import { useState, useEffect, useCallback } from 'react';
import type { CustomerProfile } from '@/lib/types';
import ProfileView from '@/components/profile/ProfileView';
import DemoControls from './DemoControls';
import PersonaModal from '../personas/components/PersonaModal';

interface PersonaDemoUIProps {
  profiles: CustomerProfile[];
}

interface Session {
  session_id: string;
  session_number: number;
  session_type: string;
  pillars_after: Record<string, number>;
  confidence_after: number;
  activity_summary: string;
  signals_added: number;
  completed_at: string;
}

export default function PersonaDemoUI({ profiles }: PersonaDemoUIProps) {
  const [selectedPersona, setSelectedPersona] = useState<CustomerProfile | null>(null);
  const [showPersonaSelector, setShowPersonaSelector] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [displayProfile, setDisplayProfile] = useState<CustomerProfile | null>(null);

  // Fetch sessions when persona changes
  useEffect(() => {
    if (!selectedPersona) {
      setSessions([]);
      setCurrentSessionIndex(0);
      setDisplayProfile(null);
      return;
    }

    async function fetchSessions() {
      try {
        const customerId = encodeURIComponent(selectedPersona!.customer_id);
        const url = `/api/sessions/${customerId}`;
        console.log('[PersonaDemoUI] Fetching sessions for:', selectedPersona!.customer_id);
        console.log('[PersonaDemoUI] URL:', url);

        const response = await fetch(url);
        console.log('[PersonaDemoUI] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[PersonaDemoUI] Sessions data:', data);
          setSessions(data.sessions || []);
          // Start at the last session (final state)
          setCurrentSessionIndex((data.sessions?.length || 1) - 1);
        } else {
          console.error('[PersonaDemoUI] Response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[PersonaDemoUI] Error fetching sessions:', error);
      }
    }

    fetchSessions();
  }, [selectedPersona?.customer_id]);

  // Rebuild profile based on current session
  useEffect(() => {
    if (!selectedPersona || sessions.length === 0) {
      setDisplayProfile(selectedPersona);
      return;
    }

    const currentSession = sessions[currentSessionIndex];
    if (!currentSession) {
      setDisplayProfile(selectedPersona);
      return;
    }

    // Rebuild profile with session state
    const rebuiltProfile: CustomerProfile = {
      ...selectedPersona,
      pillars: currentSession.pillars_after,
      confidence_score: currentSession.confidence_after,
      sessions_processed: currentSessionIndex + 1,
      total_signals: sessions.slice(0, currentSessionIndex + 1).reduce((sum, s) => sum + (s.signals_added || 0), 0),
    };

    setDisplayProfile(rebuiltProfile);
  }, [selectedPersona, sessions, currentSessionIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentSessionIndex > 0) {
        setCurrentSessionIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentSessionIndex < sessions.length - 1) {
        setCurrentSessionIndex(prev => prev + 1);
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSessionIndex, sessions.length]);

  const handlePrevSession = useCallback(() => {
    if (currentSessionIndex > 0) {
      setCurrentSessionIndex(prev => prev - 1);
    }
  }, [currentSessionIndex]);

  const handleNextSession = useCallback(() => {
    if (currentSessionIndex < sessions.length - 1) {
      setCurrentSessionIndex(prev => prev + 1);
    }
  }, [currentSessionIndex, sessions.length]);

  return (
    <>
      {/* Split Layout: Demo Controls + Profile View */}
      <div className="split-layout">
        {/* Left Sidebar: Demo Controls */}
        <DemoControls
          currentPersona={selectedPersona}
          sessions={sessions}
          currentSessionIndex={currentSessionIndex}
          onChangePersona={() => setShowPersonaSelector(true)}
          onPrevSession={handlePrevSession}
          onNextSession={handleNextSession}
        />

        {/* Right Main Content: Profile View */}
        {displayProfile ? (
          <ProfileView profile={displayProfile} />
        ) : (
          <main className="customer-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#FAF9F5' }}>
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p>No persona selected</p>
              <button
                onClick={() => setShowPersonaSelector(true)}
                style={{ marginTop: '16px', padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Select Persona
              </button>
            </div>
          </main>
        )}
      </div>

      {/* Persona Selector Modal */}
      {showPersonaSelector && (
        <PersonaModal
          profiles={profiles}
          selectedPersona={selectedPersona}
          onSelect={(profile) => {
            setSelectedPersona(profile);
            setShowPersonaSelector(false);
          }}
          onClose={() => setShowPersonaSelector(false)}
        />
      )}
    </>
  );
}
