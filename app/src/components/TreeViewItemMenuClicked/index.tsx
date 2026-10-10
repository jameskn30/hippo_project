import { Menu, MenuItem } from "@mui/material";
import { useRef } from "react";
import type { VaultTreeItem } from "@/lib/vault/types";
import "./styles.css";

type TreeViewItemMenuClickedProps = {
  item: VaultTreeItem | null;
  position: { top: number; left: number } | undefined;
  onClose: () => void;
  onOpenNote: (path: string) => void;
  onRename: (item: VaultTreeItem) => void;
};

export function TreeViewItemMenuClicked({
  item,
  position,
  onClose,
  onOpenNote,
  onRename,
}: TreeViewItemMenuClickedProps) {
  const pendingRename = useRef<VaultTreeItem | null>(null);

  return (
    <Menu
      open={item !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={position}
      slotProps={{
        paper: { className: "vault-tree-context-menu" },
        list: { "aria-label": `Actions for ${item?.label ?? "tree item"}` },
        transition: {
          onExited: () => {
            // Start editing after the menu has restored focus to the tree row.
            const entry = pendingRename.current;
            pendingRename.current = null;
            if (entry) onRename(entry);
          },
        },
      }}
    >
      {item && !item.isDirectory && (
        <MenuItem
          onClick={() => {
            onOpenNote(item.id);
            onClose();
          }}
        >
          Open
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          if (item) pendingRename.current = item;
          onClose();
        }}
      >
        Rename
      </MenuItem>
    </Menu>
  );
}
