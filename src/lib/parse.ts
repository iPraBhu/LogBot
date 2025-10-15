import type { LogEntry, LogLevel, ParsedLog, ParseError } from '@/types';
import { normalizeLogLevel, generateId } from '@/lib/utils';

// Common timestamp patterns
const TIMESTAMP_PATTERNS = [
  // ISO 8601 with various formats
  /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)/,
  // RFC 3339
  /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/,
  // Common log formats
  /^(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
  /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/,
  /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
  // Epoch timestamps
  /^(\d{10,13})/,
];

// Log level detection patterns
const LEVEL_PATTERNS = [
  /\b(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b/i,
  /\[(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\]/i,
  /level[=:]\s*(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)/i,
];

// Common structured log patterns
const STRUCTURED_PATTERNS = [
  // JSON lines
  /^\s*\{.*\}\s*$/,
  // Key-value pairs
  /^\s*\w+[=:]\s*.+/,
  // Logfmt style
  /^\s*\w+=[^\s]+(\s+\w+=[^\s]+)*\s*$/,
];

export interface ParseOptions {
  enableJsonDetection?: boolean;
  timestampFormat?: string;
  levelField?: string;
  messageField?: string;
  customPatterns?: string[];
  maxErrors?: number;
}

export class LogParser {
  private options: ParseOptions;
  private errors: ParseError[] = [];

  constructor(options: ParseOptions = {}) {
    this.options = {
      enableJsonDetection: true,
      maxErrors: 1000,
      ...options,
    };
  }

  async parseFile(file: File): Promise<ParsedLog> {
    this.errors = [];
    const entries: LogEntry[] = [];
    let totalLines = 0;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      totalLines = lines.length;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const entry = this.parseLine(line, file.name, i + 1);
          if (entry) {
            entries.push(entry);
          }
        } catch (error) {
          this.addError(i + 1, line, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      this.addError(0, '', `Failed to read file: ${error}`);
    }

    return {
      entries,
      errors: this.errors,
      totalLines,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  parseLine(line: string, fileName: string, lineNumber: number): LogEntry | null {
    if (!line.trim()) return null;

    // Try JSON parsing first if enabled
    if (this.options.enableJsonDetection && this.looksLikeJson(line)) {
      return this.parseJsonLine(line, fileName, lineNumber);
    }

    // Try structured text parsing
    return this.parseTextLine(line, fileName, lineNumber);
  }

  private looksLikeJson(line: string): boolean {
    return line.trim().startsWith('{') && line.trim().endsWith('}');
  }

  private parseJsonLine(line: string, fileName: string, lineNumber: number): LogEntry | null {
    try {
      const json = JSON.parse(line);
      
      // Extract timestamp
      const timestamp = this.extractTimestamp(json);
      
      // Extract level
      const level = this.extractLevel(json);
      
      // Extract message
      const message = this.extractMessage(json);
      
      // Extract additional fields
      const fields = { ...json };
      delete fields.timestamp;
      delete fields.ts;
      delete fields.time;
      delete fields['@timestamp'];
      delete fields.level;
      delete fields.severity;
      delete fields.message;
      delete fields.msg;

      return {
        id: generateId(),
        timestamp,
        level,
        message,
        file: fileName,
        raw: line,
        fields,
        source: json.source || json.logger || fileName,
        service: json.service || json.app || json.component,
        host: json.host || json.hostname,
        lineNumber,
      };
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error}`);
    }
  }

  private parseTextLine(line: string, fileName: string, lineNumber: number): LogEntry | null {
    // Try to match common log patterns
    const patterns = [
      // ISO timestamp + level + message
      /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)\s+(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\b\s*(.*)$/i,
      // Timestamp + [LEVEL] + message
      /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*\[(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\]\s*(.*)$/i,
      // Level + timestamp + message
      /^(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*(.*)$/i,
      // Just level + message (use current time)
      /^(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s*[:\-\s]\s*(.*)$/i,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let timestamp: Date;
        let level: LogLevel;
        let message: string;

        if (match.length === 4 && this.looksLikeTimestamp(match[1])) {
          // Pattern: timestamp + level + message
          timestamp = this.parseTimestamp(match[1]);
          level = normalizeLogLevel(match[2]);
          message = match[3];
        } else if (match.length === 4 && this.looksLikeTimestamp(match[2])) {
          // Pattern: level + timestamp + message
          level = normalizeLogLevel(match[1]);
          timestamp = this.parseTimestamp(match[2]);
          message = match[3];
        } else if (match.length === 3) {
          // Pattern: level + message (no timestamp)
          level = normalizeLogLevel(match[1]);
          timestamp = new Date();
          message = match[2];
        } else {
          continue;
        }

        return {
          id: generateId(),
          timestamp,
          level,
          message: message.trim(),
          file: fileName,
          raw: line,
          source: fileName,
          lineNumber,
        };
      }
    }

    // Fallback: try to detect level in the text
    const detectedLevel = this.detectLevelInText(line);
    const timestamp = this.extractTimestampFromText(line) || new Date();

    return {
      id: generateId(),
      timestamp,
      level: detectedLevel,
      message: line,
      file: fileName,
      raw: line,
      source: fileName,
      lineNumber,
    };
  }

  private extractTimestamp(json: any): Date {
    const timestampFields = ['@timestamp', 'timestamp', 'ts', 'time', 'datetime'];
    
    for (const field of timestampFields) {
      if (json[field]) {
        return this.parseTimestamp(json[field]);
      }
    }
    
    return new Date();
  }

  private extractLevel(json: any): LogLevel {
    const levelFields = ['level', 'severity', 'priority', 'loglevel'];
    
    for (const field of levelFields) {
      if (json[field]) {
        return normalizeLogLevel(json[field]);
      }
    }
    
    // Try to detect level in message
    return this.detectLevelInText(JSON.stringify(json));
  }

  private extractMessage(json: any): string {
    const messageFields = ['message', 'msg', 'text', 'content', 'description'];
    
    for (const field of messageFields) {
      if (json[field] && typeof json[field] === 'string') {
        return json[field];
      }
    }
    
    // Fallback to the entire JSON as message
    return JSON.stringify(json);
  }

  private parseTimestamp(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'number') {
      // Handle epoch timestamps (both seconds and milliseconds)
      const timestamp = value < 1e12 ? value * 1000 : value;
      return new Date(timestamp);
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return new Date();
  }

  private looksLikeTimestamp(value: string): boolean {
    return TIMESTAMP_PATTERNS.some(pattern => pattern.test(value));
  }

  private extractTimestampFromText(text: string): Date | null {
    for (const pattern of TIMESTAMP_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        return this.parseTimestamp(match[1]);
      }
    }
    return null;
  }

  private detectLevelInText(text: string): LogLevel {
    for (const pattern of LEVEL_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        return normalizeLogLevel(match[1]);
      }
    }
    
    // Keyword-based fallback detection
    const lowerText = text.toLowerCase();
    if (lowerText.includes('fatal') || lowerText.includes('critical')) return 'FATAL';
    if (lowerText.includes('error') || lowerText.includes('exception') || lowerText.includes('fail')) return 'ERROR';
    if (lowerText.includes('warn') || lowerText.includes('warning')) return 'WARN';
    if (lowerText.includes('debug')) return 'DEBUG';
    if (lowerText.includes('trace')) return 'TRACE';
    
    return 'INFO';
  }

  private addError(line: number, content: string, error: string) {
    if (this.errors.length < (this.options.maxErrors || 1000)) {
      this.errors.push({ line, content, error });
    }
  }
}

// Utility function for quick parsing without full class instantiation
export async function parseLogFile(file: File, options?: ParseOptions): Promise<ParsedLog> {
  const parser = new LogParser(options);
  return parser.parseFile(file);
}

// Generate sample log data for demo
export function generateSampleLogs(count: number = 200): LogEntry[] {
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'TRACE'];
  const services = ['api', 'web', 'worker', 'auth', 'db'];
  const hosts = ['server-01', 'server-02', 'server-03'];
  
  const messages = [
    'Request processed successfully',
    'Database connection established',
    'User authentication failed',
    'Cache miss for key: user_123',
    'Starting background job',
    'Memory usage above threshold',
    'Invalid request parameter',
    'Service health check passed',
    'Rate limit exceeded for IP',
    'File uploaded successfully',
  ];

  const entries: LogEntry[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (i * 1000)); // Sequential timestamps for better order
    const level = levels[Math.floor(Math.random() * levels.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const host = hosts[Math.floor(Math.random() * hosts.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];

    entries.push({
      id: generateId(),
      timestamp,
      level,
      message: `[${service}] ${message} (entry ${i + 1}/${count})`,
      file: `${service}.log`,
      raw: `${timestamp.toISOString()} ${level} [${service}] ${message}`,
      source: service,
      service,
      host,
      lineNumber: i + 1,
      fields: {
        requestId: `req_${generateId()}`,
        userId: Math.random() > 0.7 ? `user_${Math.floor(Math.random() * 1000)}` : undefined,
        duration: Math.floor(Math.random() * 1000),
      },
    });
  }

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}