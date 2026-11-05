import { Card } from '../../../components/ui/index.js';
import './environment.css';

/** Read-only view of the running environment. Secrets arrive already masked. */
export function EnvironmentView({ groups }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Environment</h1>
          <p className="text-muted">
            Current values the app is running with. Credentials are masked and never leave the server.
          </p>
        </div>
      </div>

      <p className="env-notice" role="note">
        Changed a value in <code>.env</code>? Restart the app to see the update here.
      </p>

      <div className="env-groups">
        {groups.map((group) => (
          <Card key={group.title} title={group.title}>
            <dl className="env-list">
              {group.entries.map((entry) => (
                <div key={entry.key} className="env-list__row">
                  <dt className="env-list__key">{entry.key}</dt>
                  <dd className={`env-list__value ${entry.value === null ? 'env-list__value--unset' : ''}`}>
                    {entry.value === null ? 'Not set' : entry.value}
                    {entry.masked && <span className="env-list__badge">masked</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default EnvironmentView;
