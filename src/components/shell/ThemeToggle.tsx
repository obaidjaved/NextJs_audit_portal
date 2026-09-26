"use client";

import { useEffect, useState } from "react";
import { NavIcons } from "./navIcons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync from the DOM attribute the blocking theme-init script already set.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((document.body.getAttribute("data-theme") as "light" | "dark") || "light");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.body.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tap-theme", next);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      className="theme-pill"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      aria-pressed={theme === "light"}
    >
      {NavIcons.sun}
      {NavIcons.moon}
      <span className="thumb">{NavIcons.thumbDot}</span>
    </button>
  );
}
