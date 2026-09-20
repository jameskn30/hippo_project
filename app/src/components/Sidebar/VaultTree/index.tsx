import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { TreeItemProps } from "@mui/x-tree-view/TreeItem";
import { useTreeItemModel } from "@mui/x-tree-view/hooks";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { VaultEntry, VaultTreeItem } from "@/lib/vault/types";
import "./styles.css";

type VaultTreeProps = {
  entries: VaultEntry[];
  selectedPath: string | null;
  onOpenNote: (path: string) => void;
};

function buildVaultTree(entries: VaultEntry[]): VaultTreeItem[] {
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
    items.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
    for (const item of items) {
      if (item.children) sortItems(item.children);
    }
  };

  sortItems(root);
  return root;
}

function findItem(items: VaultTreeItem[], id: string): VaultTreeItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = item.children && findItem(item.children, id);
    if (nested) return nested;
  }
}

function VaultTreeItem(props: TreeItemProps) {
  const item = useTreeItemModel<VaultTreeItem>(props.itemId);

  return (
    <TreeItem
      {...props}
      label={
        item?.isDirectory ? (
          <span className="vault-tree-directory-label">
            <ChevronRight aria-hidden="true" size={15} />
            {item.label}
          </span>
        ) : (
          item?.label
        )
      }
    />
  );
}

export function VaultTree({ entries, selectedPath, onOpenNote }: VaultTreeProps) {
  const items = useMemo(() => buildVaultTree(entries), [entries]);

  if (!items.length) {
    return <p className="vault-tree-empty">No Markdown notes in this vault.</p>;
  }

  return (
    <RichTreeView
      className="vault-tree"
      defaultExpandedItems={items.filter((item) => item.isDirectory).map((item) => item.id)}
      items={items}
      expansionTrigger="content"
      itemChildrenIndentation={16}
      onItemClick={(_, itemId) => {
        const item = findItem(items, itemId);
        if (item && !item.isDirectory) onOpenNote(item.id);
      }}
      selectedItems={selectedPath ?? null}
      slots={{ collapseIcon: null, endIcon: null, expandIcon: null, item: VaultTreeItem }}
    />
  );
}
