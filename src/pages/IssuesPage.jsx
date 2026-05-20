import { KNOWN_ISSUES } from "../data/knownIssues";
import { WarningIcon } from "../components/Icons";

const SEVERITY_LABEL = {
  error: "Critical",
  warning: "Known issue",
  info: "Tip",
};

export default function IssuesPage() {
  return (
    <div className="fade-in issues-page">
      <header className="issues-page__header">
        <div className="issues-page__header-icon" aria-hidden>
          <WarningIcon size={28} />
        </div>
        <div>
          <h1 className="issues-page__title">Issues &amp; bugs</h1>
          <p className="issues-page__subtitle">
            Current known problems and what you can try while Project Encryptic
            works on fixes. Not everything here affects every title — many issues
            are source- or network-specific.
          </p>
        </div>
      </header>

      <div className="issues-page__list" role="list">
        {KNOWN_ISSUES.map((issue) => (
          <article
            key={issue.id}
            className={`issues-card issues-card--${issue.severity}`}
            role="listitem"
          >
            <div className="issues-card__meta">
              <span
                className={`issues-card__severity issues-card__severity--${issue.severity}`}
              >
                {SEVERITY_LABEL[issue.severity] || "Issue"}
              </span>
              <span className="issues-card__status">{issue.status}</span>
            </div>
            <h2 className="issues-card__title">{issue.title}</h2>
            <p className="issues-card__summary">{issue.summary}</p>
            <div className="issues-card__try">
              <div className="issues-card__try-label">What to try</div>
              <ul>
                {issue.tryThese.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <footer className="issues-page__footer">
        <p>
          Still stuck? Note which <strong>source server</strong> you used and
          check Settings → downloads log or player behavior, then report to
          Project Encryptic with those details.
        </p>
      </footer>
    </div>
  );
}
