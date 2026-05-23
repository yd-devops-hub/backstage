import { Select } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import { useEffect, useMemo, useState } from 'react';

import { manageGithubRepoApiRef } from '../../api';

export const GithubOrgPicker = (
  props: FieldExtensionComponentProps<string>,
) => {
  const { onChange, rawErrors, formData, schema, required } = props;

  const api = useApi(manageGithubRepoApiRef);
  const [orgs, setOrgs] = useState<{ login: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .listGithubOrgs()
      .then(({ items }) => {
        if (cancelled) {
          return;
        }
        setOrgs(items);
        if (!formData && items.length === 1) {
          onChange(items[0].login);
        } else if (formData && !items.some(org => org.login === formData)) {
          onChange('');
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        setOrgs([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Could not load GitHub organizations',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, formData, onChange]);

  const items = useMemo(
    () =>
      orgs.map(org => ({
        label: org.login,
        value: org.login,
      })),
    [orgs],
  );

  const helperText =
    loadError ??
    schema.description ??
    'GitHub organizations where the Backstage GitHub App is installed.';

  return (
    <FormControl
      margin="normal"
      required={required}
      error={Boolean(rawErrors?.length) && !formData}
      fullWidth
    >
      <Select
        native
        label={schema.title ?? 'Owner'}
        disabled={loading || items.length === 0}
        selected={formData ?? ''}
        onChange={value =>
          onChange(String(Array.isArray(value) ? value[0] : value))
        }
        items={
          items.length > 0
            ? items
            : [{ label: loading ? 'Loading…' : 'No organizations found', value: '' }]
        }
      />
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
