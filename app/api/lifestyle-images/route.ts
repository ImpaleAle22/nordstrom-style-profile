import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    // Fetch lifestyle images from Supabase
    // Accept both 'live' and 'active' statuses for backwards compatibility
    const { data: images, error } = await supabase
      .from('lifestyle_images')
      .select('*')
      .in('status', ['live', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lifestyle images:', error);
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    // Transform to match expected format
    const results = images?.map(img => ({
      id: img.id,
      url: img.image_url,
      image_url: img.image_url,
      imageUrl: img.image_url,
      pillar: img.style_pillar,
      finalPillar: img.style_pillar,
      vibes: img.vibes || [],
      occasions: img.occasions || [],
      gender: img.gender,
      status: img.status,
      sub_term: img.sub_term,
      brand_adherence_score: img.brand_adherence_score,
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in lifestyle images API:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
