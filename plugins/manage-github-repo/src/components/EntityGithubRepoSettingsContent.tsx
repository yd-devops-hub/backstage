import { Box, Container, Flex } from '@backstage/ui';
import { useEntity } from '@backstage/plugin-catalog-react';

import { GithubRepoSettingsForm } from './GithubRepoSettingsForm';
import { useGithubRepoManagement } from '../hooks/useGithubRepoManagement';
import { parseGithubProjectSlug } from '../lib/githubProjectSlug';

/**
 * Catalog entity tab: edits backing GitHub repository settings via
 * `github.com/project-slug` (see parseGithubProjectSlug).
 */
export function EntityGithubRepoSettingsContent() {
  const { entity } = useEntity();
  const parsed = parseGithubProjectSlug(entity);

  const {
    presets,
    presetsError,
    loadingPresets,
    loadRepo,
    requestRepoSettingsUpdate,
    submittingSettingsApproval,
  } = useGithubRepoManagement();

  if (!parsed) {
    return null;
  }

  return (
    <Container>
      <Flex direction="column" gap="4">
        <Box style={{ paddingTop: 8 }}>
          <Box style={{ marginBottom: 4, fontWeight: 600 }}>
            GitHub repository settings
          </Box>
          <Box style={{ opacity: 0.85 }}>
            Driven by <code>github.com/project-slug</code>. Changes are submitted
            for approval; GitHub is updated only after an approver approves, using
            the same integration as catalog and templates.
          </Box>
        </Box>
        <GithubRepoSettingsForm
          mode="catalog"
          catalogOwner={parsed.owner}
          catalogRepo={parsed.repo}
          presetsError={presetsError}
          loadingPresets={loadingPresets}
          presets={presets}
          loadRepo={loadRepo}
          requestRepoSettingsUpdate={requestRepoSettingsUpdate}
          submittingSettingsApproval={submittingSettingsApproval}
        />
      </Flex>
    </Container>
  );
}
