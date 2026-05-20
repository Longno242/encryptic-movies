import { useState } from "react";
import MediaBrowseRow from "./MediaBrowseRow";
import {
  getCustomLists,
  createCustomList,
  deleteCustomList,
  renameCustomList,
  removeFromCustomList,
} from "../utils/customLists";

export default function CustomListsPanel({
  onSelect,
  onSelectWithFx,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  ratingsMap,
  pickMode,
  onAddToPickList,
}) {
  const [lists, setLists] = useState(() => getCustomLists());
  const [activeId, setActiveId] = useState(lists[0]?.id || null);
  const [newName, setNewName] = useState("");

  const refresh = () => {
    const next = getCustomLists();
    setLists(next);
    if (!next.find((l) => l.id === activeId)) setActiveId(next[0]?.id || null);
  };

  const active = lists.find((l) => l.id === activeId);

  return (
    <div className="custom-lists-panel">
      <div className="custom-lists-panel__sidebar">
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`custom-lists-panel__tab${l.id === activeId ? " custom-lists-panel__tab--active" : ""}`}
            onClick={() => setActiveId(l.id)}
          >
            {l.name}
            <span className="custom-lists-panel__count">{l.items.length}</span>
          </button>
        ))}
        <div className="custom-lists-panel__new">
          <input
            type="text"
            placeholder="New list name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                const id = createCustomList(newName);
                setNewName("");
                refresh();
                setActiveId(id);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (!newName.trim()) return;
              const id = createCustomList(newName);
              setNewName("");
              refresh();
              setActiveId(id);
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="custom-lists-panel__main">
        {active ? (
          <>
            <div className="custom-lists-panel__head">
              <h3>{active.name}</h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const name = window.prompt("Rename list", active.name);
                  if (name) {
                    renameCustomList(active.id, name);
                    refresh();
                  }
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "#e55" }}
                onClick={() => {
                  if (window.confirm(`Delete "${active.name}"?`)) {
                    deleteCustomList(active.id);
                    refresh();
                  }
                }}
              >
                Delete
              </button>
            </div>
            {active.items.length > 0 ? (
              <MediaBrowseRow
                rowId={`list-${active.id}`}
                title=""
                items={active.items}
                onSelect={onSelect}
                onSelectWithFx={onSelectWithFx}
                watched={watched}
                onMarkWatched={onMarkWatched}
                onMarkUnwatched={onMarkUnwatched}
                ratingsMap={ratingsMap}
                onQuickAdd={pickMode ? onAddToPickList : undefined}
                activePickListId={active.id}
              />
            ) : (
              <p className="custom-lists-panel__empty">
                Use pick mode on Home to add titles here, or right-click cards.
              </p>
            )}
          </>
        ) : (
          <p className="custom-lists-panel__empty">Create a list to get started.</p>
        )}
      </div>
    </div>
  );
}
