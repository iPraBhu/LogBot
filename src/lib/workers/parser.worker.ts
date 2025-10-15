import { expose } from 'comlink';
import { LogParser, type ParseOptions } from '@/lib/parse';
import type { LogEntry, ParsedLog, ParseProgress } from '@/types';

interface ParserWorkerAPI {
  parseFile: (file: File, options?: ParseOptions) => Promise<ParsedLog>;
  parseChunk: (chunk: string, fileName: string, startLine: number, options?: ParseOptions) => Promise<LogEntry[]>;
}

class ParserWorker implements ParserWorkerAPI {
  private parser: LogParser;

  constructor() {
    this.parser = new LogParser();
  }

  async parseFile(file: File, options?: ParseOptions): Promise<ParsedLog> {
    this.parser = new LogParser(options);
    
    // For large files, we'll process in chunks
    const chunkSize = 1024 * 1024; // 1MB chunks
    const entries: LogEntry[] = [];
    const errors: any[] = [];
    let totalLines = 0;
    let processedBytes = 0;

    try {
      // Read file in chunks
      const stream = file.stream();
      const reader = stream.getReader();
      let buffer = '';
      let lineNumber = 1;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            const entry = this.parser.parseLine(buffer, file.name, lineNumber);
            if (entry) entries.push(entry);
            totalLines++;
          }
          break;
        }

        processedBytes += value.length;
        
        // Convert uint8 array to string
        const text = new TextDecoder().decode(value);
        buffer += text;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const entry = this.parser.parseLine(line, file.name, lineNumber);
              if (entry) entries.push(entry);
            } catch (error) {
              errors.push({
                line: lineNumber,
                content: line,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          lineNumber++;
          totalLines++;
        }

        // Report progress
        if (typeof self !== 'undefined') {
          const progress: ParseProgress = {
            fileName: file.name,
            totalLines,
            processedLines: lineNumber,
            errors: errors.length,
            speed: totalLines / ((Date.now() - performance.now()) / 1000) || 0,
            eta: 0, // Will be calculated by caller
          };
          
          // Send progress update (if supported)
          self.postMessage({ type: 'progress', data: progress });
        }
      }

      return {
        entries,
        errors,
        totalLines,
        fileName: file.name,
        fileSize: file.size,
      };
      
    } catch (error) {
      throw new Error(`Failed to parse file: ${error}`);
    }
  }

  async parseChunk(
    chunk: string, 
    fileName: string, 
    startLine: number, 
    options?: ParseOptions
  ): Promise<LogEntry[]> {
    this.parser = new LogParser(options);
    
    const lines = chunk.split('\n');
    const entries: LogEntry[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const entry = this.parser.parseLine(line, fileName, startLine + i);
          if (entry) entries.push(entry);
        } catch (error) {
          // Silently skip parsing errors for chunks
          console.warn(`Parse error at line ${startLine + i}:`, error);
        }
      }
    }
    
    return entries;
  }
}

const worker = new ParserWorker();
expose(worker);