type VoicePrefEntry = {
  name?: string;
  shortcut?: string;
  isDefault?: boolean;
};

export type VoicePrefStore = Record<string, Record<string, VoicePrefEntry>>;
