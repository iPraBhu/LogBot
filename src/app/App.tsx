import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import Discover from '@/app/routes/Discover';
import Dashboards from '@/app/routes/Dashboards';
import SavedViews from '@/app/routes/SavedViews';
import Settings from '@/app/routes/Settings';

function App() {
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    // Initialize theme
    setTheme(theme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopNav />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/saved-views" element={<SavedViews />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;