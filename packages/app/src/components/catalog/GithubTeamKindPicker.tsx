import { Select } from '@backstage/core-components';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import Box from '@material-ui/core/Box';
import { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/esm/useAsync';

import { displayKindLabel } from '../../catalog/kindDisplayNames';
import {
  catalogApiRef,
  catalogReactTranslationRef,
  EntityKindFilter,
  useEntityList,
} from '@backstage/plugin-catalog-react';

function useAllKinds() {
  const catalogApi = useApi(catalogApiRef);
  const {
    error,
    loading,
    value: allKinds,
  } = useAsync(async () => {
    const { facets } = await catalogApi.getEntityFacets({ facets: ['kind'] });
    const kindFacets = (facets.kind ?? []).map(f => f.value);
    return new Map(
      kindFacets.map(kind => [kind.toLocaleLowerCase('en-US'), kind]),
    );
  }, [catalogApi]);

  return { loading, error, allKinds: allKinds ?? new Map<string, string>() };
}

function filterKinds(
  allKinds: Map<string, string>,
  allowedKinds: string[] | undefined,
  forcedKind: string | undefined,
) {
  let availableKinds = Array.from(allKinds.keys());
  if (allowedKinds) {
    availableKinds = allowedKinds
      .map(k => k.toLocaleLowerCase('en-US'))
      .filter(k => allKinds.has(k));
  }

  const kindsMap = new Map(
    availableKinds.map(kind => [kind, allKinds.get(kind) || kind]),
  );

  if (forcedKind && !kindsMap.has(forcedKind)) {
    kindsMap.set(forcedKind.toLocaleLowerCase('en-US'), forcedKind);
  }

  return kindsMap;
}

function useEntityKindFilter(opts: { initialFilter?: string }) {
  const {
    filters,
    queryParameters: { kind: kindParameter },
    updateFilters,
  } = useEntityList();
  const queryParamKind = useMemo(
    () => [kindParameter].flat()[0],
    [kindParameter],
  );
  const [selectedKind, setSelectedKind] = useState(
    queryParamKind ?? filters.kind?.value ?? opts.initialFilter,
  );

  useEffect(() => {
    if (queryParamKind) {
      setSelectedKind(queryParamKind);
    }
  }, [queryParamKind]);

  useEffect(() => {
    if (filters.kind?.value) {
      setSelectedKind(filters.kind.value);
    }
  }, [filters.kind]);

  const { allKinds, loading, error } = useAllKinds();
  const selectedKindLabel = displayKindLabel(
    allKinds.get(selectedKind) ?? selectedKind,
  );

  useEffect(() => {
    updateFilters({
      kind: selectedKind
        ? new EntityKindFilter(selectedKind, selectedKindLabel)
        : undefined,
    });
  }, [selectedKind, selectedKindLabel, updateFilters]);

  return {
    loading,
    error,
    allKinds,
    selectedKind,
    setSelectedKind,
  };
}

type GithubTeamKindPickerProps = {
  allowedKinds?: string[];
  hidden?: boolean;
  initialFilter?: string;
};

/** Catalog kind filter with `Group` shown as GitHub Team. */
export function GithubTeamKindPicker(props: GithubTeamKindPickerProps) {
  const { allowedKinds, hidden, initialFilter = 'component' } = props;
  const { t } = useTranslationRef(catalogReactTranslationRef);
  const alertApi = useApi(alertApiRef);
  const { error, allKinds, selectedKind, setSelectedKind } = useEntityKindFilter(
    { initialFilter },
  );

  useEffect(() => {
    if (error) {
      alertApi.post({
        message: t('entityKindPicker.errorMessage'),
        severity: 'error',
      });
    }
  }, [error, alertApi, t]);

  if (error) {
    return null;
  }

  const options = filterKinds(allKinds, allowedKinds, selectedKind);
  const items = [...options.entries()].map(([key, value]) => ({
    label: displayKindLabel(value),
    value: key,
  }));

  return hidden ? null : (
    <Box pb={1} pt={1}>
      <Select
        label={t('entityKindPicker.title')}
        items={items}
        selected={selectedKind.toLocaleLowerCase('en-US')}
        onChange={value => setSelectedKind(String(value))}
      />
    </Box>
  );
}
