/**
 * GET /api/profile/check-name
 *
 * Check if a customer name already exists in the database.
 * Used for duplicate name detection during demo signup.
 *
 * Query params:
 * - name: Customer name to check
 *
 * Response:
 * {
 *   exists: boolean;
 *   count?: number;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'name parameter is required' },
        { status: 400 }
      );
    }

    // Check if any profiles have this name (case-insensitive)
    const { data, error, count } = await supabaseServer
      .from('customer_profiles')
      .select('customer_id', { count: 'exact', head: true })
      .ilike('customer_name', name.trim());

    if (error) {
      console.error('Error checking name:', error);
      return NextResponse.json(
        { error: 'Failed to check name', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: (count || 0) > 0,
      count: count || 0,
    });
  } catch (error: any) {
    console.error('Error checking name:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
