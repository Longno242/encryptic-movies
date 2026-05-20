import {
  ISSUE_SECTIONS,
  getIssuesBySection,
} from "../data/knownIssues";
import { WarningIcon } from "../components/Icons";

const SEVERITY_LABEL = {
  error: "Critical",
  warning: "Known issue",
  info: "Tip",
};

function IssueCard({ issue }) {
  return (
    <article
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
      <h3 className="issues-card__title">{issue.title}</h3>
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
  );
}

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
            Current problems and recent fixes for Encryptic Movies. Not every
            item affects every title — many depend on the server or your network.
          </p>
        </div>
      </header>

      {ISSUE_SECTIONS.map((section) => {
        const items = getIssuesBySection(section.id);
        if (!items.length) return null;
        return (
          <section
            key={section.id}
            className={`issues-page__section issues-page__section--${section.id}`}
            aria-labelledby={`issues-section-${section.id}`}
          >
            <div className="issues-page__section-head">
              <h2
                id={`issues-section-${section.id}`}
                className="issues-page__section-title"
              >
                {section.title}
              </h2>
              <p className="issues-page__section-desc">{section.description}</p>
            </div>
            <div className="issues-page__list" role="list">
              {items.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        );
      })}

      <footer className="issues-page__footer">
        <p>
          Still stuck? Note which <strong>source server</strong> you used and
          check Settings or the download log, then report to Project Encryptic
          with those details.
        </p>
      </footer>
    </div>
  );
}
