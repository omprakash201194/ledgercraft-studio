import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, Theme } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
    theme: Theme;
}

// Initial dummy theme to satisfy type
const initialTheme = createTheme();

export const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    toggleTheme: () => { },
    setMode: () => { },
    theme: initialTheme,
});

export const useThemeContext = () => useContext(ThemeContext);

const getStoredTheme = (): ThemeMode => {
    try {
        const stored = localStorage.getItem('ledgercraft-theme');
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // ignore
    }
    return 'dark'; // Default
};

export const ThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);

    useEffect(() => {
        localStorage.setItem('ledgercraft-theme', mode);
    }, [mode]);

    const toggleTheme = () => {
        setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setMode = (newMode: ThemeMode) => {
        setModeState(newMode);
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === 'dark'
                        ? {
                            primary: { main: '#7C4DFF' },
                            secondary: { main: '#00E5FF' },
                            background: {
                                default: '#0A0E1A',
                                paper: '#121829',
                            },
                            divider: 'rgba(255,255,255,0.08)',
                        }
                        : {
                            primary: { main: '#5C35D2' },
                            secondary: { main: '#0097A7' },
                            background: {
                                default: '#F4F6FB',
                                paper: '#FFFFFF',
                            },
                            divider: 'rgba(0,0,0,0.08)',
                        }),
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                    h4: { fontWeight: 700 },
                    h5: { fontWeight: 600 },
                    h6: { fontWeight: 600 },
                },
                shape: {
                    borderRadius: 12,
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                scrollbarWidth: 'thin',
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                borderRight: 'none',
                            },
                        },
                    },
                    MuiListItemButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: 10,
                                marginBottom: 2,
                                '&.Mui-selected': {
                                    backgroundColor: mode === 'dark' ? 'rgba(124,77,255,0.15)' : 'rgba(92,53,210,0.1)',
                                },
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, setMode, theme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
