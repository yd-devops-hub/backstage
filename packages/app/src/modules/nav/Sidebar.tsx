import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import MenuIcon from '@material-ui/icons/Menu';
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined';
import SearchIcon from '@material-ui/icons/Search';
import InboxIcon from '@material-ui/icons/Inbox';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item => (
        <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
      ));

      // Skipped items (consume auto nav entries; we render our own links elsewhere)
      nav.take('page:search'); // Using search modal instead
      nav.take('page:approvals/inbox');
      nav.take('page:approvals/mine');
      nav.take('page:approvals/detail');

      return (
        <Sidebar>
          <SidebarLogo />
          <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
            <SidebarSearchModal />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup
            label="Templates"
            icon={<NoteAddOutlinedIcon />}
            to="/create/templates"
          >
            {nav.take('page:scaffolder')}
            {nav.take('page:manage-github-team')}
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup
            label="Approvals"
            icon={<AssignmentIcon />}
            to="/approvals/inbox"
          >
            <SidebarItem
              icon={() => <InboxIcon />}
              to="/approvals/inbox"
              text="Inbox"
            />
            <SidebarItem
              icon={() => <AssignmentIcon />}
              to="/approvals/mine"
              text="My requests"
            />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="Menu" icon={<MenuIcon />}>
            {nav.take('page:catalog')}
            <SidebarDivider />
            <SidebarScrollWrapper>
              {nav.rest({ sortBy: 'title' })}
            </SidebarScrollWrapper>
          </SidebarGroup>
          <SidebarSpace />
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:app-visualizer')}
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
