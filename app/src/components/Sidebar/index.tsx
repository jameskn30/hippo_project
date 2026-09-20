import { Search } from "lucide-react";
import "./styles.css";

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-brand">Hippo</div>
      <div className="sidebar-section">
        <span className="sidebar-section-title">Notes</span>
        <div className="sidebar-search" aria-hidden="true">
          <Search size={15} />
          <span>Search notes</span>
        </div>
      </div>
      <div className="sidebar-empty">Your notes will appear here.</div>
    </aside>
  );
}
