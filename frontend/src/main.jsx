import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./tokens.css";
import "./index.css";
import App from "./App.jsx";
import { setSession } from "./services/leetcodeAPI";

// If the menubar app opened us with a session token in the URL fragment,
// save it to localStorage and clean the fragment from the URL.
const hash = window.location.hash;
if (hash.startsWith("#lc-session=")) {
  const token = decodeURIComponent(hash.slice("#lc-session=".length));
  if (token) setSession(token);
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

const base = import.meta.env.BASE_URL ?? "/";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
