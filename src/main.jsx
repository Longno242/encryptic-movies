import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/boot-splash.css";
import "./utils/bootSplash.js";
import "./styles/global.css";
import "./styles/encryptic-theme.css";
import "./styles/browse-modern.css";
import "./styles/media-cards.css";
import "./styles/ui-ultra.css";
import "./styles/motion-experience.css";
import "./styles/encryptic-revamp.css";

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
