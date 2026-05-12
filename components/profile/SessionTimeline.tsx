'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CustomerSession {
  session_id: string;
  customer_id: string;
  session_number: number;
  session_type: string;
  activity_summary: string;
  signals_added: number;
  pillars_before: Record<string, number> | null;
  pillars_after: Record<string, number>;
  confidence_before: number | null;
  confidence_after: number;
  changes_summary: {
    added?: string[];
    strengthened?: string[];
    weakened?: string[];
    insights?: string[];
    brands_discovered?: string[];
    occasions_identified?: string[];
    semantic_memory_added?: string[];
    price_range?: string;
    price_range_established?: string;
  };
  images_unlocked_count: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}

export interface SessionStats {
  total_sessions: number;
  total_signals: number;
  confidence_progression: Array<{
    session_number: number;
    confidence: number;
    timestamp: string;
  }>;
  session_types: Record<string, number>;
  first_session: string;
  last_session: string;
  confidence_growth: number;
}

interface SessionTimelineProps {
  sessions: CustomerSession[];
  stats: SessionStats;
}

const SESSION_ICONS: Record<string, string> = {
  quiz: '📋',
  swipe: '👆',
  chat: '💬',
  save: '💾',
  outfit_edit: '✏️',
  product_like: '❤️',
  style_feedback: '⭐'
};

const SESSION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  quiz: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300' },
  swipe: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300' },
  chat: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300' },
  save: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300' },
  outfit_edit: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300' },
  product_like: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300' },
  style_feedback: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-300' }
};

export default function SessionTimeline({ sessions, stats }: SessionTimelineProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getPillarChanges = (before: Record<string, number> | null, after: Record<string, number>) => {
    if (!before) return { increased: [], decreased: [], new: Object.keys(after) };

    const increased: string[] = [];
    const decreased: string[] = [];
    const unchanged: string[] = [];

    Object.keys(after).forEach(pillar => {
      const beforeVal = before[pillar] || 0;
      const afterVal = after[pillar];

      if (beforeVal === 0) return; // Handle as new
      if (afterVal > beforeVal) increased.push(pillar);
      else if (afterVal < beforeVal) decreased.push(pillar);
      else unchanged.push(pillar);
    });

    const newPillars = Object.keys(after).filter(p => !before[p]);

    return { increased, decreased, unchanged, new: newPillars };
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-white">{stats.total_sessions}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Signals</div>
          <div className="text-3xl font-bold text-blue-400">{stats.total_signals}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Confidence Growth</div>
          <div className="text-3xl font-bold text-green-400">
            +{Math.round(stats.confidence_growth * 100)}%
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Images Unlocked</div>
          <div className="text-3xl font-bold text-purple-400">
            {sessions.reduce((sum, s) => sum + s.images_unlocked_count, 0)}
          </div>
        </div>
      </div>

      {/* Confidence Progression Chart */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-white">Confidence Progression</h3>
        <div className="relative h-32">
          <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="0" x2="1000" y2="0" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="50" x2="1000" y2="50" stroke="#475569" strokeWidth="1" strokeDasharray="4" />
            <line x1="0" y1="100" x2="1000" y2="100" stroke="#475569" strokeWidth="1" />

            {/* Confidence line */}
            <polyline
              points={stats.confidence_progression
                .map((point, i) => {
                  const x = (i / (stats.confidence_progression.length - 1)) * 1000;
                  const y = 100 - point.confidence * 100;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Data points */}
            {stats.confidence_progression.map((point, i) => {
              const x = (i / (stats.confidence_progression.length - 1)) * 1000;
              const y = 100 - point.confidence * 100;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={point.confidence >= 0.8 ? '#10b981' : point.confidence >= 0.6 ? '#3b82f6' : '#f59e0b'}
                  stroke="#1e293b"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          <div className="absolute -bottom-6 left-0 text-xs text-slate-400">
            {Math.round((stats.confidence_progression[0]?.confidence || 0) * 100)}%
          </div>
          <div className="absolute -bottom-6 right-0 text-xs text-slate-400">
            {Math.round((stats.confidence_progression[stats.confidence_progression.length - 1]?.confidence || 0) * 100)}%
          </div>
        </div>
      </div>

      {/* Session Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Session Timeline</h3>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-700" />

          {/* Session cards */}
          <div className="space-y-6">
            {sessions.map((session, index) => {
              const colors = SESSION_COLORS[session.session_type] || SESSION_COLORS.quiz;
              const isExpanded = expandedSession === session.session_id;
              const pillarChanges = getPillarChanges(session.pillars_before, session.pillars_after);

              return (
                <motion.div
                  key={session.session_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-20"
                >
                  {/* Session number badge */}
                  <div className="absolute left-0 top-4 w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl">{SESSION_ICONS[session.session_type]}</div>
                      <div className="text-xs text-slate-400">#{session.session_number}</div>
                    </div>
                  </div>

                  {/* Session card */}
                  <div
                    className={`${colors.bg} border ${colors.border} rounded-lg p-4 cursor-pointer transition-all hover:scale-[1.02]`}
                    onClick={() => setExpandedSession(isExpanded ? null : session.session_id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${colors.text} capitalize`}>
                            {session.session_type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 text-sm">{formatDate(session.completed_at)}</span>
                        </div>
                        <p className="text-slate-300 text-sm mt-1">{session.activity_summary}</p>
                      </div>
                      <button className="text-slate-400 hover:text-white transition">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Signals:</span>
                        <span className="text-white ml-1 font-semibold">{session.signals_added}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Confidence:</span>
                        <span className={`ml-1 font-semibold ${getConfidenceColor(session.confidence_after)}`}>
                          {session.confidence_before !== null && (
                            <span className="text-slate-500">
                              {Math.round(session.confidence_before * 100)}% →{' '}
                            </span>
                          )}
                          {Math.round(session.confidence_after * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Images:</span>
                        <span className="text-purple-400 ml-1 font-semibold">
                          +{session.images_unlocked_count}
                        </span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 pt-4 border-t border-slate-700/50 space-y-3"
                        >
                          {/* Pillar changes */}
                          {pillarChanges.new.length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">New Pillars:</div>
                              <div className="flex flex-wrap gap-2">
                                {pillarChanges.new.map(pillar => (
                                  <span
                                    key={pillar}
                                    className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs"
                                  >
                                    +{pillar}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {pillarChanges.increased.length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Strengthened:</div>
                              <div className="flex flex-wrap gap-2">
                                {pillarChanges.increased.map(pillar => (
                                  <span
                                    key={pillar}
                                    className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                                  >
                                    ↑ {pillar}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {pillarChanges.decreased.length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Weakened:</div>
                              <div className="flex flex-wrap gap-2">
                                {pillarChanges.decreased.map(pillar => (
                                  <span
                                    key={pillar}
                                    className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs"
                                  >
                                    ↓ {pillar}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Insights */}
                          {session.changes_summary.insights && session.changes_summary.insights.length > 0 && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Insights:</div>
                              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                {session.changes_summary.insights.map((insight, i) => (
                                  <li key={i}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Brands discovered */}
                          {session.changes_summary.brands_discovered && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Brands Discovered:</div>
                              <div className="flex flex-wrap gap-2">
                                {session.changes_summary.brands_discovered.map((brand, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                                  >
                                    {brand}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Semantic memory */}
                          {session.changes_summary.semantic_memory_added && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Semantic Memory Added:</div>
                              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                {session.changes_summary.semantic_memory_added.map((memory, i) => (
                                  <li key={i}>{memory}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Duration */}
                          <div className="text-xs text-slate-500">
                            Duration: {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
