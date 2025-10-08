"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;
    panel: string;
    panelAlt: string;
    panelAccent: string;
    text: string;
    textDim: string;
    primary: string;
    primaryGlow: string;
    danger: string;
    warn: string;
    success: string;
    border: string;
    sidebarBg: string;
    sidebarBorder: string;
  };
}

export const themes: Theme[] = [
  // BRIGHT COLORS
  {
    id: 'bright-vibrant',
    name: '🌈 Bright Vibrant',
    colors: {
      bg: '#1A1625',
      panel: '#2D2440',
      panelAlt: '#352850',
      panelAccent: '#3D2F5C',
      text: '#F0E7FF',
      textDim: '#C4B5FD',
      primary: '#A855F7',
      primaryGlow: '#A855F733',
      danger: '#F43F5E',
      warn: '#FB923C',
      success: '#34D399',
      border: '#4C3A6E',
      sidebarBg: 'linear-gradient(180deg, #2D2440 0%, #241E35 100%)',
      sidebarBorder: '#4C3A6E',
    }
  },
  {
    id: 'bright-sunset',
    name: '🌅 Bright Sunset',
    colors: {
      bg: '#1F1419',
      panel: '#2D1F26',
      panelAlt: '#36252E',
      panelAccent: '#402D38',
      text: '#FFE8F0',
      textDim: '#FDB8D0',
      primary: '#EC4899',
      primaryGlow: '#EC489933',
      danger: '#F43F5E',
      warn: '#FB923C',
      success: '#22D3EE',
      border: '#4D3642',
      sidebarBg: 'linear-gradient(180deg, #2D1F26 0%, #251A20 100%)',
      sidebarBorder: '#4D3642',
    }
  },
  // MEDIUM COLORS
  {
    id: 'medium-ocean',
    name: '🌊 Medium Ocean',
    colors: {
      bg: '#0A1929',
      panel: '#1A2942',
      panelAlt: '#22304A',
      panelAccent: '#2A3A55',
      text: '#E3F2FD',
      textDim: '#90CAF9',
      primary: '#42A5F5',
      primaryGlow: '#42A5F533',
      danger: '#EF5350',
      warn: '#FFA726',
      success: '#66BB6A',
      border: '#344D68',
      sidebarBg: 'linear-gradient(180deg, #1A2942 0%, #14202F 100%)',
      sidebarBorder: '#344D68',
    }
  },
  {
    id: 'medium-earth',
    name: '🌍 Medium Earth',
    colors: {
      bg: '#1A1410',
      panel: '#2A241D',
      panelAlt: '#322A22',
      panelAccent: '#3D3329',
      text: '#F5E6D3',
      textDim: '#D4A574',
      primary: '#D97706',
      primaryGlow: '#D9770633',
      danger: '#DC2626',
      warn: '#F59E0B',
      success: '#059669',
      border: '#4A4035',
      sidebarBg: 'linear-gradient(180deg, #2A241D 0%, #201B16 100%)',
      sidebarBorder: '#4A4035',
    }
  },
  // PEACEFUL COLORS
  {
    id: 'peaceful-sage',
    name: '🍃 Peaceful Sage',
    colors: {
      bg: '#0F1614',
      panel: '#1A2620',
      panelAlt: '#1F2D26',
      panelAccent: '#25362E',
      text: '#E8F5F0',
      textDim: '#A5C9BA',
      primary: '#48BB78',
      primaryGlow: '#48BB7833',
      danger: '#F56565',
      warn: '#ED8936',
      success: '#68D391',
      border: '#2D3F38',
      sidebarBg: 'linear-gradient(180deg, #1A2620 0%, #151E1A 100%)',
      sidebarBorder: '#2D3F38',
    }
  },
  {
    id: 'peaceful-lavender',
    name: '💜 Peaceful Lavender',
    colors: {
      bg: '#15121A',
      panel: '#241F2E',
      panelAlt: '#2B2536',
      panelAccent: '#342D40',
      text: '#EDE7F6',
      textDim: '#B39DDB',
      primary: '#9575CD',
      primaryGlow: '#9575CD33',
      danger: '#EF5350',
      warn: '#FFA726',
      success: '#66BB6A',
      border: '#3D3548',
      sidebarBg: 'linear-gradient(180deg, #241F2E 0%, #1C1925 100%)',
      sidebarBorder: '#3D3548',
    }
  },
  // DARK COLORS
  {
    id: 'dark-blue',
    name: '🌑 Dark Blue',
    colors: {
      bg: '#0F1419',
      panel: '#1A1F2E',
      panelAlt: '#1E2233',
      panelAccent: '#262C3E',
      text: '#E5EAF0',
      textDim: '#9FB7D5',
      primary: '#4A7BD0',
      primaryGlow: '#4A7BD033',
      danger: '#F44336',
      warn: '#FF9800',
      success: '#4CAF50',
      border: '#2A3140',
      sidebarBg: 'linear-gradient(180deg, #1A1F2E 0%, #161B28 100%)',
      sidebarBorder: '#2A3140',
    }
  },
  {
    id: 'dark-midnight',
    name: '🌃 Dark Midnight',
    colors: {
      bg: '#0A0E1A',
      panel: '#141824',
      panelAlt: '#1A1F2E',
      panelAccent: '#1F2535',
      text: '#E8EDF5',
      textDim: '#8B9AB8',
      primary: '#5B7FDB',
      primaryGlow: '#5B7FDB33',
      danger: '#E74C3C',
      warn: '#F39C12',
      success: '#2ECC71',
      border: '#252B3A',
      sidebarBg: 'linear-gradient(180deg, #141824 0%, #0F131E 100%)',
      sidebarBorder: '#252B3A',
    }
  },
  {
    id: 'dark-void',
    name: '🕳️ Dark Void',
    colors: {
      bg: '#0A0A0A',
      panel: '#151515',
      panelAlt: '#1A1A1A',
      panelAccent: '#202020',
      text: '#F5F5F5',
      textDim: '#A0A0A0',
      primary: '#606060',
      primaryGlow: '#60606033',
      danger: '#FF5555',
      warn: '#FFAA00',
      success: '#55FF55',
      border: '#2A2A2A',
      sidebarBg: 'linear-gradient(180deg, #151515 0%, #0F0F0F 100%)',
      sidebarBorder: '#2A2A2A',
    }
  }
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    // Load theme from localStorage
    const savedThemeId = localStorage.getItem('admin-theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', currentTheme.colors.bg);
    root.style.setProperty('--theme-panel', currentTheme.colors.panel);
    root.style.setProperty('--theme-panel-alt', currentTheme.colors.panelAlt);
    root.style.setProperty('--theme-panel-accent', currentTheme.colors.panelAccent);
    root.style.setProperty('--theme-text', currentTheme.colors.text);
    root.style.setProperty('--theme-text-dim', currentTheme.colors.textDim);
    root.style.setProperty('--theme-primary', currentTheme.colors.primary);
    root.style.setProperty('--theme-primary-glow', currentTheme.colors.primaryGlow);
    root.style.setProperty('--theme-danger', currentTheme.colors.danger);
    root.style.setProperty('--theme-warn', currentTheme.colors.warn);
    root.style.setProperty('--theme-success', currentTheme.colors.success);
    root.style.setProperty('--theme-border', currentTheme.colors.border);
    root.style.setProperty('--theme-sidebar-bg', currentTheme.colors.sidebarBg);
    root.style.setProperty('--theme-sidebar-border', currentTheme.colors.sidebarBorder);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('admin-theme', themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
