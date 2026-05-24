import { useEffect } from 'react';
import {
  AppRootElementBlueprint,
  FrontendFeature,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { appThemeApiRef, githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import {
  SignInPageBlueprint,
  ThemeBlueprint,
} from '@backstage/plugin-app-react';
import appPlugin from '@backstage/plugin-app';
import { UnifiedThemeProvider } from '@backstage/theme';
import { SignalsDisplay } from '@backstage/plugin-signals';
import { Navigate } from 'react-router-dom';

import { apertureTheme } from '../theme/aperture';
import { apertureBuiCss } from '../theme/apertureBui';
import { apis } from '../apis';
import { orgGithubTeamLabelsTranslation } from './translations';

const DEFAULT_THEME_ID = 'aperture';

const DefaultApertureTheme = () => {
  const appThemeApi = useApi(appThemeApiRef);

  useEffect(() => {
    const activeThemeId = appThemeApi.getActiveThemeId();
    if (!activeThemeId || activeThemeId === 'light') {
      appThemeApi.setActiveThemeId(DEFAULT_THEME_ID);
    }
  }, [appThemeApi]);

  return null;
};

const defaultApertureThemeElement = AppRootElementBlueprint.make({
  name: 'default-aperture-theme',
  params: {
    element: <DefaultApertureTheme />,
  },
});

// SignalsDisplay must be registered manually — @backstage/plugin-signals only
// exposes api:signals in its NFS alpha, with no app-root-element extension
const signalsDisplayElement = AppRootElementBlueprint.make({
  name: 'signals-display',
  params: {
    element: <SignalsDisplay />,
  },
});

const githubSignInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => (
      <SignInPage
        {...props}
        provider={{
          id: 'github-auth-provider',
          title: 'GitHub',
          message: 'Sign in using GitHub',
          apiRef: githubAuthApiRef,
        }}
      />
    ),
  },
});

const apertureThemeExtension = ThemeBlueprint.make({
  name: 'aperture',
  params: {
    theme: {
      id: 'aperture',
      title: 'Aperture',
      variant: 'light',
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={apertureTheme}>
          {/* BUI variables scoped to this theme — injected only while aperture is active */}
          <style>{apertureBuiCss}</style>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const appOverride: FrontendFeature = appPlugin.withOverrides({
  extensions: [
    PageBlueprint.make({
      name: 'root-redirect',
      params: {
        path: '/',
        loader: async () => <Navigate to="/catalog" replace />,
      },
    }),
    ...apis,
    githubSignInPage,
    apertureThemeExtension,
    defaultApertureThemeElement,
    signalsDisplayElement,
    orgGithubTeamLabelsTranslation,
  ],
});
