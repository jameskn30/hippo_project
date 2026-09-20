import {
  ChevronDown,
  FilePlus2,
  FileText,
  FolderPlus,
  Menu,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NoteTree } from "../NoteTree";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/IconButton";
import { Input } from "@/components/ui/input";
import { displayName, formatVaultPath } from "../shared/note-utils";
import type { TreeNode, VaultEntry } from "../shared/types";
import "./styles.css";

type SidebarProps = {
  vaultPath: string | null;
  search: string;
  searchResults: VaultEntry[];
  isSearching: boolean;
  tree: TreeNode[];
  selectedPath: string | null;
  width: number;
  onResize: (width: number) => void;
  onChooseVault: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onSearchChange: (value: string) => void;
  onOpenNote: (entry: VaultEntry) => void;
  onRenameEntry: (entry: VaultEntry, title: string) => Promise<void>;
  onMoveEntry: (entry: VaultEntry, targetFolder: VaultEntry | null) => Promise<void>;
  onCollapse: () => void;
};

export function Sidebar({
  vaultPath,
  search,
  searchResults,
  isSearching,
  tree,
  selectedPath,
  width,
  onResize,
  onChooseVault,
  onCreateNote,
  onCreateFolder,
  onSearchChange,
  onOpenNote,
  onRenameEntry,
  onMoveEntry,
  onCollapse,
}: SidebarProps) {
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [folderExpansion, setFolderExpansion] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("hippo.sidebar.folder-expansion") ?? "{}");
    } catch {
      return {};
    }
  });
  const [entryOrder, setEntryOrder] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("hippo.sidebar.entry-order") ?? "{}");
    } catch {
      return {};
    }
  });

  const folderStateKey = (path: string) => `${vaultPath ?? "no-vault"}:${path}`;

  useEffect(() => {
    window.localStorage.setItem("hippo.sidebar.folder-expansion", JSON.stringify(folderExpansion));
  }, [folderExpansion]);

  useEffect(() => {
    window.localStorage.setItem("hippo.sidebar.entry-order", JSON.stringify(entryOrder));
  }, [entryOrder]);

  const orderedTree = useMemo(() => {
    const sortChildren = (nodes: TreeNode[], parentPath: string): TreeNode[] => {
      const order = entryOrder[folderStateKey(parentPath)] ?? [];
      const ranks = new Map(order.map((path, index) => [path, index]));
      return nodes
        .map((node) => ({ ...node, children: sortChildren(node.children, node.path) }))
        .sort(
          (left, right) =>
            (ranks.get(left.path) ?? Number.MAX_SAFE_INTEGER) -
            (ranks.get(right.path) ?? Number.MAX_SAFE_INTEGER),
        );
    };
    return sortChildren(tree, "");
  }, [entryOrder, tree, vaultPath]);

  const reorderEntry = (entry: VaultEntry, target: VaultEntry, position: "above" | "below") => {
    const parentPath = target.path.includes("/")
      ? target.path.slice(0, target.path.lastIndexOf("/"))
      : "";
    const findChildren = (nodes: TreeNode[], path: string): TreeNode[] => {
      if (!path) return nodes;
      for (const node of nodes) {
        if (node.path === path) return node.children;
        const result = findChildren(node.children, path);
        if (result.length) return result;
      }
      return [];
    };
    const siblings = findChildren(orderedTree, parentPath).map((node) => node.path);
    const withoutEntry = siblings.filter((path) => path !== entry.path);
    const targetIndex = withoutEntry.indexOf(target.path);
    if (targetIndex < 0) return;
    const nextOrder = [...withoutEntry];
    nextOrder.splice(position === "above" ? targetIndex : targetIndex + 1, 0, entry.path);
    setEntryOrder((current) => ({ ...current, [folderStateKey(parentPath)]: nextOrder }));
  };

  const constrainWidth = (nextWidth: number) =>
    Math.min(Math.max(nextWidth, 210), Math.max(210, window.innerWidth - 500));

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, width };
    setIsResizing(true);
  };

  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    onResize(constrainWidth(dragStartRef.current.width + event.clientX - dragStartRef.current.x));
  };

  const stopResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    dragStartRef.current = null;
    setIsResizing(false);
  };

  return (
    <aside className="sidebar" style={{ flexBasis: width }}>
      <div className="brand-row">
        <div className="brand-mark">
          <span>h</span>
        </div>
        <span className="brand-name">hippo</span>
        <IconButton className="sidebar-collapse" label="Hide sidebar" onClick={onCollapse}>
          <Menu size={16} />
        </IconButton>
      </div>

      <Button className="vault-switcher" variant="ghost" onClick={onChooseVault}>
        <div className="vault-avatar">
          {vaultPath ? displayName(vaultPath).slice(0, 1).toUpperCase() : "H"}
        </div>
        <div className="vault-copy">
          <span className="vault-overline">CURRENT VAULT</span>
          <strong>{vaultPath ? displayName(vaultPath) : "Choose a vault"}</strong>
        </div>
        <ChevronDown size={15} className="text-subtle" />
      </Button>

      <div className="sidebar-section-heading">
        <span>YOUR NOTES</span>
        <div className="sidebar-actions">
          <IconButton
            className="tiny-icon-button"
            label="New folder"
            onClick={onCreateFolder}
            disabled={!vaultPath}
          >
            <FolderPlus size={15} />
          </IconButton>
          <IconButton
            className="tiny-icon-button"
            label="New note"
            onClick={onCreateNote}
            disabled={!vaultPath}
          >
            <FilePlus2 size={15} />
          </IconButton>
        </div>
      </div>

      <label className="search-box">
        <Search size={15} />
        <Input
          className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
        />
        {search && (
          <IconButton
            className="search-clear-button"
            label="Clear search"
            onClick={() => onSearchChange("")}
          >
            <X size={13} />
          </IconButton>
        )}
      </label>

      <div className="file-tree" aria-label="Vault notes">
        {!vaultPath ? (
          <div className="tree-empty">Open a folder to see your notes.</div>
        ) : search ? (
          <>
            <div className="tree-group-label">SEARCH RESULTS</div>
            {isSearching ? (
              <div className="tree-empty">Searching…</div>
            ) : searchResults.length ? (
              searchResults.map((entry) => (
                <Button
                  key={entry.path}
                  className={`tree-row ${selectedPath === entry.path ? "tree-row-selected" : ""}`}
                  variant="ghost"
                  onClick={() => onOpenNote(entry)}
                >
                  <span className="tree-caret" />
                  <FileText size={15} />
                  <span className="tree-label">{displayName(entry.path)}</span>
                </Button>
              ))
            ) : (
              <div className="tree-empty">No matching notes.</div>
            )}
          </>
        ) : tree.length ? (
          <NoteTree
            nodes={orderedTree}
            selectedPath={selectedPath}
            isFolderExpanded={(path) => folderExpansion[folderStateKey(path)] ?? false}
            onFolderExpandedChange={(path, expanded) =>
              setFolderExpansion((current) => ({ ...current, [folderStateKey(path)]: expanded }))
            }
            onOpen={onOpenNote}
            onRename={onRenameEntry}
            onMove={onMoveEntry}
            onReorder={reorderEntry}
          />
        ) : (
          <div className="tree-empty">No notes yet. Create one to get started.</div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="vault-location">
          <span className="status-dot" />{" "}
          <span>{vaultPath ? formatVaultPath(vaultPath) : "Local notes stay on this device"}</span>
        </div>
        <IconButton label="Open another vault" onClick={onChooseVault}>
          <MoreHorizontal size={17} />
        </IconButton>
      </div>
      <div
        className={`sidebar-resize-handle ${isResizing ? "sidebar-resize-handle-active" : ""}`}
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={210}
        aria-valuemax={Math.max(210, window.innerWidth - 500)}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onResize(constrainWidth(width - 12));
          if (event.key === "ArrowRight") onResize(constrainWidth(width + 12));
        }}
      />
    </aside>
  );
}
