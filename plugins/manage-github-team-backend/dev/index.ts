import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';

/**
 * Minimal standalone backend for this plugin package.
 * For approvals + GitHub team flow, run the app from the repository root (`yarn start`).
 */
const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());
backend.add(import('../src'));

backend.start();
