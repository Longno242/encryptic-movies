import { useState, useRef, useEffect, useCallback } from "react";
import { imgUrl } from "../utils/api";
import {
  isSidebarCollapsed,
  setSidebarCollapsed,
} from "../utils/sidebarLayout";
import {
  EncrypticLogo,
  HomeIcon,
  SearchIcon,
  HistoryIcon,
  FilmIcon,
  SettingsIcon,
  DownloadsQueueIcon,
  IssuesIcon,
  QuitIcon,
  BackIcon,
  HelpIcon,
} from "./Icons";

export default function Sidebar({
  page,
  onNavigate,
  onSearch,
  savedList,
  activeDownloads,
  onReorderSaved,
  onRemoveSaved,
  canGoBack,
  onBack,
  onShowShortcuts,
  onShowDocs,
}) {
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const dragFromIndex = useRef(null);
  const dragEl = useRef(null);
  const [collapsed, setCollapsed] = useState(() => isSidebarCollapsed());

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      setSidebarCollapsed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    window.addEventListener("click", dismiss);
    window.addEventListener("contextmenu", dismiss);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("contextmenu", dismiss);
    };
  }, []);

  const onDragStart = useCallback((e, index) => {
    dragFromIndex.current = index;
    dragEl.current = e.currentTarget;
    requestAnimationFrame(() => {
      if (dragEl.current) dragEl.current.style.opacity = "0.4";
    });
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragEl.current) dragEl.current.style.opacity = "1";
    dragFromIndex.current = null;
    dragEl.current = null;
    setDragOverIndex(null);
  }, []);

  const onDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault();
      const from = dragFromIndex.current;
      if (from === null || from === dropIndex) return;

      const next = [...savedList];
      const [moved] = next.splice(from, 1);
      next.splice(dropIndex, 0, moved);
      onReorderSaved(next.map((item) => `${item.media_type}_${item.id}`));
      setDragOverIndex(null);
    },
    [savedList, onReorderSaved],
  );

  const showTooltip = useCallback((e, title) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ title, y: rect.top + rect.height / 2 });
  }, []);

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => onNavigate("home")}
          title="Encryptic Movies home"
          aria-label="Encryptic Movies home"
        >
          <EncrypticLogo
            size={collapsed ? 40 : 88}
            className="sidebar-brand-logo"
          />
        </button>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {canGoBack && (
          <NavBtn icon={<BackIcon />} label="Back" onClick={onBack} />
        )}

        <NavBtn icon={<SearchIcon />} label="Search" onClick={onSearch} />
        <NavBtn
          icon={<HomeIcon />}
          label="Discover"
          active={page === "home"}
          onClick={() => onNavigate("home")}
        />
        <NavBtn
          icon={<HistoryIcon />}
          label="Library"
          active={page === "history"}
          onClick={() => onNavigate("history")}
        />
        <NavBtn
          icon={<DownloadsQueueIcon />}
          label="Downloads"
          active={page === "downloads"}
          badge={activeDownloads > 0 ? activeDownloads : null}
          onClick={() => onNavigate("downloads")}
        />
        <NavBtn
          icon={<IssuesIcon />}
          label="Issues & bugs"
          active={page === "issues"}
          onClick={() => onNavigate("issues")}
        />
      </nav>

      <div className="sidebar-sep" aria-hidden="true" />

      {!collapsed && (
      <div className="sidebar-saved">
        {savedList.map((item, index) => {
          const title = item.title || item.name;
          const key = `${item.media_type}_${item.id}`;
          return (
            <div
              key={key}
              className={`saved-thumb${dragOverIndex === index ? " drag-over" : ""}`}
              draggable
              style={{ cursor: "grab", position: "relative" }}
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnd={onDragEnd}
              onDragEnter={() => {
                if (dragFromIndex.current !== index) setDragOverIndex(index);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => onDrop(e, index)}
              onClick={() =>
                onNavigate(item.media_type === "tv" ? "tv" : "movie", item)
              }
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTooltip(null);
                setContextMenu({ item, x: e.clientX, y: e.clientY });
              }}
              onMouseEnter={(e) => showTooltip(e, title)}
              onMouseLeave={() => setTooltip(null)}
            >
              {item.poster_path ? (
                <img src={imgUrl(item.poster_path, "w200")} alt={title} />
              ) : (
                <div className="no-img">
                  <FilmIcon />
                </div>
              )}
              {dragOverIndex === index && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "var(--red)",
                    borderRadius: 2,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      )}

      {tooltip && (
        <div className="saved-thumb-tooltip" style={{ top: tooltip.y }}>
          {tooltip.title}
        </div>
      )}

      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="sidebar-context-menu-item"
            onClick={() => {
              onRemoveSaved?.(contextMenu.item);
              setContextMenu(null);
            }}
          >
            Remove from sidebar
          </button>
        </div>
      )}

      <div className="sidebar-bottom">
        <NavBtn
          icon={<HelpIcon />}
          label="Docs"
          onClick={onShowDocs}
        />
        <NavBtn
          icon={<HelpIcon />}
          label="Shortcuts"
          onClick={onShowShortcuts}
        />
        <NavBtn
          icon={<SettingsIcon />}
          label="Settings"
          active={page === "settings"}
          onClick={() => onNavigate("settings")}
        />
        <NavBtn
          icon={<QuitIcon />}
          label="Quit"
          onClick={() => window.electron?.quitApp?.()}
          danger
        />
      </div>
    </aside>
  );
}

function NavBtn({ active, onClick, icon, label, badge, danger }) {
  return (
    <button
      type="button"
      className={`sidebar-btn${active ? " active" : ""}${danger ? " sidebar-btn--danger" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
      title={label}
    >
      <span className="sidebar-btn-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="sidebar-btn-label">{label}</span>
      {badge != null && (
        <span className="sidebar-btn-badge">{badge}</span>
      )}
    </button>
  );
}
