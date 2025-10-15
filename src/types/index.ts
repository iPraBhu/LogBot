export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  file: string;
  raw: string;
  fields?: Record<string, any>;
  source?: string;
  service?: string;
  host?: string;
  lineNumber?: number;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface ParsedLog {
  entries: LogEntry[];
  errors: ParseError[];
  totalLines: number;
  fileName: string;
  fileSize: number;
}

export interface ParseError {
  line: number;
  content: string;
  error: string;
}

export interface SearchQuery {
  text: string;
  filters: QueryFilter[];
  timeRange: TimeRange;
  fuzzy?: boolean;
  caseSensitive?: boolean;
}

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | Date;
  negate?: boolean;
}

export type FilterOperator = 
  | 'equals' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'range' 
  | 'exists';

export interface TimeRange {
  from: Date;
  to: Date;
  preset?: TimePreset;
}

export type TimePreset = 
  | 'last15m' 
  | 'last1h' 
  | 'last4h' 
  | 'last24h' 
  | 'last7d' 
  | 'last30d' 
  | 'custom';

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  columns: string[];
  created: Date;
  updated: Date;
}

export interface IndexStats {
  totalEntries: number;
  totalFiles: number;
  totalSize: number;
  indexSize: number;
  lastUpdated: Date;
  levelCounts: Record<LogLevel, number>;
  fileCounts: Record<string, number>;
}

export interface SearchResult {
  entries: LogEntry[];
  total: number;
  took: number;
  aggregations?: Record<string, any>;
}

export interface TimeHistogramBucket {
  timestamp: number;
  count: number;
  levels: Record<LogLevel, number>;
}

export interface FieldSuggestion {
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  cardinality: number;
  examples: any[];
}

export interface ParseProgress {
  fileName: string;
  totalLines: number;
  processedLines: number;
  errors: number;
  speed: number; // lines per second
  eta: number; // estimated time remaining in ms
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  dateFormat: string;
  timeFormat: string;
  tableDensity: 'compact' | 'normal' | 'comfortable';
  maxSearchResults: number;
  indexChunkSize: number;
  enableCDN: boolean;
  autoSave: boolean;
  defaultTimeRange: TimePreset;
  enableFuzzySearch: boolean;
  maxFileSize: number; // in bytes
  customParsingRules: ParsingRule[];
}

export interface ParsingRule {
  id: string;
  name: string;
  pattern: string;
  fields: FieldMapping[];
  enabled: boolean;
}

export interface FieldMapping {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string; // for date parsing
}

export interface DashboardCard {
  id: string;
  title: string;
  type: 'timeseries' | 'pie' | 'bar' | 'metric' | 'table';
  query: SearchQuery;
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  cards: DashboardCard[];
  created: Date;
  updated: Date;
}