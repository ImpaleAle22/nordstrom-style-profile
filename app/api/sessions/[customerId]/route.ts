/**
 * GET /api/sessions/[customerId]
 * Fetch session timeline for a customer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { customerId } = params;

    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[Sessions API] Fetching sessions for:', customerId);
    console.log('[Sessions API] Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Get all sessions for this customer, ordered by session number
    const { data: sessions, error } = await supabase
      .from('customer_sessions')
      .select('*')
      .eq('customer_id', customerId)
      .order('session_number', { ascending: true });

    if (error) {
      console.error('[Sessions API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Sessions API] Found sessions:', sessions?.length || 0);

    if (!sessions || sessions.length === 0) {
      console.log('[Sessions API] No sessions found for customer:', customerId);
      return NextResponse.json({
        sessions: [],
        stats: {
          total_sessions: 0,
          total_signals: 0,
          confidence_progression: [],
          session_types: {}
        }
      });
    }

    // Calculate stats
    const stats = {
      total_sessions: sessions.length,
      total_signals: sessions.reduce((sum, s) => sum + (s.signals_added || 0), 0),
      confidence_progression: sessions.map(s => ({
        session_number: s.session_number,
        confidence: s.confidence_after,
        timestamp: s.completed_at
      })),
      session_types: sessions.reduce((acc, s) => {
        acc[s.session_type] = (acc[s.session_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      first_session: sessions[0].completed_at,
      last_session: sessions[sessions.length - 1].completed_at,
      confidence_growth: sessions[sessions.length - 1].confidence_after - (sessions[0].confidence_before || 0)
    };

    return NextResponse.json({
      sessions,
      stats
    });
  } catch (error: any) {
    console.error('[Sessions API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
