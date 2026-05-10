export type BraveKeyEntry = {
  id: string;
  label: string;
  key: string;
  isActive?: boolean;
};

export type BraveKeyStore = {
  keys: BraveKeyEntry[];
};
