import Dexie, { Table } from 'dexie';
import type { LogEntry, SavedView, AppSettings, Dashboard } from '@/types';

export interface StoredLogEntry extends Omit<LogEntry, 'timestamp'> {
  timestamp: number; // Store as timestamp for better indexing
}

export interface IndexMetadata {
  id: string;
  name: string;
  fileNames: string[];
  totalEntries: number;
  totalSize: number;
  created: number;
  lastAccessed: number;
  version: number;
}

export class LogDatabase extends Dexie {
  logEntries!: Table<StoredLogEntry>;
  savedViews!: Table<SavedView>;
  dashboards!: Table<Dashboard>;
  indexMetadata!: Table<IndexMetadata>;
  settings!: Table<AppSettings>;

  constructor() {
    super('LogExplorerDB');
    
    this.version(1).stores({
      logEntries: '++id, timestamp, level, file, source, service, host, lineNumber',
      savedViews: '++id, name, created, updated',
      dashboards: '++id, name, created, updated',
      indexMetadata: '++id, name, created, lastAccessed',
      settings: '++id',
    });

    // Hooks for data conversion
    this.logEntries.hook('creating', (primKey, obj) => {
      if (obj.timestamp instanceof Date) {
        obj.timestamp = obj.timestamp.getTime();
      }
    });

    this.logEntries.hook('reading', (obj) => {
      if (typeof obj.timestamp === 'number') {
        obj.timestamp = new Date(obj.timestamp);
      }
      return obj as any;
    });
  }

  async addLogEntries(entries: LogEntry[], indexId: string): Promise<void> {
    const storedEntries: StoredLogEntry[] = entries.map(entry => ({
      ...entry,
      timestamp: entry.timestamp.getTime(),
    }));

    await this.transaction('rw', this.logEntries, this.indexMetadata, async () => {
      await this.logEntries.bulkAdd(storedEntries);
      
      // Update metadata
      const metadata = await this.indexMetadata.get(indexId);
      if (metadata) {
        metadata.totalEntries += entries.length;
        metadata.lastAccessed = Date.now();
        await this.indexMetadata.put(metadata);
      }
    });
  }

