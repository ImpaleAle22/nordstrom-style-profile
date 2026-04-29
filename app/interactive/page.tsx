/**
 * Interactive Demo - Live Swipe Experience
 * User builds their own profile by swiping
 */

import { redirect } from 'next/navigation';

export default function InteractivePage() {
  // For now, redirect to cold_start persona's swipe
  // TODO: Create new anonymous session
  redirect('/swipe/cold_start');
}
