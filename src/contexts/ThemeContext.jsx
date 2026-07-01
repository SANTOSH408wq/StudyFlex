import { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState('dark');
  const [actualTheme, setActualTheme] = useState('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      let active = themePreference;
      if (themePreference === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light';
      }
      setActualTheme(active);
      
      if (active === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themePreference]);

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
