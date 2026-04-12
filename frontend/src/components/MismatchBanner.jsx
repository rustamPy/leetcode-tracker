import { useState } from "react";
import { useLeetCode } from "../hooks/useLeetCode";

/**
 * Sticky banner shown when the stored LEETCODE_SESSION belongs to a different
 * LeetCode account than the one configured in the app.
 */
export default function MismatchBanner({ onRequestLogin }) {
  const { username, sessionUser, changeUsername } = useLeetCode();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSwitch = () => {
    // Switch the app username to match the session
    changeUsername(sessionUser);
    setDismissed(true);
  };

  return (
    <div className="mm-banner" role="alert" data-testid="mismatch-banner">
      <span className="mm-text">
        Session belongs to <strong>{sessionUser}</strong> — app is tracking{" "}
        <strong>{username}</strong>
      </span>
      <div className="mm-actions">
        <button className="mm-btn" onClick={handleSwitch} title={`Switch app to "${sessionUser}"`}>
          Use {sessionUser}
        </button>
        <button className="mm-btn" onClick={onRequestLogin}>
          Re-login
        </button>
        <button
          className="mm-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
