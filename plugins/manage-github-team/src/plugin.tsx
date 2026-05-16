import { jsx } from 'react/jsx-runtime';
import GroupIcon from '@material-ui/icons/Group';
import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

import { rootRouteRef } from './routes';

export const page = PageBlueprint.make({
  params: {
    path: '/manage-github-team',
    routeRef: rootRouteRef,
    title: 'GitHub teams',
    icon: jsx(GroupIcon, { fontSize: 'inherit' }),
    loader: () =>
      import('./components/ManageGithubTeamPage').then(m => (
        <m.ManageGithubTeamPage />
      )),
  },
});

export const manageGithubTeamPlugin = createFrontendPlugin({
  pluginId: 'manage-github-team',
  extensions: [page],
  routes: {
    root: rootRouteRef,
  }
});
