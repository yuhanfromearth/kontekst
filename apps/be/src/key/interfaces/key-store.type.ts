export type KeyEntry = {
  id: string;
  label: string;
  key: string;
  isActive?: boolean;
};

export type KeyStore = {
  keys: KeyEntry[];
};
