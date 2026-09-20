import { X } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import "./styles.css";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <IconButton label="Dismiss message" onClick={onDismiss}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
