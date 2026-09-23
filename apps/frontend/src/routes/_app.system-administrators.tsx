import { ApiScopeProvider } from '../libs/api/ApiScopeProvider';
import { GLOBAL_SCOPE } from '../libs/api/clients';
import { SystemAdministratorsPage } from '../pages/SystemAdministratorsPage';

export default function SystemAdministratorsRoute() {
  return (
    <ApiScopeProvider scope={GLOBAL_SCOPE}>
      <SystemAdministratorsPage />
    </ApiScopeProvider>
  );
}
