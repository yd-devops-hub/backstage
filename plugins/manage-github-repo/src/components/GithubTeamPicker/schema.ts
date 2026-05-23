import { makeFieldSchema } from '@backstage/plugin-scaffolder-react';
import { z } from 'zod/v3';

export const GithubTeamPickerFieldSchema = makeFieldSchema({
  output: () => z.string(),
  uiOptions: () =>
    z.object({
      orgField: z
        .string()
        .optional()
        .describe('Form field name that holds the selected GitHub organization'),
    }),
});

export const GithubTeamPickerSchema = GithubTeamPickerFieldSchema.schema;
