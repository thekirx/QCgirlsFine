"use client";

import { useUITheme, type UITheme } from "./ui-theme-provider";

const themes: Array<{ value: UITheme; label: string }> = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
  { value: "windows98", label: "Windows 98" },
];

export function UIThemeToggle() {
  const { theme, selectTheme } = useUITheme();
  return (
    <div className="ui-theme-toggle" role="group" aria-label="Interface style">
      {themes.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => selectTheme(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
