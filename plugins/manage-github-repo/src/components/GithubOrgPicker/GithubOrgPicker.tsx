import { useApi } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { useEffect, useMemo, useState } from 'react';

import { manageGithubRepoApiRef } from '../../api';
import { ScaffolderAsyncSelect } from '../scaffolder/ScaffolderAsyncSelect';

export const GithubOrgPicker = (
  props: FieldExtensionComponentProps<string>,
) => {
  const { onChange, formData } = props;

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

  const options = useMemo(
    () =>
      orgs.map(org => ({
        label: org.login,
        value: org.login,
      })),
    [orgs],
  );

  return (
    <ScaffolderAsyncSelect
      fieldProps={props}
      options={options}
      defaultTitle="Owner"
      defaultDescription={
        loadError ??
        'GitHub organizations where the Backstage GitHub App is installed.'
      }
      emptyLabel={
        loading ? 'Loading…' : loadError ?? 'No organizations found'
      }
      selectDisabled={loading || options.length === 0}
    />
  );
};
