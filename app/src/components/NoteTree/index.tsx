import { PointerActivationConstraints } from "@dnd-kit/dom";
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayName } from "../shared/note-utils";
import type { TreeNode, VaultEntry } from "../shared/types";
import "./styles.css";

const FILE_ROW_HEIGHT = 31;
const FOLDER_ROW_HEIGHT = 40;
const ROOT_DROP_ZONE_ID = "hippo-vault-root";
const reorderZoneId = (path: string, position: "above" | "below") =>
  `hippo-reorder:${position}:${path}`;
const folderHeaderZoneId = (path: string) => `hippo-folder-target:${path}`;

type NoteTreeProps = {
  nodes: TreeNode[];
  selectedPath: string | null;
  isFolderExpanded: (path: string) => boolean;
  onFolderExpandedChange: (path: string, expanded: boolean) => void;
  onOpen: (entry: VaultEntry) => void;
  onRename: (entry: VaultEntry, title: string) => Promise<void>;
  onMove: (entry: VaultEntry, targetFolder: VaultEntry | null) => Promise<void>;
  onReorder: (entry: VaultEntry, target: VaultEntry, position: "above" | "below") => void;
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
  calculateFolderDropZoneHeight: (folder: TreeNode) => number;
  activeEntry: VaultEntry | null;
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
  calculateFolderDropZoneHeight,
  activeEntry,
}: TreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(() => displayName(node.name));
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<number | null>(null);
  const selected = node.path === selectedPath;
  const expanded = node.isDirectory && isFolderExpanded(node.path);
  const folderDropZoneHeight = node.isDirectory ? calculateFolderDropZoneHeight(node) : 0;
  const { ref: draggableRef, handleRef, isDragging } = useDraggable({ id: node.path, data: node });
  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: node.path,
    data: node,
    disabled: !node.isDirectory,
    collisionPriority: depth,
  });

  const sameParentAsActive =
    activeEntry &&
    (activeEntry.path.includes("/")
      ? activeEntry.path.slice(0, activeEntry.path.lastIndexOf("/"))
      : "") === (node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "");
  const isValidReorderTarget = Boolean(sameParentAsActive && activeEntry?.path !== node.path);
  const aboveZone = useDroppable({
    id: reorderZoneId(node.path, "above"),
    disabled: !isValidReorderTarget,
    collisionPriority: 100 + depth,
  });
  const belowZone = useDroppable({
    id: reorderZoneId(node.path, "below"),
    disabled: !isValidReorderTarget,
    collisionPriority: 100 + depth,
  });
  const folderHeaderZone = useDroppable({
    id: folderHeaderZoneId(node.path),
    disabled: !node.isDirectory,
    collisionPriority: 50 + depth,
  });

  useEffect(
    () => () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    },
    [],
  );

  const draggableRowRef = (element: HTMLDivElement | null) => {
    draggableRef(element);
    handleRef(element);
    if (node.isDirectory) folderHeaderZone.ref(element);
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
    <div
      className="tree-item"
      style={node.isDirectory ? { height: `${folderDropZoneHeight}px` } : undefined}
    >
      {node.isDirectory && (
        <div ref={droppableRef} className="tree-folder-dropzone" aria-hidden="true" />
      )}
      {isRenaming ? (
        <div className="tree-row tree-row-renaming" style={{ paddingLeft: `${12 + depth * 15}px` }}>
          <span className="tree-caret">
            {node.isDirectory &&
              (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
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
        <div ref={draggableRowRef} className="tree-row-host">
          <div
            ref={aboveZone.ref}
            className={`tree-reorder-zone tree-reorder-zone-above ${aboveZone.isDropTarget ? "tree-reorder-zone-active" : ""}`}
            aria-hidden="true"
          />
          <Button
            className={`tree-row ${node.isDirectory ? "tree-folder-row" : ""} ${selected ? "tree-row-selected" : ""} ${isDragging ? "tree-row-dragging" : ""} ${isDropTarget || folderHeaderZone.isDropTarget ? "tree-row-drop-target" : ""}`}
            variant="ghost"
            style={{ paddingLeft: `${12 + depth * 15}px` }}
            onClick={selectNode}
            onDoubleClick={renameOnDoubleClick}
            aria-expanded={node.isDirectory ? expanded : undefined}
          >
            <span className="tree-caret">
              {node.isDirectory &&
                (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
            </span>
            {!node.isDirectory && <FileText size={15} />}
            <span className="tree-label">{displayName(node.name)}</span>
          </Button>
          <div
            ref={belowZone.ref}
            className={`tree-reorder-zone tree-reorder-zone-below ${belowZone.isDropTarget ? "tree-reorder-zone-active" : ""}`}
            aria-hidden="true"
          />
        </div>
      )}
      {node.isDirectory &&
        expanded &&
        node.children.map((child) => (
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
            calculateFolderDropZoneHeight={calculateFolderDropZoneHeight}
            activeEntry={activeEntry}
          />
        ))}
    </div>
  );
}

function TreeRootDropZone({ children }: { children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: ROOT_DROP_ZONE_ID, collisionPriority: -1 });
  return (
    <div
      ref={ref}
      className={`tree-root-dropzone ${isDropTarget ? "tree-root-dropzone-active" : ""}`}
    >
      {children}
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
  onReorder,
}: NoteTreeProps) {
  const [activeEntry, setActiveEntry] = useState<VaultEntry | null>(null);
  const entriesByPath = useMemo(() => {
    const entries = new Map<string, VaultEntry>();
    const visit = (items: TreeNode[]) =>
      items.forEach((item) => {
        entries.set(item.path, item);
        visit(item.children);
      });
    visit(nodes);
    return entries;
  }, [nodes]);
  const reorderTargets = useMemo(() => {
    const targets = new Map<string, { entry: VaultEntry; position: "above" | "below" }>();
    entriesByPath.forEach((entry) => {
      targets.set(reorderZoneId(entry.path, "above"), { entry, position: "above" });
      targets.set(reorderZoneId(entry.path, "below"), { entry, position: "below" });
    });
    return targets;
  }, [entriesByPath]);
  const folderHeaderTargets = useMemo(() => {
    const targets = new Map<string, VaultEntry>();
    entriesByPath.forEach((entry) => {
      if (entry.isDirectory) targets.set(folderHeaderZoneId(entry.path), entry);
    });
    return targets;
  }, [entriesByPath]);

  const canMoveToFolder = (entry: VaultEntry, folder: VaultEntry) => {
    const entryParentPath = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : "";
    return (
      folder.isDirectory &&
      folder.path !== entryParentPath &&
      folder.path !== entry.path &&
      (!entry.isDirectory || !folder.path.startsWith(`${entry.path}/`))
    );
  };

  const calculateFolderDropZoneHeight = (folder: TreeNode): number => {
    if (!isFolderExpanded(folder.path)) return FOLDER_ROW_HEIGHT;
    return (
      FOLDER_ROW_HEIGHT +
      folder.children.reduce((height, child) => {
        if (!child.isDirectory) return height + FILE_ROW_HEIGHT;
        return height + calculateFolderDropZoneHeight(child);
      }, 0)
    );
  };

  return (
    <DragDropProvider
      sensors={(defaults) => [
        ...defaults.filter((sensor) => sensor !== PointerSensor),
        PointerSensor.configure({
          activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
        }),
        KeyboardSensor,
      ]}
      onDragStart={(event) =>
        setActiveEntry(entriesByPath.get(String(event.operation.source?.id)) ?? null)
      }
      onDragEnd={(event) => {
        const source = entriesByPath.get(String(event.operation.source?.id));
        const targetId = String(event.operation.target?.id ?? "");
        const reorderTarget = reorderTargets.get(targetId);
        const isRootTarget = targetId === ROOT_DROP_ZONE_ID;
        const target = isRootTarget
          ? null
          : (folderHeaderTargets.get(targetId) ?? entriesByPath.get(targetId) ?? null);
        setActiveEntry(null);
        if (!event.canceled && source && reorderTarget) {
          onReorder(source, reorderTarget.entry, reorderTarget.position);
          return;
        }
        if (
          !event.canceled &&
          source &&
          (isRootTarget || (target && canMoveToFolder(source, target)))
        )
          void onMove(source, target);
      }}
    >
      <TreeRootDropZone>
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
            calculateFolderDropZoneHeight={calculateFolderDropZoneHeight}
            activeEntry={activeEntry}
          />
        ))}
      </TreeRootDropZone>
      <DragOverlay>
        {activeEntry ? (
          <div className="tree-drag-overlay">{displayName(activeEntry.name)}</div>
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
