import { Select as MuiSelect } from '@backstage/core-components';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import {
  ScaffolderField,
  useScaffolderTheme,
} from '@backstage/plugin-scaffolder-react/alpha';
import { Select as BuiSelect } from '@backstage/ui';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';

import overrides from './selectOverrides.module.css';

type SelectOption = { label: string; value: string; disabled?: boolean };

type ScaffolderAsyncSelectProps = {
  fieldProps: Pick<
    FieldExtensionComponentProps<string>,
    | 'onChange'
    | 'onBlur'
    | 'onFocus'
    | 'rawErrors'
    | 'formData'
    | 'schema'
    | 'required'
    | 'uiSchema'
    | 'errors'
    | 'idSchema'
    | 'disabled'
    | 'readonly'
  >;
  options: SelectOption[];
  defaultTitle: string;
  defaultDescription: string;
  /** Shown when there are no options to pick from. */
  emptyLabel: string;
  /** Shown as the unset placeholder when options exist but nothing is selected. */
  placeholderLabel?: string;
  selectDisabled?: boolean;
};

export function ScaffolderAsyncSelect({
  fieldProps,
  options,
  defaultTitle,
  defaultDescription,
  emptyLabel,
  placeholderLabel = 'Select an option',
  selectDisabled = false,
}: ScaffolderAsyncSelectProps) {
  const theme = useScaffolderTheme();
  const {
    onChange,
    onBlur,
    onFocus,
    rawErrors,
    formData,
    schema,
    required,
    uiSchema,
    errors,
    idSchema,
    disabled,
    readonly,
  } = fieldProps;

  const title = schema.title ?? defaultTitle;
  const description =
    uiSchema?.['ui:description'] ?? schema.description ?? defaultDescription;
  const isDisabled = Boolean(disabled || readonly || selectDisabled);
  const hasValidationError = Boolean(rawErrors?.length) && !formData;

  const resolvedOptions =
    options.length > 0
      ? options
      : [{ label: emptyLabel, value: '', disabled: true }];

  if (theme === 'bui') {
    const buiOptions = [...resolvedOptions];
    if (
      !formData &&
      options.length > 0 &&
      buiOptions.every(option => option.value !== '')
    ) {
      buiOptions.unshift({
        label: placeholderLabel,
        value: '',
        disabled: isDisabled,
      });
    }

    return (
      <ScaffolderField
        rawErrors={rawErrors}
        rawDescription={description}
        required={required}
        disabled={isDisabled}
        errors={errors}
      >
        <BuiSelect
          className={overrides.select}
          id={idSchema?.$id}
          name={idSchema?.$id}
          label={title}
          secondaryLabel={required ? 'Required' : undefined}
          options={buiOptions}
          selectedKey={formData ?? ''}
          onSelectionChange={key => {
            onChange(key ? String(key) : '');
          }}
          isRequired={required}
          isDisabled={isDisabled}
          isInvalid={hasValidationError}
          onBlur={() => onBlur(idSchema?.$id, formData)}
          onFocus={() => onFocus(idSchema?.$id, formData)}
        />
      </ScaffolderField>
    );
  }

  return (
    <FormControl
      margin="normal"
      required={required}
      error={hasValidationError}
      fullWidth
    >
      <MuiSelect
        native
        label={title}
        disabled={isDisabled}
        selected={formData ?? ''}
        onChange={value =>
          onChange(String(Array.isArray(value) ? value[0] : value))
        }
        items={resolvedOptions}
      />
      <FormHelperText>{description}</FormHelperText>
    </FormControl>
  );
}
