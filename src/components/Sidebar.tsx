import React from 'react';
import { Search, BarChart3, Bookmark, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store';

const Sidebar: React.FC = () => {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    activeTab, 
    setActiveTab,
    totalEntries,
    loadedFiles,
  } = useAppStore();

  const navItems = [
    { 
      id: 'discover', 
      label: 'Discover', 
      icon: Search,
      description: 'Search and explore logs'
    },
    { 
      id: 'dashboards', 
      label: 'Dashboards', 
      icon: BarChart3,
      description: 'Analytics and visualizations'
    },
    { 
      id: 'saved-views', 
      label: 'Saved Views', 
      icon: Bookmark,
      description: 'Saved queries and filters'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      description: 'App configuration'
    },
  ];

  return (
    <aside className={`
      bg-card border-r border-border transition-all duration-300 ease-in-out relative
      ${sidebarCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Toggle button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-6 bg-card border border-border rounded-full p-1 hover:bg-accent transition-colors z-10"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className="p-4 space-y-4">
        {/* Stats section */}
        {!sidebarCollapsed && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Data Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Entries:</span>
                <span className="font-mono">{totalEntries.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Files:</span>
                <span className="font-mono">{loadedFiles.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left
                  ${isActive 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* File list (when not collapsed) */}
        {!sidebarCollapsed && loadedFiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Loaded Files</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {loadedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="p-2 bg-muted rounded text-xs space-y-1"
                >
                  <div className="font-medium truncate" title={file.name}>
                    {file.name}
                  </div>
                  <div className="text-muted-foreground">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default Sidebar;