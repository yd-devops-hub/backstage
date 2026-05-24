/** Categories for Repo Settings tabs / GET /meta definitions. */
export type RepoSettingCategory =
  | 'general'
  | 'merge'
  | 'features'
  | 'topics'
  | 'rulesets'
  | 'security'
  | 'actions'
  | 'pages'
  | 'webhooks'
  | 'access'
  | 'deployKeys'
  | 'environments'
  | 'secrets';

export type RepoSettingSensitivity = 'low' | 'medium' | 'high';

export type RepoSettingUiControl =
  | 'text'
  | 'textarea'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'stringList'
  | 'presetChecklist'
  | 'collaboratorList'
  | 'webhookList'
  | 'deployKeyList'
  | 'environmentList'
  | 'secretNameList'
  | 'secretRotateList'
  | 'pagesConfig'
  | 'actionsPermissions'
  | 'workflowPermissions'
  | 'json';

/** Serializable UI + policy metadata exposed to frontend (GET /meta/repo-setting-definitions). */
export type RepoSettingUiDefinition = {
  id: string;
  category: RepoSettingCategory;
  label: string;
  description: string;
  sensitivity: RepoSettingSensitivity;
  ui: {
    control: RepoSettingUiControl;
    options?: { value: string; label: string }[];
    placeholder?: string;
    readOnly?: boolean;
  };
};

export type RepoSettingRegistration = {
  meta: RepoSettingUiDefinition;
  /** Zod schema for this key’s value type (composed as optional entries in GithubRepoSettings). */
  schema: import('zod').ZodTypeAny;
};
