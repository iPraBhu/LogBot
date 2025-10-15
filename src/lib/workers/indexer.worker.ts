import { expose } from 'comlink';
import { LogSearchIndex } from '@/lib/search';
import type { LogEntry, SearchQuery, SearchResult } from '@/types';

interface IndexerWorkerAPI {
  createIndex: () => Promise<void>;
  addEntries: (entries: LogEntry[]) => Promise<void>;
  search: (query: SearchQuery) => Promise<SearchResult>;
  clear: () => Promise<void>;
  getStats: () => Promise<any>;
}

class IndexerWorker implements IndexerWorkerAPI {
  private index: LogSearchIndex;

  constructor() {
    this.index = new LogSearchIndex();
  }

  async createIndex(): Promise<void> {
    this.index = new LogSearchIndex();
  }

  async addEntries(entries: LogEntry[]): Promise<void> {
    await this.index.addEntries(entries);
    
    // Post progress update
    if (typeof self !== 'undefined') {
      self.postMessage({ 
        type: 'indexProgress', 
        data: { 
          added: entries.length,
          total: this.index.getAllEntries().length 
        } 
      });
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    return await this.index.search(query);
  }

  async clear(): Promise<void> {
    this.index.clear();
  }

  async getStats(): Promise<any> {
    return this.index.getStats();
  }
}

const worker = new IndexerWorker();
expose(worker);