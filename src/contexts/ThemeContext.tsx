import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')

  // Auto-detect system theme on mount
  useEffect(() => {
    const initTheme = async () => {
      // Always get system preferences first
      let systemTheme: Theme = 'light'
      try {
        const prefs = await window.electronAPI.getSystemPreferences()
        systemTheme = prefs.isDarkMode ? 'dark' : 'light'
      } catch (error) {
        console.error('[ThemeContext] Failed to get system preferences:', error)
      }

      // Check if user has manually set a preference
      const saved = localStorage.getItem('theme')
      const userSetTheme = localStorage.getItem('theme-user-set')

      if (saved && userSetTheme === 'true') {
        // User has manually set theme, respect their choice
        setTheme(saved as Theme)
      } else {
        // Use system theme
        setTheme(systemTheme)
        // Clear the flag since we're following system
        localStorage.removeItem('theme-user-set')
      }
    }
    initTheme()

    // Listen for system theme changes
    const handleSystemThemeChange = (isDarkMode: boolean) => {
      const userSetTheme = localStorage.getItem('theme-user-set')

      // Only auto-update if user hasn't manually set theme
      if (userSetTheme !== 'true') {
        const newTheme = isDarkMode ? 'dark' : 'light'
        console.log('[ThemeContext] System theme changed, updating to:', newTheme)
        setTheme(newTheme)
      }
    }

    window.electronAPI.onSystemThemeChanged(handleSystemThemeChange)
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light'
      // Mark that user has manually set theme
      localStorage.setItem('theme-user-set', 'true')
      return newTheme
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
