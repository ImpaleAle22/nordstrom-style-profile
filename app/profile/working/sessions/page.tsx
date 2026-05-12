'use client';

/**
 * Session Timeline Demo Page
 * Shows rich session data for the working profile
 */

import { useEffect, useState } from 'react';
import SessionTimeline, { CustomerSession, SessionStats } from '@/components/profile/SessionTimeline';
import Link from 'next/link';

export default function WorkingSessionsPage() {
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Sarah Chen's sessions (she has 5 sessions - good for demo)
    fetch('/api/sessions/sarah_chen_001')
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load sessions:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading sessions...</div>
      </div>
    );
  }

  if (!stats || sessions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">No sessions found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      {/* Dev Badge */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        background: '#000',
        color: '#fff',
        padding: '8px 16px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        borderBottomLeftRadius: '4px',
      }}>
        🔧 SESSION TIMELINE - Dev Reference
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile/working"
            className="text-slate-400 hover:text-white transition mb-4 inline-block"
          >
            ← Back to Profile
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Session Timeline</h1>
          <p className="text-slate-400 text-lg">
            Track how style intelligence evolved over time for Sarah Chen
          </p>
        </div>

        {/* Timeline */}
        <SessionTimeline sessions={sessions} stats={stats} />

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-700">
          <div className="flex gap-4">
            <Link
              href="/profile/working"
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              ← Back to Profile
            </Link>
            <Link
              href="/personas"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              View All Personas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
