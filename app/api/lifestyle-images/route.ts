import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {

    // Fetch lifestyle images from Supabase
    const { data: images, error } = await supabase
      .from('lifestyle_images')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lifestyle images:', error);
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    // Transform to match expected format
    const results = images?.map(img => ({
      id: img.id,
      url: img.image_url,
      finalPillar: img.pillar,
      vibe: img.vibe,
      occasion: img.occasion,
      gender: img.gender,
      status: img.status,
      keywords: img.keywords || [],
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in lifestyle images API:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
