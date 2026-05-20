/** Shimmer placeholder row while home catalog loads. */
export default function BrowseRowSkeleton({ count = 8, rowIndex = 0 }) {
  return (
    <section
      className="browse-row browse-row--skeleton"
      style={{ "--row-i": rowIndex }}
      aria-hidden
    >
      <div className="browse-row__head">
        <div className="skeleton-line skeleton-line--title" />
      </div>
      <div className="browse-row__track-wrap">
        <div className="browse-row__track browse-row__track--skeleton">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="browse-row__slot browse-row__slot--skeleton">
              <div className="skeleton-poster" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
