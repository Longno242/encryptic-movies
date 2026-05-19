import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/boot-splash.css";
import "./utils/bootSplash.js";
import "./styles/global.css";
import "./styles/encryptic-theme.css";
import "./styles/browse-modern.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
