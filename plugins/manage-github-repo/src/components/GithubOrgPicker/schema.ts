import { makeFieldSchema } from '@backstage/plugin-scaffolder-react';
import { z } from 'zod/v3';

export const GithubOrgPickerFieldSchema = makeFieldSchema({
  output: () => z.string(),
});

export const GithubOrgPickerSchema = GithubOrgPickerFieldSchema.schema;
