export type VaultEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

export type NoteContent = {
  path: string;
  content: string;
};

export type NoteState = NoteContent & {
  savedContent: string;
};

export type SaveState = "saved" | "saving" | "error";

export type TreeNode = VaultEntry & {
  children: TreeNode[];
};
