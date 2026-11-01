"use client";

import { useEffect, useState } from "react";

export function LiveAccessCode({
  description = "Required for metered runs. Kept in this browser tab’s session.",
}: {
  description?: string;
}) {
  const [accessCode, setAccessCode] = useState("");
  useEffect(() => {
    setAccessCode(
      window.sessionStorage.getItem("comrdy-live-access-code") ?? "",
    );
  }, []);

  return (
    <div className="access-code-panel">
      <div>
        <label className="field-label" htmlFor="live-access-code">
          Live demo access code
        </label>
        <p id="live-access-code-description">{description}</p>
      </div>
      <input
        id="live-access-code"
        type="password"
        autoComplete="off"
        aria-describedby="live-access-code-description"
        value={accessCode}
        placeholder="Enter access code"
        onChange={(event) => {
          setAccessCode(event.target.value);
          if (event.target.value)
            window.sessionStorage.setItem(
              "comrdy-live-access-code",
              event.target.value,
            );
          else window.sessionStorage.removeItem("comrdy-live-access-code");
        }}
      />
    </div>
  );
}
