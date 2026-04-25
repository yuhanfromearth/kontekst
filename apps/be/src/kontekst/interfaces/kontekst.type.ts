type KontekstEntry = {
  content: string;
  shortcut?: string;
  isDefault?: boolean;
};

export type KontekstStore = Record<string, KontekstEntry>;
