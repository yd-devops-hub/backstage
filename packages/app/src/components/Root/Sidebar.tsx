import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { ExtensionDefinition } from '@backstage/frontend-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { MyGroupsSidebarItem } from '@backstage/plugin-org';
import { SidebarLogo } from './SidebarLogo';
import {
  RiGroupLine,
  RiInboxLine,
  RiListCheck2,
  RiMenuLine,
  RiSearchLine,
  RiStackLine,
} from '@remixicon/react';

const GroupIcon = () => <RiGroupLine size={20} />;
const TemplatesIcon = () => <RiStackLine size={20} />;
const ApprovalsIcon = () => <RiListCheck2 size={20} />;
const InboxIcon = () => <RiInboxLine size={20} />;

export const SidebarContent: ExtensionDefinition = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item => (
        <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
      ));

      nav.take('page:search'); // Using search modal instead
      nav.take('page:cost-insights'); // Removed from sidebar
      nav.take('page:graphiql'); // Removed from sidebar
      nav.take('page:kubernetes'); // Removed from sidebar
      nav.take('page:catalog-graph'); // Removed from sidebar
      nav.take('page:api-docs'); // APIs not used
      nav.take('page:catalog-import'); // Register Existing Entity not used
      nav.take('page:mui-to-bui'); // MUI to BUI not used
      nav.take('page:tech-radar'); // Tech Radar not used
      nav.take('page:app-visualizer'); // App Visualizer not used
      nav.take('page:approvals/inbox');
      nav.take('page:approvals/mine');
      nav.take('page:approvals/detail');

      return (
        <Sidebar>
          <SidebarLogo />
          <SidebarGroup label="Search" icon={<RiSearchLine />} to="/search">
            <SidebarSearchModal />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup
            label="Templates"
            icon={<TemplatesIcon />}
            to="/create/templates"
          >
            {nav.take('page:scaffolder')}
            {nav.take('page:manage-github-team')}
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup
            label="Approvals"
            icon={<ApprovalsIcon />}
            to="/approvals/inbox"
          >
            <SidebarItem
              icon={InboxIcon}
              to="/approvals/inbox"
              text="Inbox"
            />
            <SidebarItem
              icon={ApprovalsIcon}
              to="/approvals/mine"
              text="My requests"
            />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="Menu" icon={<RiMenuLine />}>
            {nav.take('page:home')}
            {nav.take('page:catalog')}
            <MyGroupsSidebarItem
              singularTitle="My GitHub Team"
              pluralTitle="My GitHub Teams"
              icon={GroupIcon}
            />
            {nav.take('page:techdocs')}
            {nav.take('page:explore')}
            <SidebarDivider />
            <SidebarScrollWrapper>{nav.rest({ sortBy: 'title' })}</SidebarScrollWrapper>
          </SidebarGroup>
          <SidebarSpace />
          <SidebarDivider />
          {nav.take('page:notifications')}
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
