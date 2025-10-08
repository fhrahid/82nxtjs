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
  {
    id: 'dark-blue',
    name: 'Dark Blue (Default)',
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
    id: 'midnight',
    name: 'Midnight',
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
    id: 'ocean',
    name: 'Ocean Blue',
    colors: {
      bg: '#0D1B2A',
      panel: '#1B263B',
      panelAlt: '#1E2D47',
      panelAccent: '#2A3F5F',
      text: '#E0E7F1',
      textDim: '#8FA5C7',
      primary: '#3A86FF',
      primaryGlow: '#3A86FF33',
      danger: '#EF476F',
      warn: '#FFD166',
      success: '#06FFA5',
      border: '#2D3E5C',
      sidebarBg: 'linear-gradient(180deg, #1B263B 0%, #15202D 100%)',
      sidebarBorder: '#2D3E5C',
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      bg: '#0F1810',
      panel: '#1A2420',
      panelAlt: '#1F2B26',
      panelAccent: '#253530',
      text: '#E5F2E8',
      textDim: '#95B89E',
      primary: '#4A9D5F',
      primaryGlow: '#4A9D5F33',
      danger: '#E63946',
      warn: '#F77F00',
      success: '#52B788',
      border: '#2A3830',
      sidebarBg: 'linear-gradient(180deg, #1A2420 0%, #151E19 100%)',
      sidebarBorder: '#2A3830',
    }
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    colors: {
      bg: '#130F1E',
      panel: '#1E1830',
      panelAlt: '#231C36',
      panelAccent: '#2D2440',
      text: '#EDE8F5',
      textDim: '#A195BD',
      primary: '#8B5CF6',
      primaryGlow: '#8B5CF633',
      danger: '#F43F5E',
      warn: '#FBBF24',
      success: '#10B981',
      border: '#332948',
      sidebarBg: 'linear-gradient(180deg, #1E1830 0%, #181326 100%)',
      sidebarBorder: '#332948',
    }
  },
  {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      bg: '#1A0F14',
      panel: '#2A1821',
      panelAlt: '#311D28',
      panelAccent: '#3D2433',
      text: '#F5E8ED',
      textDim: '#C295A8',
      primary: '#DC2F55',
      primaryGlow: '#DC2F5533',
      danger: '#E63946',
      warn: '#F77F00',
      success: '#06D6A0',
      border: '#3D2A34',
      sidebarBg: 'linear-gradient(180deg, #2A1821 0%, #20141A 100%)',
      sidebarBorder: '#3D2A34',
    }
  },
  {
    id: 'slate',
    name: 'Slate Gray',
    colors: {
      bg: '#0F1318',
      panel: '#1A1F26',
      panelAlt: '#1F252E',
      panelAccent: '#262D38',
      text: '#E8ECEF',
      textDim: '#94A3B8',
      primary: '#64748B',
      primaryGlow: '#64748B33',
      danger: '#EF4444',
      warn: '#F59E0B',
      success: '#22C55E',
      border: '#2A3340',
      sidebarBg: 'linear-gradient(180deg, #1A1F26 0%, #15191F 100%)',
      sidebarBorder: '#2A3340',
    }
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    colors: {
      bg: '#1A1410',
      panel: '#2A2018',
      panelAlt: '#31251D',
      panelAccent: '#3D2F24',
      text: '#F5EDE5',
      textDim: '#C2A885',
      primary: '#F59E0B',
      primaryGlow: '#F59E0B33',
      danger: '#DC2626',
      warn: '#FB923C',
      success: '#14B8A6',
      border: '#3D3028',
      sidebarBg: 'linear-gradient(180deg, #2A2018 0%, #201813 100%)',
      sidebarBorder: '#3D3028',
    }
  },
  {
    id: 'teal',
    name: 'Teal Wave',
    colors: {
      bg: '#0D1A1A',
      panel: '#1A2828',
      panelAlt: '#1E302F',
      panelAccent: '#253D3C',
      text: '#E5F5F5',
      textDim: '#8FB8B8',
      primary: '#14B8A6',
      primaryGlow: '#14B8A633',
      danger: '#F43F5E',
      warn: '#FBBF24',
      success: '#10B981',
      border: '#2A3E3D',
      sidebarBg: 'linear-gradient(180deg, #1A2828 0%, #15201F 100%)',
      sidebarBorder: '#2A3E3D',
    }
  },
  {
    id: 'steel',
    name: 'Steel Blue',
    colors: {
      bg: '#0E1419',
      panel: '#1A2229',
      panelAlt: '#1F272F',
      panelAccent: '#263139',
      text: '#E5EEF5',
      textDim: '#8FAAC2',
      primary: '#4682B4',
      primaryGlow: '#4682B433',
      danger: '#DC143C',
      warn: '#FF8C00',
      success: '#32CD32',
      border: '#2A3540',
      sidebarBg: 'linear-gradient(180deg, #1A2229 0%, #151B20 100%)',
      sidebarBorder: '#2A3540',
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
