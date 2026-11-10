import type { Router } from 'express';

/**
 * Every vertical slice exposes itself through this contract.
 * The v1 router mounts each module independently, so a slice that is missing
 * or broken never affects the others.
 */
export interface FeatureModule {
  /** Mount path relative to /api/v1, e.g. "/books" */
  readonly basePath: string;
  readonly router: Router;
}
