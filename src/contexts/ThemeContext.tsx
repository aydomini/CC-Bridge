import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')
  const [isUserTemporaryTheme, setIsUserTemporaryTheme] = useState(false)

  // Check theme on mount: 默认白天,系统夜间模式切换
  useEffect(() => {
    const initTheme = async () => {
      try {
        const prefs = await window.electronAPI.getSystemPreferences()

        // 如果系统是夜间模式,切换为夜间主题
        if (prefs.isDarkMode) {
          setTheme('dark')
        } else {
          // 默认白天主题
          setTheme('light')
        }
      } catch (error) {
        console.error('[ThemeContext] Failed to get system preferences:', error)
        // 默认白天主题
        setTheme('light')
      }
    }
    initTheme()

    // 时间自动切换: 7:00 → 白天, 19:00 → 夜间
    const checkTimeBasedTheme = () => {
      // 如果是用户临时切换的主题,不自动切换
      if (isUserTemporaryTheme) return

      const hour = new Date().getHours()
      const shouldBeDark = hour >= 19 || hour < 7
      const newTheme = shouldBeDark ? 'dark' : 'light'

      // 与当前主题不同时才切换
      if (theme !== newTheme) {
        setTheme(newTheme)
      }
    }

    // 立即检查并每小时检查一次
    checkTimeBasedTheme()
    const intervalId = setInterval(checkTimeBasedTheme, 60 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [isUserTemporaryTheme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
    // 标记为临时主题切换
    setIsUserTemporaryTheme(true)
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
