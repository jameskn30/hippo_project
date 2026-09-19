import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { displayName } from "../shared/note-utils";
import type { TreeNode, VaultEntry } from "../shared/types";
import { Button } from "@/components/ui/button";

type NoteTreeProps = {
  nodes: TreeNode[];
  selectedPath: string | null;
  onOpen: (entry: VaultEntry) => void;
};

type TreeItemProps = {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onOpen: (entry: VaultEntry) => void;
};

function TreeItem({ node, depth, selectedPath, onOpen }: TreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const selected = node.path === selectedPath;

  return (
    <div>
      <Button
        className={`tree-row ${selected ? "tree-row-selected" : ""}`}
        variant="ghost"
        style={{ paddingLeft: `${12 + depth * 15}px` }}
        onClick={() => (node.isDirectory ? setExpanded((value) => !value) : onOpen(node))}
        aria-expanded={node.isDirectory ? expanded : undefined}
      >
        <span className="tree-caret">
          {node.isDirectory && (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
        </span>
        {node.isDirectory ? expanded ? <FolderOpen size={15} /> : <Folder size={15} /> : <FileText size={15} />}
        <span className="tree-label">{displayName(node.name)}</span>
      </Button>
      {node.isDirectory && expanded && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

export function NoteTree({ nodes, selectedPath, onOpen }: NoteTreeProps) {
  return nodes.map((node) => (
    <TreeItem key={node.path} node={node} depth={0} selectedPath={selectedPath} onOpen={onOpen} />
  ));
}
