import { jsx } from 'react/jsx-runtime';
import InboxIcon from '@material-ui/icons/Inbox';
import AssignmentIcon from '@material-ui/icons/Assignment';
import {
  ApiBlueprint,
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

import { approvalsApiFactory } from './api';

import {
  inboxRouteRef,
  mineRouteRef,
  detailRouteRef,
} from './routes';

export const approvalsApiExtension = ApiBlueprint.make({
  name: 'api',
  params: defineParams => defineParams(approvalsApiFactory),
});

export const inboxPage = PageBlueprint.make({
  name: 'inbox',
  params: {
    path: '/approvals/inbox',
    routeRef: inboxRouteRef,
    title: 'Approvals inbox',
    icon: jsx(InboxIcon, { fontSize: 'inherit' }),
    loader: () =>
      import('./components/ApprovalsInboxPage').then(m => (
        <m.ApprovalsInboxPage />
      )),
  },
});

export const minePage = PageBlueprint.make({
  name: 'mine',
  params: {
    path: '/approvals/mine',
    routeRef: mineRouteRef,
    title: 'My approval requests',
    icon: jsx(AssignmentIcon, { fontSize: 'inherit' }),
    loader: () =>
      import('./components/ApprovalsMinePage').then(m => (
        <m.ApprovalsMinePage />
      )),
  },
});

export const detailPage = PageBlueprint.make({
  name: 'detail',
  params: {
    path: '/approvals/:requestId',
    routeRef: detailRouteRef,
    title: 'Approval request',
    icon: jsx(AssignmentIcon, { fontSize: 'inherit' }),
    loader: () =>
      import('./components/ApprovalDetailPage').then(m => (
        <m.ApprovalDetailPage />
      )),
  },
});

export const approvalsPlugin = createFrontendPlugin({
  pluginId: 'approvals',
  extensions: [approvalsApiExtension, inboxPage, minePage, detailPage],
  routes: {
    inbox: inboxRouteRef,
    mine: mineRouteRef,
    detail: detailRouteRef,
  },
});
