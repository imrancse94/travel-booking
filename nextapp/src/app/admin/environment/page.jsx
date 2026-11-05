import { redirect } from 'next/navigation';
import { getSession, sessionHasRole } from '../../../lib/session.js';
import { getEnvironmentGroups } from '../../../server/lib/environmentInfo.js';
import EnvironmentView from '../../../views/admin/environment/EnvironmentView.jsx';

// Super admin only, enforced on the server: anyone else is redirected before
// any value is read, so nothing is ever sent to their browser.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getSession();
  if (!sessionHasRole(user, 'Super Admin')) redirect('/');

  return <EnvironmentView groups={getEnvironmentGroups()} />;
}
