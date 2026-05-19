import { Component } from "react";
import { EncrypticLogo } from "./Icons";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[Encryptic Movies ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg, #0a0a0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ width: 56, height: 56 }}>
            <EncrypticLogo size={56} />
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display, monospace)",
              fontSize: 26,
              letterSpacing: 1,
              color: "var(--text, #fff)",
            }}
          >
            Encryptic Movies hit a snag
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text2, rgba(255,255,255,0.55))",
              lineHeight: 1.6,
            }}
          >
            Something unexpected happened in this view. Your library and settings
            are safe — try again or reload the app.
          </p>

          {error?.message && (
            <pre
              style={{
                width: "100%",
                margin: 0,
                fontSize: 12,
                color: "var(--red, #e50914)",
                background: "rgba(229,9,20,0.06)",
                border: "1px solid rgba(229,9,20,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "left",
              }}
            >
              {error.message}
            </pre>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-secondary" onClick={this.handleRetry}>
              Try again
            </button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload Encryptic Movies
            </button>
          </div>
        </div>
      </div>
    );
  }
}
