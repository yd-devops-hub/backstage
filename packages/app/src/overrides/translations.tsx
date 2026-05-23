import { createTranslationMessages } from '@backstage/frontend-plugin-api';
import { TranslationBlueprint } from '@backstage/plugin-app-react';
import { orgTranslationRef } from '@backstage/plugin-org';

export const orgGithubTeamLabelsTranslation = TranslationBlueprint.make({
  name: 'org-github-team-labels',
  params: {
    resource: createTranslationMessages({
      ref: orgTranslationRef,
      messages: {
        'groupProfileCard.groupNotFound': 'GitHub Team not found',
        'groupProfileCard.listItemTitle.parentGroup': 'Parent GitHub Team',
        'groupProfileCard.listItemTitle.childGroups': 'Child GitHub Teams',
        'userProfileCard.allGroupDialog.title': "All {{name}}'s GitHub Teams:",
      },
    }),
  },
});
