import { createClient } from '@sanity/client';
import type { SanityClient } from '@sanity/client';

export const sanityClient: SanityClient = createClient({
  projectId: 'qqgs5pib',
  dataset: 'production',
  apiVersion: '2024-03-01',
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN,
  useCdn: false, // Use fresh data for internal tools
});

// Helper function to fetch with error handling
export async function fetchFromSanity<T>(query: string, params?: any): Promise<T> {
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (error) {
    console.error('Sanity fetch error:', error);
    throw error;
  }
}
