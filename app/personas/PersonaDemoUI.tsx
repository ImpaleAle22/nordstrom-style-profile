'use client';

/**
 * Persona Demo UI - Demo Controls + Profile View Split Layout
 */

import { useState } from 'react';
import type { CustomerProfile } from '@/lib/types';
import ProfileView from './ProfileView';
import DemoControls from './components/DemoControls';
import PersonaModal from './components/PersonaModal';

interface PersonaDemoUIProps {
  profiles: CustomerProfile[];
}

export default function PersonaDemoUI({ profiles }: PersonaDemoUIProps) {
  const [selectedPersona, setSelectedPersona] = useState<CustomerProfile | null>(null);
  const [showPersonaSelector, setShowPersonaSelector] = useState(true);

  return (
    <>
      {/* Split Layout: Demo Controls + Profile View */}
      <div className="split-layout">
        {/* Left Sidebar: Demo Controls */}
        <DemoControls
          currentPersona={selectedPersona}
          onChangePersona={() => setShowPersonaSelector(true)}
        />

        {/* Right Main Content: Profile View */}
        {selectedPersona ? (
          <ProfileView profile={selectedPersona} />
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
