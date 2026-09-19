import type { TreeNode, VaultEntry } from "./types";

export function buildTree(entries: VaultEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const byPath = new Map<string, TreeNode>();
  const ordered = [...entries].sort((left, right) => left.path.localeCompare(right.path));

  for (const entry of ordered) {
    const node: TreeNode = { ...entry, children: [] };
    byPath.set(entry.path, node);
    const parentPath = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : "";
    const parent = byPath.get(parentPath);

    if (parent) parent.children.push(node);
    else root.push(node);
  }

  return root;
}

export function displayName(path: string) {
  return path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
}

export function formatVaultPath(path: string) {
  return path.split("/").filter(Boolean).slice(-2).join("/");
}