  async getLogEntries(
    indexId?: string,
    limit?: number,
    offset?: number
  ): Promise<LogEntry[]> {
    let query = this.logEntries.orderBy('timestamp').reverse();
    
    if (limit) {
      if (offset) {
        query = query.offset(offset);
      }
      query = query.limit(limit);
    }

    const entries = await query.toArray();
    
    // Convert timestamps back to Date objects
    return entries.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    })) as LogEntry[];
  }

  async searchLogEntries(
    query: {
      timeRange?: { from: Date; to: Date };
      levels?: string[];
      files?: string[];
      text?: string;
    },
    limit = 1000
  ): Promise<LogEntry[]> {
    let collection = this.logEntries.orderBy('timestamp').reverse();

    // Apply time range filter
    if (query.timeRange) {
      collection = collection.filter(entry => 
        entry.timestamp >= query.timeRange!.from.getTime() &&
        entry.timestamp <= query.timeRange!.to.getTime()
      );
    }

    // Apply level filter
    if (query.levels && query.levels.length > 0) {
      collection = collection.filter(entry => 
        query.levels!.includes(entry.level)
      );
    }

    // Apply file filter
    if (query.files && query.files.length > 0) {
      collection = collection.filter(entry => 
        query.files!.includes(entry.file)
      );
    }

    // Apply text search (simple contains)
    if (query.text) {
      const searchText = query.text.toLowerCase();
      collection = collection.filter(entry => 
        entry.message.toLowerCase().includes(searchText)
      );
    }

    const entries = await collection.limit(limit).toArray();
    
    return entries.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    })) as LogEntry[];
  }

  async deleteLogEntries(indexId: string): Promise<void> {
    await this.transaction('rw', this.logEntries, this.indexMetadata, async () => {
      // Get metadata to know which entries to delete
      const metadata = await this.indexMetadata.get(indexId);
      if (metadata) {
        // For simplicity, we'll delete all entries (in a real app, you'd track which entries belong to which index)
        await this.logEntries.clear();
        await this.indexMetadata.delete(indexId);
      }
    });
  }

  async createIndex(name: string, fileNames: string[]): Promise<string> {
    const metadata: IndexMetadata = {
      id: crypto.randomUUID(),
      name,
      fileNames,
      totalEntries: 0,
      totalSize: 0,
      created: Date.now(),
      lastAccessed: Date.now(),
      version: 1,
    };

    await this.indexMetadata.add(metadata);
    return metadata.id;
  }

  async getIndexes(): Promise<IndexMetadata[]> {
    return this.indexMetadata.orderBy('lastAccessed').reverse().toArray();
  }

  async getSavedViews(): Promise<SavedView[]> {
    return this.savedViews.orderBy('updated').reverse().toArray();
  }

  async saveSavedView(view: SavedView): Promise<void> {
    await this.savedViews.put(view);
  }

  async deleteSavedView(id: string): Promise<void> {
    await this.savedViews.delete(id);
  }

  async getDashboards(): Promise<Dashboard[]> {
    return this.dashboards.orderBy('updated').reverse().toArray();
  }

  async saveDashboard(dashboard: Dashboard): Promise<void> {
    await this.dashboards.put(dashboard);
  }

  async deleteDashboard(id: string): Promise<void> {
    await this.dashboards.delete(id);
  }

  async getSettings(): Promise<AppSettings | null> {
    const settings = await this.settings.toArray();
    return settings.length > 0 ? settings[0] : null;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.settings.clear();
    await this.settings.add(settings);
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.logEntries, this.savedViews, this.dashboards, this.indexMetadata, this.settings, async () => {
      await this.logEntries.clear();
      await this.savedViews.clear();
      await this.dashboards.clear();
      await this.indexMetadata.clear();
      await this.settings.clear();
    });
  }

  async getStorageStats(): Promise<{
    logEntries: number;
    savedViews: number;
    dashboards: number;
    totalSize: number;
  }> {
    const [logCount, viewCount, dashboardCount] = await Promise.all([
      this.logEntries.count(),
      this.savedViews.count(),
      this.dashboards.count(),
    ]);

    // Estimate total size (rough approximation)
    const totalSize = logCount * 500; // Assume ~500 bytes per log entry

    return {
      logEntries: logCount,
      savedViews: viewCount,
      dashboards: dashboardCount,
      totalSize,
    };
  }
}

// Singleton instance
export const db = new LogDatabase();

// Helper functions
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    
    // Check if we need to initialize default settings
    const settings = await db.getSettings();
    if (!settings) {
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
      
      await db.saveSettings(defaultSettings);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function exportData(): Promise<string> {
  const [entries, views, dashboards, settings] = await Promise.all([
    db.getLogEntries(),
    db.getSavedViews(),
    db.getDashboards(),
    db.getSettings(),
  ]);

  return JSON.stringify({
    version: 1,
    exported: new Date().toISOString(),
    data: {
      logEntries: entries,
      savedViews: views,
      dashboards,
      settings,
    },
  }, null, 2);
}

export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.version !== 1) {
      throw new Error('Unsupported data version');
    }

    await db.transaction('rw', db.logEntries, db.savedViews, db.dashboards, db.settings, async () => {
      // Clear existing data
      await db.clearAllData();
      
      // Import new data
      if (data.data.logEntries) {
        const entries = data.data.logEntries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
        await db.addLogEntries(entries, 'imported');
      }
      
      if (data.data.savedViews) {
        for (const view of data.data.savedViews) {
          await db.saveSavedView(view);
        }
      }
      
      if (data.data.dashboards) {
        for (const dashboard of data.data.dashboards) {
          await db.saveDashboard(dashboard);
        }
      }
      
      if (data.data.settings) {
        await db.saveSettings(data.data.settings);
      }
    });
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
}