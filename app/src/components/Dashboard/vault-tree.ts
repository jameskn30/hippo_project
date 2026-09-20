import type { VaultEntry, VaultTreeItem } from "@/lib/vault/types";

function compareEntries(left: VaultEntry, right: VaultEntry) {
  if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

export function buildVaultTree(entries: VaultEntry[]): VaultTreeItem[] {
  const byPath = new Map<string, VaultTreeItem>();
  const root: VaultTreeItem[] = [];

  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    const item: VaultTreeItem = {
      id: entry.path,
      label: entry.name.replace(/\.md$/i, ""),
      isDirectory: entry.isDirectory,
      children: entry.isDirectory ? [] : undefined,
    };
    byPath.set(entry.path, item);

    const separator = entry.path.lastIndexOf("/");
    const parent = separator === -1 ? undefined : byPath.get(entry.path.slice(0, separator));
    if (parent?.children) parent.children.push(item);
    else root.push(item);
  }

  const sortItems = (items: VaultTreeItem[]) => {
    items.sort((left, right) =>
      compareEntries(
        { name: left.label, path: left.id, isDirectory: left.isDirectory },
        { name: right.label, path: right.id, isDirectory: right.isDirectory },
      ),
    );
    for (const item of items) {
      if (item.children) sortItems(item.children);
    }
  };

  sortItems(root);
  return root;
}

export function findVaultTreeItem(items: VaultTreeItem[], id: string): VaultTreeItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = item.children && findVaultTreeItem(item.children, id);
    if (nested) return nested;
  }
}
