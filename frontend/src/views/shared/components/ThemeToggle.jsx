import { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      // Default to system preference if no theme is explicitly saved in localStorage[cite: 2]
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply theme changes to document root and sync with localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Single-click toggle handler
  const handleToggle = () => {
    setIsDark(prev => !prev);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2.5 rounded-full bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] shadow-lg hover:bg-neutral-50 dark:hover:bg-[#2b1317] transition-all cursor-pointer text-neutral-700 dark:text-gray-200 flex items-center justify-center"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? (
        <Moon size={20} fill="currentColor" />
      ) : (
        <Moon size={20} />
      )}
    </button>
  );
}