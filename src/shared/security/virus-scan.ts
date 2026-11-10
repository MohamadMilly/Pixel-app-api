export interface VirusScanResult {
  readonly clean: boolean;
  readonly signature?: string;
}

/**
 * Virus-scan abstraction (port). Swap the mock for a real integration
 * (e.g. ClamAV via clamd, or a cloud scanning API) without touching the files feature.
 */
export interface VirusScanner {
  scan(path: string): Promise<VirusScanResult>;
}

/**
 * Mock scanner used until a real engine is wired in. Always reports clean, but keeps
 * the exact call-site and result shape the real scanner will use.
 */
export class MockVirusScanner implements VirusScanner {
  async scan(_path: string): Promise<VirusScanResult> {
    return { clean: true };
  }
}

export const virusScanner: VirusScanner = new MockVirusScanner();
