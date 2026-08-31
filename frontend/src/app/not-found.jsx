import { redirect } from 'next/navigation';

// The old route tree ended in `<Route path="*" element={<Navigate to="/" replace />} />`;
// this is the App Router equivalent for anything that matches no route.
export default function NotFound() {
  redirect('/');
}
