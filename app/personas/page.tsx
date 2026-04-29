/**
 * Demo Personas Page
 * Step-through demo showing how profiles build over time
 */

import { supabase } from '@/lib/supabase-client';
import type { CustomerProfile } from '@/lib/types';
import PersonaDemoUI from './PersonaDemoUI';

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
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No customer profiles found.</p>
          <p className="text-sm text-gray-500">
            Run the import-customer-profiles.py script to load demo data.
          </p>
        </div>
      </div>
    );
  }

  return <PersonaDemoUI profiles={profiles} />;
}
