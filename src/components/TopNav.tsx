import React from 'react';
import { Search, Menu, Moon, Sun, Settings, FileText, BarChart3, Bookmark } from 'lucide-react';
import { useAppStore } from '@/store';

const TopNav: React.FC = () => {
  const { 
    theme, 
    setTheme, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    activeTab,
    setActiveTab,
    query,
    setQuery,
  } = useAppStore();

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery({
      ...query,
      text: e.target.value,
    });
  };

  const navItems = [
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
    { id: 'saved-views', label: 'Saved Views', icon: Bookmark },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
      {/* Menu toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* App title */}
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">Local Log Explorer</h1>
      </div>

      {/* Navigation tabs */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global search */}
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search logs..."
          value={query.text}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={handleThemeToggle}
        className="p-2 hover:bg-accent rounded-md transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    </header>
  );
};

export default TopNav;