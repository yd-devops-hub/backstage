import { createFormField } from '@backstage/plugin-scaffolder-react/alpha';

import { GithubTeamPicker } from './GithubTeamPicker';
import { GithubTeamPickerFieldSchema } from './schema';

export const githubTeamPickerField = createFormField({
  name: 'GithubTeamPicker',
  component: GithubTeamPicker,
  schema: GithubTeamPickerFieldSchema,
});
