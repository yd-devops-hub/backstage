import { createFormField } from '@backstage/plugin-scaffolder-react/alpha';

import { GithubOrgPicker } from './GithubOrgPicker';
import { GithubOrgPickerFieldSchema } from './schema';

export const githubOrgPickerField = createFormField({
  name: 'GithubOrgPicker',
  component: GithubOrgPicker,
  schema: GithubOrgPickerFieldSchema,
});
