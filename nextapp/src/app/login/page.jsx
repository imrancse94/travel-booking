import Login from '../../views/auth/Login.jsx';
import { env } from '../../server/config/env.js';
import { DEMO_ACCOUNTS } from '../../lib/demoCredentials.js';

// Server component: the credentials are only passed down (and so only sent to
// the browser) when IS_DEMO=true.
export default function Page() {
  return <Login demoAccounts={env.isDemo ? DEMO_ACCOUNTS : null} />;
}
