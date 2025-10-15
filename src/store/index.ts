import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  LogEntry, 
  SearchQuery, 
  SearchResult, 
  SavedView, 
  AppSettings, 
  TimeRange, 
  QueryFilter 
} from '@/types';

interface AppState {
  // Search state
  query: SearchQuery;
  searchResults: SearchResult | null;
  isSearching: boolean;
  selectedEntries: Set<string>;
  
  // UI state
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  activeTab: 'discover' | 'dashboards' | 'saved-views' | 'settings';
  detailFlyoutEntry: LogEntry | null;
  
  // Data state
  loadedFiles: File[];
  totalEntries: number;
  isIndexing: boolean;
  indexingProgress: number;
  
  // Saved views
  savedViews: SavedView[];
  
  // Settings
  settings: AppSettings;
  
  // Actions
  setQuery: (query: SearchQuery) => void;
  setSearchResults: (results: SearchResult | null) => void;
  setIsSearching: (searching: boolean) => void;
  toggleEntrySelection: (entryId: string) => void;
  clearSelection: () => void;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: 'discover' | 'dashboards' | 'saved-views' | 'settings') => void;
  setDetailFlyoutEntry: (entry: LogEntry | null) => void;
  
  setLoadedFiles: (files: File[]) => void;
  setTotalEntries: (count: number) => void;
  setIsIndexing: (indexing: boolean) => void;
  setIndexingProgress: (progress: number) => void;
  
  setSavedViews: (views: SavedView[]) => void;
  addSavedView: (view: SavedView) => void;
  removeSavedView: (id: string) => void;
  
  setSettings: (settings: AppSettings) => void;
  
  // Helper actions
  addFilter: (filter: QueryFilter) => void;
  removeFilter: (index: number) => void;
  setTimeRange: (timeRange: TimeRange) => void;
}

const defaultTimeRange: TimeRange = {
  from: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  to: new Date(),
  preset: 'last24h',
};

const defaultSettings: AppSettings = {
  theme: 'dark',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm:ss',
  tableDensity: 'normal',
  maxSearchResults: 10000,
  indexChunkSize: 1000,
  enableCDN: false,
  autoSave: true,
  defaultTimeRange: 'last24h',
  enableFuzzySearch: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  customParsingRules: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: {
        text: '',
        filters: [],
        timeRange: defaultTimeRange,
      },
      searchResults: null,
      isSearching: false,
      selectedEntries: new Set(),
      
      theme: 'dark',
      sidebarCollapsed: false,
      activeTab: 'discover',
      detailFlyoutEntry: null,
      
      loadedFiles: [],
      totalEntries: 0,
      isIndexing: false,
      indexingProgress: 0,
      
      savedViews: [],
      settings: defaultSettings,
      
      // Actions
      setQuery: (query) => set({ query }),
      setSearchResults: (searchResults) => set({ searchResults }),
      setIsSearching: (isSearching) => set({ isSearching }),
      
      toggleEntrySelection: (entryId) => set((state) => {
        const newSelection = new Set(state.selectedEntries);
        if (newSelection.has(entryId)) {
          newSelection.delete(entryId);
        } else {
          newSelection.add(entryId);
        }
        return { selectedEntries: newSelection };
      }),
      
      clearSelection: () => set({ selectedEntries: new Set() }),
      
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setDetailFlyoutEntry: (detailFlyoutEntry) => set({ detailFlyoutEntry }),
      
      setLoadedFiles: (loadedFiles) => set({ loadedFiles }),
      setTotalEntries: (totalEntries) => set({ totalEntries }),
      setIsIndexing: (isIndexing) => set({ isIndexing }),
      setIndexingProgress: (indexingProgress) => set({ indexingProgress }),
      
      setSavedViews: (savedViews) => set({ savedViews }),
      addSavedView: (view) => set((state) => ({
        savedViews: [view, ...state.savedViews]
      })),
      removeSavedView: (id) => set((state) => ({
        savedViews: state.savedViews.filter(v => v.id !== id)
      })),
      
      setSettings: (settings) => set({ settings }),
      
      // Helper actions
      addFilter: (filter) => set((state) => ({
        query: {
          ...state.query,
          filters: [...state.query.filters, filter]
        }
      })),
      
      removeFilter: (index) => set((state) => ({
        query: {
          ...state.query,
          filters: state.query.filters.filter((_, i) => i !== index)
        }
      })),
      
      setTimeRange: (timeRange) => set((state) => ({
        query: {
          ...state.query,
          timeRange
        }
      })),
    }),
    {
      name: 'log-explorer-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        savedViews: state.savedViews,
        settings: state.settings,
      }),
    }
  )
);

// Derived selectors
export const useCurrentQuery = () => useAppStore((state) => state.query);
export const useSearchResults = () => useAppStore((state) => state.searchResults);
export const useSelectedEntries = () => useAppStore((state) => state.selectedEntries);
export const useTheme = () => useAppStore((state) => state.theme);
export const useSettings = () => useAppStore((state) => state.settings);