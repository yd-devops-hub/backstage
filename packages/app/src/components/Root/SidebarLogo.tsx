import {
  Link,
  sidebarConfig,
  useSidebarOpenState,
} from '@backstage/core-components';
import { NavLink } from 'react-router-dom';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import styles from './SidebarLogo.module.css';

export const SidebarLogo = () => {
  const { isOpen } = useSidebarOpenState();

  return (
    <div
      className={styles.root}
      style={{
        width: sidebarConfig.drawerWidthClosed,
        height: 3 * sidebarConfig.logoHeight,
      }}
    >
      <Link
        component={NavLink}
        to="/catalog"
        underline="none"
        style={{
          width: sidebarConfig.drawerWidthClosed,
          marginLeft: 24,
        }}
      >
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};
