export type VaultEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

export type VaultTreeItem = {
  id: string;
  label: string;
  isDirectory: boolean;
  children?: VaultTreeItem[];
};
