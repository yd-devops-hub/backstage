import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import type { BackstageCredentials, LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';

/**
 * Resolves configured approver entity refs into concrete user entity refs,
 * expanding catalog groups into members.
 */
export class ApproverResolver {
  constructor(
    private readonly config: Config,
    private readonly catalog: CatalogService,
    private readonly logger: LoggerService,
  ) {}

  async resolveApproverUserRefs(
    actionType: string,
    credentials: BackstageCredentials,
  ): Promise<string[]> {
    const keys = [
      `approvals.actions.${actionType}.approvers`,
      'approvals.defaults.approvers',
    ];

    let configured: string[] | undefined;
    for (const key of keys) {
      const fromAction = this.config.getOptionalStringArray(key);
      if (fromAction?.length) {
        configured = fromAction;
        break;
      }
    }

    if (!configured?.length) {
      throw new Error(
        `No approvers configured for action "${actionType}". Set approvals.actions.${actionType}.approvers or approvals.defaults.approvers.`,
      );
    }

    const userRefs = new Set<string>();

    for (const raw of configured) {
      const ref = raw.trim();
      if (!ref) continue;

      let parsed;
      try {
        parsed = parseEntityRef(ref);
      } catch {
        this.logger.warn(`approvals: skipping invalid entity ref "${raw}"`);
        continue;
      }

      const kind = parsed.kind.toLowerCase();

      if (kind === 'user') {
        userRefs.add(stringifyEntityRef(parsed));
        continue;
      }

      if (kind === 'group') {
        const groupRef = stringifyEntityRef(parsed);
        const members = await this.expandGroupToUsers(groupRef, credentials);
        members.forEach(u => userRefs.add(u));
        continue;
      }

      this.logger.warn(
        `approvals: approver ref "${ref}" must be user or group; ignored`,
      );
    }

    if (userRefs.size === 0) {
      throw new Error(
        `No user approvers resolved for action "${actionType}" after expanding groups.`,
      );
    }

    return [...userRefs].sort();
  }

  private async expandGroupToUsers(
    groupRef: string,
    credentials: BackstageCredentials,
  ): Promise<string[]> {
    const parsed = parseEntityRef(groupRef);
    const shortName = parsed.name;

    const { items: byFull } = await this.catalog.queryEntities(
      {
        query: {
          $all: [{ kind: 'user' }, { 'spec.memberOf': groupRef }],
        },
        limit: 500,
      },
      { credentials },
    );

    const { items: byShort } =
      byFull.length > 0
        ? { items: [] as typeof byFull }
        : await this.catalog.queryEntities(
            {
              query: {
                $all: [{ kind: 'user' }, { 'spec.memberOf': shortName }],
              },
              limit: 500,
            },
            { credentials },
          );

    const merged = new Map<string, (typeof byFull)[0]>();
    for (const e of [...byFull, ...byShort]) {
      merged.set(`${e.metadata.namespace ?? 'default'}/${e.metadata.name}`, e);
    }

    return [...merged.values()].map(e =>
      stringifyEntityRef({
        kind: 'User',
        namespace: e.metadata.namespace,
        name: e.metadata.name,
      }),
    );
  }
}
