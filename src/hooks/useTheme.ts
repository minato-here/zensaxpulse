import { useState, useEffect } from "react";

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("zensaxpulse-theme");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("zensaxpulse-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  return { darkMode, toggleTheme };
}

