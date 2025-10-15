import MiniSearch from 'minisearch';
import type { LogEntry, SearchQuery, SearchResult, FieldSuggestion } from '@/types';
import { generateId } from '@/lib/utils';

export interface IndexOptions {
  fields: string[];
  storeFields: string[];
  searchOptions?: {
    boost?: Record<string, number>;
    fuzzy?: number;
    prefix?: boolean;
    combineWith?: 'AND' | 'OR';
  };
}

export class LogSearchIndex {
  private miniSearch: MiniSearch<LogEntry>;
  private entries: Map<string, LogEntry> = new Map();
  private fieldStats: Map<string, FieldSuggestion> = new Map();

  constructor(options: IndexOptions = {
    fields: ['message', 'level', 'file', 'source', 'service', 'host'],
    storeFields: ['id', 'timestamp', 'level', 'message', 'file', 'source', 'service', 'host']
  }) {
    this.miniSearch = new MiniSearch({
      fields: options.fields,
      storeFields: options.storeFields,
      idField: 'id',
      searchOptions: {
        boost: { message: 2, level: 1.5 },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND',
        ...options.searchOptions,
      },
    });
  }

  async addEntries(entries: LogEntry[]): Promise<void> {
    // Add to MiniSearch index
    this.miniSearch.addAll(entries);
    
    // Store entries for retrieval
    entries.forEach(entry => {
      this.entries.set(entry.id, entry);
    });

    // Update field statistics
    this.updateFieldStats(entries);
  }

  async removeEntries(entryIds: string[]): Promise<void> {
    // Remove from MiniSearch index
    this.miniSearch.removeAll(entryIds);
    
    // Remove from entries map
    entryIds.forEach(id => {
      this.entries.delete(id);
    });
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = performance.now();
    
    try {
      // Apply time range filter first
      let candidateEntries = Array.from(this.entries.values()).filter(entry => 
        entry.timestamp >= query.timeRange.from && 
        entry.timestamp <= query.timeRange.to
      );

      // Apply field filters
      if (query.filters.length > 0) {
        candidateEntries = candidateEntries.filter(entry => 
          this.matchesFilters(entry, query.filters)
        );
      }

      // Perform text search if query text is provided
      let searchResults: LogEntry[] = candidateEntries;
      
      if (query.text.trim()) {
        const searchOptions = {
          fuzzy: query.fuzzy ? 0.2 : 0,
          prefix: true,
          combineWith: 'AND' as const,
        };

        const textResults = this.miniSearch.search(query.text, searchOptions);
        const resultIds = new Set(textResults.map(r => r.id));
        
        searchResults = candidateEntries.filter(entry => resultIds.has(entry.id));
      }

      // Sort by timestamp descending
      searchResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const took = performance.now() - startTime;

      return {
        entries: searchResults,
        total: searchResults.length,
        took: Math.round(took),
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        entries: [],
        total: 0,
        took: performance.now() - startTime,
      };
    }
  }

  private matchesFilters(entry: LogEntry, filters: any[]): boolean {
    return filters.every(filter => this.matchesFilter(entry, filter));
  }

  private matchesFilter(entry: LogEntry, filter: any): boolean {
    const value = this.getFieldValue(entry, filter.field);
    
    if (value === undefined || value === null) {
      return filter.operator === 'exists' ? false : true;
    }

    let matches = false;

    switch (filter.operator) {
      case 'equals':
        matches = value === filter.value;
        break;
      case 'contains':
        matches = String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        break;
      case 'startsWith':
        matches = String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
        break;
      case 'endsWith':
        matches = String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
        break;
      case 'gt':
        matches = Number(value) > Number(filter.value);
        break;
      case 'gte':
        matches = Number(value) >= Number(filter.value);
        break;
      case 'lt':
        matches = Number(value) < Number(filter.value);
        break;
      case 'lte':
        matches = Number(value) <= Number(filter.value);
        break;
      case 'range':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          const numValue = Number(value);
          matches = numValue >= Number(filter.value[0]) && numValue <= Number(filter.value[1]);
        }
        break;
      case 'exists':
        matches = value !== undefined && value !== null;
        break;
      default:
        matches = false;
    }

    return filter.negate ? !matches : matches;
  }

  private getFieldValue(entry: LogEntry, field: string): any {
    switch (field) {
      case 'timestamp':
        return entry.timestamp;
      case 'level':
        return entry.level;
      case 'message':
        return entry.message;
      case 'file':
        return entry.file;
      case 'source':
        return entry.source;
      case 'service':
        return entry.service;
      case 'host':
        return entry.host;
      case 'lineNumber':
        return entry.lineNumber;
      default:
        return entry.fields?.[field];
    }
  }

  private updateFieldStats(entries: LogEntry[]): void {
    const fieldCounts = new Map<string, Map<any, number>>();
    
    entries.forEach(entry => {
      // Standard fields
      this.updateFieldStat(fieldCounts, 'level', entry.level);
      this.updateFieldStat(fieldCounts, 'file', entry.file);
      this.updateFieldStat(fieldCounts, 'source', entry.source);
      this.updateFieldStat(fieldCounts, 'service', entry.service);
      this.updateFieldStat(fieldCounts, 'host', entry.host);
      
      // Custom fields
      if (entry.fields) {
        Object.entries(entry.fields).forEach(([key, value]) => {
          this.updateFieldStat(fieldCounts, key, value);
        });
      }
    });

    // Convert to field suggestions
    fieldCounts.forEach((valueCounts, field) => {
      const values = Array.from(valueCounts.keys());
      const totalCount = Array.from(valueCounts.values()).reduce((sum, count) => sum + count, 0);
      
      this.fieldStats.set(field, {
        field,
        type: this.inferFieldType(values),
        cardinality: values.length,
        examples: values.slice(0, 10),
      });
    });
  }

  private updateFieldStat(fieldCounts: Map<string, Map<any, number>>, field: string, value: any): void {
    if (value === undefined || value === null) return;
    
    if (!fieldCounts.has(field)) {
      fieldCounts.set(field, new Map());
    }
    
    const valueCounts = fieldCounts.get(field)!;
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  }

  private inferFieldType(values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (values.length === 0) return 'string';
    
    const sample = values[0];
    
    if (typeof sample === 'boolean') return 'boolean';
    if (typeof sample === 'number') return 'number';
    if (sample instanceof Date) return 'date';
    
    // Check if all values are numbers
    if (values.every(v => !isNaN(Number(v)))) return 'number';
    
    // Check if all values are dates
    if (values.every(v => !isNaN(Date.parse(v)))) return 'date';
    
    return 'string';
  }

  getFieldSuggestions(): FieldSuggestion[] {
    return Array.from(this.fieldStats.values());
  }

  getEntry(id: string): LogEntry | undefined {
    return this.entries.get(id);
  }

  getAllEntries(): LogEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.miniSearch.removeAll();
    this.entries.clear();
    this.fieldStats.clear();
  }

  getStats() {
    return {
      totalEntries: this.entries.size,
      fieldsCount: this.fieldStats.size,
      indexSize: JSON.stringify(Array.from(this.entries.values())).length,
    };
  }
}

// Singleton instance
let globalIndex: LogSearchIndex | null = null;

export function getSearchIndex(): LogSearchIndex {
  if (!globalIndex) {
    globalIndex = new LogSearchIndex();
  }
  return globalIndex;
}

export function resetSearchIndex(): void {
  globalIndex = new LogSearchIndex();
}