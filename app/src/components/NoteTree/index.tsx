import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { displayName } from "../shared/note-utils";
import type { TreeNode, VaultEntry } from "../shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./styles.css";

type NoteTreeProps = {
  nodes: TreeNode[];
  selectedPath: string | null;
  isFolderExpanded: (path: string) => boolean;
  onFolderExpandedChange: (path: string, expanded: boolean) => void;
  onOpen: (entry: VaultEntry) => void;
  onRename: (entry: VaultEntry, title: string) => Promise<void>;
  onMove: (entry: VaultEntry, targetFolder: VaultEntry) => Promise<void>;
};

type TreeItemProps = {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  isFolderExpanded: (path: string) => boolean;
  onFolderExpandedChange: (path: string, expanded: boolean) => void;
  onOpen: (entry: VaultEntry) => void;
  onRename: (entry: VaultEntry, title: string) => Promise<void>;
  canMoveToFolder: (entry: VaultEntry, folder: VaultEntry) => boolean;
};

function TreeItem({
  node,
  depth,
  selectedPath,
  isFolderExpanded,
  onFolderExpandedChange,
  onOpen,
  onRename,
  canMoveToFolder,
}: TreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(() => displayName(node.name));
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<number | null>(null);
  const selected = node.path === selectedPath;
  const expanded = node.isDirectory && isFolderExpanded(node.path);
  const { ref: draggableRef, handleRef, isDragging } = useDraggable({ id: node.path, data: node });
  const { ref: droppableRef, isDropTarget } = useDroppable({ id: node.path, data: node, disabled: !node.isDirectory });

  useEffect(() => () => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
  }, []);

  const containerRef = (element: HTMLDivElement | null) => {
    draggableRef(element);
    handleRef(element);
    if (node.isDirectory) droppableRef(element);
  };

  const startRenaming = () => {
    setTitle(displayName(node.name));
    setIsRenaming(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const saveTitle = async () => {
    const nextTitle = title.trim();
    setIsRenaming(false);
    if (!nextTitle || nextTitle === displayName(node.name)) {
      setTitle(displayName(node.name));
      return;
    }
    await onRename(node, nextTitle);
  };

  const selectNode = () => {
    clickTimerRef.current = window.setTimeout(() => {
      if (node.isDirectory) onFolderExpandedChange(node.path, !expanded);
      else onOpen(node);
      clickTimerRef.current = null;
    }, 180);
  };

  const renameOnDoubleClick = () => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
    startRenaming();
  };

  return (
    <div ref={isRenaming ? undefined : containerRef}>
      {isRenaming ? (
        <div className="tree-row tree-row-renaming" style={{ paddingLeft: `${12 + depth * 15}px` }}>
          <span className="tree-caret">
            {node.isDirectory && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          </span>
          {!node.isDirectory && <FileText size={15} />}
          <Input
            ref={inputRef}
            className="tree-title-input"
            aria-label={`Rename ${node.isDirectory ? "folder" : "note"}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setTitle(displayName(node.name));
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      ) : (
        <Button
          className={`tree-row ${node.isDirectory ? "tree-folder-row" : ""} ${selected ? "tree-row-selected" : ""} ${isDragging ? "tree-row-dragging" : ""} ${isDropTarget ? "tree-row-drop-target" : ""}`}
          variant="ghost"
          style={{ paddingLeft: `${12 + depth * 15}px` }}
          onClick={selectNode}
          onDoubleClick={renameOnDoubleClick}
          aria-expanded={node.isDirectory ? expanded : undefined}
        >
          <span className="tree-caret">
            {node.isDirectory && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          </span>
          {!node.isDirectory && <FileText size={15} />}
          <span className="tree-label">{displayName(node.name)}</span>
        </Button>
      )}
      {node.isDirectory && expanded && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          isFolderExpanded={isFolderExpanded}
          onFolderExpandedChange={onFolderExpandedChange}
          onOpen={onOpen}
          onRename={onRename}
          canMoveToFolder={canMoveToFolder}
        />
      ))}
    </div>
  );
}

export function NoteTree({
  nodes,
  selectedPath,
  isFolderExpanded,
  onFolderExpandedChange,
  onOpen,
  onRename,
  onMove,
}: NoteTreeProps) {
  const [activeEntry, setActiveEntry] = useState<VaultEntry | null>(null);
  const entriesByPath = useMemo(() => {
    const entries = new Map<string, VaultEntry>();
    const visit = (items: TreeNode[]) => items.forEach((item) => {
      entries.set(item.path, item);
      visit(item.children);
    });
    visit(nodes);
    return entries;
  }, [nodes]);

  const canMoveToFolder = (entry: VaultEntry, folder: VaultEntry) => {
    const entryParentPath = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
    return folder.isDirectory
      && folder.path !== entryParentPath
      && folder.path !== entry.path
      && (!entry.isDirectory || !folder.path.startsWith(`${entry.path}/`));
  };

  return (
    <DragDropProvider
      sensors={(defaults) => [
        ...defaults.filter((sensor) => sensor !== PointerSensor),
        PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })] }),
        KeyboardSensor,
      ]}
      onDragStart={(event) => setActiveEntry(entriesByPath.get(String(event.operation.source?.id)) ?? null)}
      onDragEnd={(event) => {
        const source = entriesByPath.get(String(event.operation.source?.id));
        const target = entriesByPath.get(String(event.operation.target?.id));
        setActiveEntry(null);
        if (!event.canceled && source && target && canMoveToFolder(source, target)) void onMove(source, target);
      }}
    >
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          isFolderExpanded={isFolderExpanded}
          onFolderExpandedChange={onFolderExpandedChange}
          onOpen={onOpen}
          onRename={onRename}
          canMoveToFolder={canMoveToFolder}
        />
      ))}
      <DragOverlay>{activeEntry ? <div className="tree-drag-overlay">{displayName(activeEntry.name)}</div> : null}</DragOverlay>
    </DragDropProvider>
  );
}
