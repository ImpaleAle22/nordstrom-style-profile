/**
 * Interactive Demo - Live Swipe Experience
 * User builds their own profile by swiping
 */

import { redirect } from 'next/navigation';

export default function InteractivePage() {
  // Redirect to name entry page where user creates their session
  redirect('/interactive/name');
}
