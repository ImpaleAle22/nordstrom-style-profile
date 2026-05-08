import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    console.log('Attempting to delete image:', imageId);

    const { data, error, count } = await supabaseServer
      .from('lifestyle_images')
      .delete()
      .eq('id', imageId)
      .select();

    console.log('Delete result:', { data, error, count });

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete image', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn('No rows deleted for id:', imageId);
      return NextResponse.json(
        { error: 'Image not found', details: 'No matching record' },
        { status: 404 }
      );
    }

    console.log('Successfully deleted image:', imageId);
    return NextResponse.json({ success: true, deleted: data[0] });
  } catch (error) {
    console.error('Error in DELETE handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const updates = await request.json();

    console.log('Attempting to update image:', imageId, updates);

    // Only allow updating specific fields
    const allowedUpdates: any = {};
    if (updates.gender !== undefined) allowedUpdates.gender = updates.gender;
    if (updates.style_pillar !== undefined) allowedUpdates.style_pillar = updates.style_pillar;
    if (updates.sub_term !== undefined) allowedUpdates.sub_term = updates.sub_term;

    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('lifestyle_images')
      .update(allowedUpdates)
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update image', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    console.log('Successfully updated image:', imageId);
    return NextResponse.json({ success: true, updated: data });
  } catch (error) {
    console.error('Error in PATCH handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
