/**
 * Demo Personas Page
 * Step-through demo showing how profiles build over time
 */

import { supabase } from '@/lib/supabase-client';
import type { CustomerProfile } from '@/lib/types';
import PersonaDemoUI from './PersonaDemoUI';
import ProfileStyleLoader from './components/ProfileStyleLoader';

export const metadata = {
  title: 'Demo Personas - Nordstrom Style Profile',
};

async function getCustomerProfiles(): Promise<CustomerProfile[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .order('customer_name');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data as CustomerProfile[];
}

export default async function PersonasPage() {
  const profiles = await getCustomerProfiles();

  if (profiles.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF9F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: '16px' }}>No customer profiles found.</p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Run the import-customer-profiles.py script to load demo data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProfileStyleLoader>
      <PersonaDemoUI profiles={profiles} />
    </ProfileStyleLoader>
  );
}
