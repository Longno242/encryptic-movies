import { memo } from "react";
import { imgUrl } from "../utils/api";

const CastCard = memo(function CastCard({ person, role, onClick }) {
  const name = person.name || "Unknown";
  return (
    <button type="button" className="cast-card" onClick={onClick}>
      <div className="cast-card__photo">
        {person.profile_path ? (
          <img src={imgUrl(person.profile_path, "w185")} alt="" loading="lazy" />
        ) : (
          <span className="cast-card__initial">{name.slice(0, 1)}</span>
        )}
      </div>
      <span className="cast-card__name">{name}</span>
      {role && <span className="cast-card__role">{role}</span>}
    </button>
  );
});

export default CastCard;
