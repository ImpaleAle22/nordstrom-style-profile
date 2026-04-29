'use client';

/**
 * Persona Demo UI - Step-Through Profile Building
 * Shows how profiles build over time with session data
 */

import { useState } from 'react';
import type { CustomerProfile } from '@/lib/types';

interface PersonaDemoUIProps {
  profiles: CustomerProfile[];
}

export default function PersonaDemoUI({ profiles }: PersonaDemoUIProps) {
  const [selectedPersona, setSelectedPersona] = useState<CustomerProfile | null>(null);
  const [showPersonaSelector, setShowPersonaSelector] = useState(true);
  const [currentSession, setCurrentSession] = useState(0);

  // Mock session data (TODO: Load from Supabase)
  const sessions = selectedPersona ? [
    {
      id: 1,
      name: 'Initial Quiz',
      signals: 15,
      pillars: Object.fromEntries(
        Object.entries(selectedPersona.pillars)
          .map(([k, v]) => [k, Math.floor((v as number) * 0.3)])
      ),
      confidence: 0.2,
    },
    {
      id: 2,
      name: 'Style Swipes #1',
      signals: 32,
      pillars: Object.fromEntries(
        Object.entries(selectedPersona.pillars)
          .map(([k, v]) => [k, Math.floor((v as number) * 0.6)])
      ),
      confidence: 0.5,
    },
    {
      id: 3,
      name: 'Style Swipes #2',
      signals: 28,
      pillars: selectedPersona.pillars,
      confidence: selectedPersona.confidence_score,
    },
  ] : [];

  const currentSessionData = sessions[currentSession];

  if (showPersonaSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-8">
          <h2 className="text-3xl font-serif font-light mb-6">Select a Persona</h2>
          <p className="text-gray-600 mb-8">
            Watch how each customer's style profile builds over time
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const pillarEntries = Object.entries(profile.pillars);
              const topPillars = pillarEntries
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 2);

              return (
                <button
                  key={profile.customer_id}
                  onClick={() => {
                    setSelectedPersona(profile);
                    setShowPersonaSelector(false);
                    setCurrentSession(0);
                  }}
                  className="text-left bg-gray-50 rounded-xl p-6 hover:bg-gray-100 hover:shadow-lg transition-all border-2 border-transparent hover:border-black"
                >
                  <h3 className="text-xl font-semibold mb-2">
                    {profile.customer_name}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {topPillars[0] && topPillars[1]
                      ? `${topPillars[0][0]} / ${topPillars[1][0]}`
                      : 'Building profile...'}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-white rounded">
                      {profile.sessions_processed} sessions
                    </span>
                    <span className="px-2 py-1 bg-white rounded">
                      {(profile.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedPersona) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex">
      {/* Left Control Panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => setShowPersonaSelector(true)}
            className="text-sm text-gray-600 hover:text-black mb-4"
          >
            ← Change Persona
          </button>
          <h2 className="text-2xl font-semibold mb-1">{selectedPersona.customer_name}</h2>
          <p className="text-sm text-gray-600">{selectedPersona.gender}</p>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Session Timeline</h3>

          <div className="space-y-2 mb-8">
            {sessions.map((session, idx) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(idx)}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  currentSession === idx
                    ? 'bg-black text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium mb-1">Session {session.id}</div>
                <div className={`text-sm ${currentSession === idx ? 'text-gray-300' : 'text-gray-600'}`}>
                  {session.name}
                </div>
                <div className={`text-xs mt-2 ${currentSession === idx ? 'text-gray-400' : 'text-gray-500'}`}>
                  {session.signals} signals
                </div>
              </button>
            ))}
          </div>

          {currentSessionData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-3">This Session</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Signals Captured:</span>
                  <span className="ml-2 font-medium">{currentSessionData.signals}</span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>
                  <span className="ml-2 font-medium">
                    {(currentSessionData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentSession(Math.max(0, currentSession - 1))}
              disabled={currentSession === 0}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentSession(Math.min(sessions.length - 1, currentSession + 1))}
              disabled={currentSession === sessions.length - 1}
              className="flex-1 px-4 py-3 bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              Next →
            </button>
          </div>
          <div className="text-center mt-3 text-sm text-gray-600">
            Session {currentSession + 1} of {sessions.length}
          </div>
        </div>
      </div>

      {/* Right Profile Display */}
      <div className="flex-1 p-12 overflow-auto">
        {currentSessionData && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-serif font-light mb-2">
                Style Profile
              </h1>
              <p className="text-xl text-gray-600">
                After {currentSession + 1} session{currentSession !== 0 ? 's' : ''}
              </p>
            </div>

            {/* Style Pillars */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
              <h2 className="text-lg font-semibold mb-6">Style Breakdown</h2>
              <div className="space-y-4">
                {Object.entries(currentSessionData.pillars)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([pillar, weight]) => (
                    <div key={pillar}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium capitalize">{pillar}</span>
                        <span className="text-gray-600">{weight}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full transition-all duration-500"
                          style={{ width: `${weight}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Confidence Score */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-lg font-semibold mb-4">Profile Confidence</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">
                      {currentSessionData.confidence >= 0.8 ? 'Strong' :
                       currentSessionData.confidence >= 0.5 ? 'Moderate' :
                       currentSessionData.confidence >= 0.2 ? 'Building' : 'Emerging'}
                    </span>
                    <span className="text-gray-600">
                      {(currentSessionData.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full transition-all duration-500"
                      style={{ width: `${currentSessionData.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Based on {currentSession + 1} session{currentSession !== 0 ? 's' : ''} and {currentSessionData.signals} signal{currentSessionData.signals !== 1 ? 's' : ''}
              </p>
            </div>

            {/* What Changed */}
            {currentSession > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold mb-2">What Changed This Session</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Captured {currentSessionData.signals} new style signals</li>
                  <li>• Confidence increased by {((currentSessionData.confidence - sessions[currentSession - 1].confidence) * 100).toFixed(0)}%</li>
                  <li>• Style pillars refined with more data</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
