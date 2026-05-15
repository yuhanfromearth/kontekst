export interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  updateCommand: string;
}
