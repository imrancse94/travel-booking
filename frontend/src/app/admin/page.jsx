import { redirect } from 'next/navigation';

// `<Route index element={<Navigate to="dashboard" replace />} />`, ported.
export default function Page() {
  redirect('/admin/dashboard');
}
