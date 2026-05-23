import { Select } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import { useEffect, useMemo, useState } from 'react';

import { manageGithubRepoApiRef } from '../../api';

type GithubTeamPickerUiOptions = {
  orgField?: string;
};

type FormContextWithData = {
  formData?: Record<string, string | undefined>;
};

export const GithubTeamPicker = (
  props: FieldExtensionComponentProps<string, GithubTeamPickerUiOptions>,
) => {
  const {
    onChange,
    rawErrors,
    formData,
    schema,
    required,
    uiSchema,
    formContext,
  } = props;

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

  const items = useMemo(
    () =>
      teams.map(team => ({
        label: team.name,
        value: team.slug,
      })),
    [teams],
  );

  const helperText =
    loadError ??
    schema.description ??
    'Select the GitHub team that owns this repository.';

  return (
    <FormControl
      margin="normal"
      required={required}
      error={Boolean(rawErrors?.length) && !formData}
      fullWidth
    >
      <Select
        native
        label={schema.title ?? 'Owner Team'}
        disabled={!org || loading || items.length === 0}
        selected={formData ?? ''}
        onChange={value => onChange(String(Array.isArray(value) ? value[0] : value))}
        items={
          items.length > 0
            ? items
            : [{ label: org ? 'No teams found' : 'Select an owner first', value: '' }]
        }
      />
      <FormHelperText>{helperText}</FormHelperText>
    </FormControl>
  );
};
