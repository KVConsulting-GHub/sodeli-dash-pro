import React, { createContext, useContext } from "react";

type ThemeCtx = { darkMode: boolean };

const ThemeContext = createContext<ThemeCtx>({ darkMode: false });

export const ThemeProvider = ThemeContext.Provider;

export function useTheme() {
  return useContext(ThemeContext);
}
