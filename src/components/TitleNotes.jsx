import { useState, useEffect } from "react";
import { getTitleNote, setTitleNote } from "../utils/titleMeta";

export default function TitleNotes({ mediaType, id }) {
  const [note, setNote] = useState(() => getTitleNote(mediaType, id));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNote(getTitleNote(mediaType, id));
  }, [mediaType, id]);

  const save = (value) => {
    setNote(value);
    setTitleNote(mediaType, id, value);
  };

  return (
    <div className="title-notes">
      <button
        type="button"
        className="title-notes__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {note ? "📝 Edit note" : "📝 Add playback note"}
      </button>
      {open && (
        <div className="title-notes__panel">
          <textarea
            className="title-notes__input"
            placeholder="e.g. Use VidSrc dub, AllManga for sub…"
            value={note}
            onChange={(e) => save(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
