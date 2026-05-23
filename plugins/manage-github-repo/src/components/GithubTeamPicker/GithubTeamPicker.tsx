import { useApi } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { useEffect, useMemo, useState } from 'react';

import { manageGithubRepoApiRef } from '../../api';
import { ScaffolderAsyncSelect } from '../scaffolder/ScaffolderAsyncSelect';

type GithubTeamPickerUiOptions = {
  orgField?: string;
};

type FormContextWithData = {
  formData?: Record<string, string | undefined>;
};

export const GithubTeamPicker = (
  props: FieldExtensionComponentProps<string, GithubTeamPickerUiOptions>,
) => {
  const { onChange, formData, uiSchema, formContext } = props;

  const orgField = uiSchema?.['ui:options']?.orgField ?? 'repoOwner';
  const org = (
    (formContext as FormContextWithData | undefined)?.formData?.[orgField] ?? ''
  ).trim();

  const api = useApi(manageGithubRepoApiRef);
  const [teams, setTeams] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setTeams([]);
      setLoadError(null);
      if (formData) {
        onChange('');
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .listGithubTeams(org)
      .then(({ items }) => {
        if (cancelled) {
          return;
        }
        setTeams(items);
        if (formData && !items.some(team => team.slug === formData)) {
          onChange('');
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        setTeams([]);
        setLoadError(
          error instanceof Error ? error.message : 'Could not load GitHub teams',
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
  }, [api, formData, onChange, org]);

  const options = useMemo(
    () =>
      teams.map(team => ({
        label: team.name,
        value: team.slug,
      })),
    [teams],
  );

  const emptyLabel = loading
    ? 'Loading…'
    : loadError ?? (org ? 'No teams found' : 'Select an owner first');

  return (
    <ScaffolderAsyncSelect
      fieldProps={props}
      options={options}
      defaultTitle="Owner Team"
      defaultDescription={
        loadError ?? 'Select the GitHub team that owns this repository.'
      }
      emptyLabel={emptyLabel}
      selectDisabled={!org || loading || options.length === 0}
    />
  );
};
