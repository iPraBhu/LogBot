import React from 'react';
import { useAppStore } from '@/store';

const Settings: React.FC = () => {
  const { theme, setTheme, settings, setSettings } = useAppStore();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setSettings({ ...settings, theme: newTheme });
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Configure your log explorer</p>
      </div>
      
      <div className="max-w-2xl space-y-6">
        {/* Theme */}
        <div>
          <h3 className="text-lg font-medium mb-3">Appearance</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Data */}
        <div>
          <h3 className="text-lg font-medium mb-3">Data</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Max File Size</label>
              <div className="mt-1">
                <input
                  type="number"
                  value={Math.round(settings.maxFileSize / (1024 * 1024))}
                  onChange={(e) => setSettings({
                    ...settings,
                    maxFileSize: parseInt(e.target.value) * 1024 * 1024
                  })}
                  className="w-32 px-3 py-2 border border-input rounded-md bg-background"
                />
                <span className="ml-2 text-sm text-muted-foreground">MB</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Max Search Results</label>
              <div className="mt-1">
                <input
                  type="number"
                  value={settings.maxSearchResults}
                  onChange={(e) => setSettings({
                    ...settings,
                    maxSearchResults: parseInt(e.target.value)
                  })}
                  className="w-32 px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div>
          <h3 className="text-lg font-medium mb-3">Privacy</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!settings.enableCDN}
                onChange={(e) => setSettings({
                  ...settings,
                  enableCDN: !e.target.checked
                })}
                className="rounded"
              />
              <span className="text-sm">Block external requests (fonts, icons)</span>
            </label>
          </div>
        </div>

        {/* Storage */}
        <div>
          <h3 className="text-lg font-medium mb-3">Storage</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                if (confirm('This will clear all data. Are you sure?')) {
                  // TODO: Clear storage
                  console.log('Clear storage');
                }
              }}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              Clear All Data
            </button>
            <p className="text-xs text-muted-foreground">
              This will remove all loaded logs, saved views, and settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;