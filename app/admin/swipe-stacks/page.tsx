'use client';

/**
 * Swipe Stack Manager
 * Create and manage card stacks for swipe experiences
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

interface SwipeStack {
  stack_id: string;
  stack_name: string;
  stack_type: string;
  recipe_type: string;
  target_gender: string;
  card_count: number;
  status: string;
  created_at: string;
}

export default function SwipeStacksPage() {
  const [stacks, setStacks] = useState<SwipeStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');

  useEffect(() => {
    loadStacks();
  }, [filter]);

  const loadStacks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('swipe_stacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStacks(data || []);
    } catch (error) {
      console.error('Error loading stacks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F5' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1
                className="text-3xl font-light mb-1"
                style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  color: '#0C0C0C'
                }}
              >
                Swipe Stack Manager
              </h1>
              <p className="text-sm" style={{ color: '#8E8A82' }}>
                Create and manage card stacks for swipe experiences
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm hover:opacity-60 transition-opacity"
              style={{ color: '#8E8A82' }}
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Filters & Actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === 'all' ? '#0C0C0C' : '#FFFFFF',
                color: filter === 'all' ? '#FFFFFF' : '#8E8A82',
                border: '1px solid #E5E7EB'
              }}
            >
              All Stacks
            </button>
            <button
              onClick={() => setFilter('active')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === 'active' ? '#0C0C0C' : '#FFFFFF',
                color: filter === 'active' ? '#FFFFFF' : '#8E8A82',
                border: '1px solid #E5E7EB'
              }}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('archived')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === 'archived' ? '#0C0C0C' : '#FFFFFF',
                color: filter === 'archived' ? '#FFFFFF' : '#8E8A82',
                border: '1px solid #E5E7EB'
              }}
            >
              Archived
            </button>
          </div>

          <button
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: '#0C0C0C',
              color: '#FFFFFF'
            }}
            onClick={() => alert('Stack builder coming soon!')}
          >
            + New Stack
          </button>
        </div>

        {/* Stacks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 mx-auto mb-4 rounded-full"
              style={{ borderColor: '#E5E7EB', borderTopColor: '#0C0C0C' }}
            />
            <p style={{ color: '#8E8A82' }}>Loading stacks...</p>
          </div>
        ) : stacks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border" style={{ borderColor: '#E5E7EB' }}>
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-light mb-2" style={{ color: '#0C0C0C' }}>
              No stacks found
            </h3>
            <p className="text-sm" style={{ color: '#8E8A82' }}>
              Create your first swipe stack to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {stacks.map((stack) => (
              <div
                key={stack.stack_id}
                className="bg-white rounded-xl border p-6 hover:shadow-lg transition-all"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-light" style={{ color: '#0C0C0C' }}>
                        {stack.stack_name}
                      </h3>
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: stack.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                          color: stack.status === 'active' ? '#166534' : '#6B7280'
                        }}
                      >
                        {stack.status}
                      </span>
                    </div>

                    <div className="flex gap-6 text-sm" style={{ color: '#8E8A82' }}>
                      <span>Type: <strong style={{ color: '#0C0C0C' }}>{stack.stack_type}</strong></span>
                      <span>Recipe: <strong style={{ color: '#0C0C0C' }}>{stack.recipe_type}</strong></span>
                      <span>Gender: <strong style={{ color: '#0C0C0C' }}>{stack.target_gender}</strong></span>
                      <span>Cards: <strong style={{ color: '#0C0C0C' }}>{stack.card_count}</strong></span>
                    </div>

                    <p className="text-xs mt-2" style={{ color: '#B4B1A9' }}>
                      Created: {new Date(stack.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50 transition-all"
                      style={{ borderColor: '#E5E7EB', color: '#0C0C0C' }}
                      onClick={() => alert(`Preview ${stack.stack_name}`)}
                    >
                      Preview
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50 transition-all"
                      style={{ borderColor: '#E5E7EB', color: '#0C0C0C' }}
                      onClick={() => alert(`Edit ${stack.stack_name}`)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
