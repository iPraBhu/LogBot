import type { SearchQuery, QueryFilter, FilterOperator, TimeRange } from '@/types';

// Simple KQL-like query parser
// Supports: field:value, field:"phrase", field:[A TO B], field:>value, AND/OR/NOT, free text

interface Token {
  type: 'FIELD' | 'OPERATOR' | 'VALUE' | 'TEXT' | 'PAREN' | 'AND' | 'OR' | 'NOT';
  value: string;
  position: number;
}

export class KQLParser {
  private tokens: Token[] = [];
  private position = 0;

  parse(query: string): { filters: QueryFilter[]; text: string } {
    this.tokens = this.tokenize(query);
    this.position = 0;

    const filters: QueryFilter[] = [];
    const textParts: string[] = [];

    while (this.position < this.tokens.length) {
      const result = this.parseExpression();
      
      if (result.type === 'filter') {
        filters.push(result.filter);
      } else if (result.type === 'text') {
        textParts.push(result.text);
      }
    }

    return {
      filters,
      text: textParts.join(' ').trim(),
    };
  }

  private tokenize(query: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < query.length) {
      // Skip whitespace
      if (/\s/.test(query[i])) {
        i++;
        continue;
      }

      // Handle quoted strings
      if (query[i] === '"') {
        const start = i++;
        while (i < query.length && query[i] !== '"') {
          if (query[i] === '\\') i++; // Skip escaped characters
          i++;
        }
        i++; // Skip closing quote
        tokens.push({
          type: 'VALUE',
          value: query.slice(start + 1, i - 1).replace(/\\"/g, '"'),
          position: start,
        });
        continue;
      }

      // Handle operators and special characters
      if (query[i] === ':') {
        tokens.push({ type: 'OPERATOR', value: ':', position: i });
        i++;
        continue;
      }

      if (query[i] === '(' || query[i] === ')') {
        tokens.push({ type: 'PAREN', value: query[i], position: i });
        i++;
        continue;
      }

      // Handle range operators [A TO B]
      if (query[i] === '[') {
        const start = i;
        while (i < query.length && query[i] !== ']') i++;
        i++; // Include closing bracket
        tokens.push({
          type: 'VALUE',
          value: query.slice(start, i),
          position: start,
        });
        continue;
      }

      // Handle comparison operators
      if (query[i] === '>' || query[i] === '<') {
        let op = query[i];
        i++;
        if (i < query.length && query[i] === '=') {
          op += '=';
          i++;
        }
        tokens.push({ type: 'OPERATOR', value: op, position: i - op.length });
        continue;
      }

      // Handle words
      const start = i;
      while (i < query.length && !/[\s:()<>="]/.test(query[i])) {
        i++;
      }
      
      const word = query.slice(start, i);
      
      // Check for logical operators
      if (/^(AND|OR|NOT)$/i.test(word)) {
        tokens.push({
          type: word.toUpperCase() as 'AND' | 'OR' | 'NOT',
          value: word.toUpperCase(),
          position: start,
        });
      } else {
        // Check if this could be a field (followed by :)
        const nextNonSpace = this.findNextNonSpace(query, i);
        if (nextNonSpace < query.length && query[nextNonSpace] === ':') {
          tokens.push({ type: 'FIELD', value: word, position: start });
        } else {
          tokens.push({ type: 'TEXT', value: word, position: start });
        }
      }
    }

    return tokens;
  }

  private findNextNonSpace(str: string, start: number): number {
    while (start < str.length && /\s/.test(str[start])) {
      start++;
    }
    return start;
  }

  private parseExpression(): { type: 'filter' | 'text'; filter?: QueryFilter; text?: string } {
    const token = this.currentToken();
    
    if (!token) {
      return { type: 'text', text: '' };
    }

    // Handle NOT operator
    if (token.type === 'NOT') {
      this.advance();
      const result = this.parseExpression();
      if (result.type === 'filter' && result.filter) {
        result.filter.negate = true;
      }
      return result;
    }

    // Handle field:value expressions
    if (token.type === 'FIELD') {
      const field = token.value;
      this.advance();
      
      const operatorToken = this.currentToken();
      if (operatorToken && operatorToken.type === 'OPERATOR') {
        const operator = operatorToken.value;
        this.advance();
        
        const valueToken = this.currentToken();
        if (valueToken) {
          this.advance();
          const filter = this.createFilter(field, operator, valueToken.value);
          if (filter) {
            return { type: 'filter', filter };
          }
        }
      }
    }

    // Handle regular text
    if (token.type === 'TEXT' || token.type === 'VALUE') {
      this.advance();
      return { type: 'text', text: token.value };
    }

    // Skip logical operators for now (simplified implementation)
    if (token.type === 'AND' || token.type === 'OR') {
      this.advance();
      return this.parseExpression();
    }

    this.advance();
    return { type: 'text', text: '' };
  }

  private createFilter(field: string, operator: string, value: string): QueryFilter | null {
    // Handle range queries [A TO B]
    if (value.startsWith('[') && value.endsWith(']')) {
      const rangeContent = value.slice(1, -1);
      const parts = rangeContent.split(/\s+TO\s+/i);
      if (parts.length === 2) {
        return {
          field,
          operator: 'range' as FilterOperator,
          value: [this.parseValue(parts[0]), this.parseValue(parts[1])],
        };
      }
    }

    // Map operators
    let filterOperator: FilterOperator;
    switch (operator) {
      case ':':
        filterOperator = 'equals';
        break;
      case '>':
        filterOperator = 'gt';
        break;
      case '>=':
        filterOperator = 'gte';
        break;
      case '<':
        filterOperator = 'lt';
        break;
      case '<=':
        filterOperator = 'lte';
        break;
      default:
        return null;
    }

    return {
      field,
      operator: filterOperator,
      value: this.parseValue(value),
    };
  }

  private parseValue(value: string): string | number | Date {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Return as string
    return value;
  }

  private currentToken(): Token | null {
    return this.position < this.tokens.length ? this.tokens[this.position] : null;
  }

  private advance(): void {
    this.position++;
  }
}

// Helper functions for creating common query types
export function createTextQuery(text: string, timeRange: TimeRange): SearchQuery {
  const parser = new KQLParser();
  const parsed = parser.parse(text);
  
  return {
    text: parsed.text,
    filters: parsed.filters,
    timeRange,
  };
}

export function createFilterQuery(filters: QueryFilter[], timeRange: TimeRange): SearchQuery {
  return {
    text: '',
    filters,
    timeRange,
  };
}

export function createLevelFilter(level: string, negate = false): QueryFilter {
  return {
    field: 'level',
    operator: 'equals',
    value: level,
    negate,
  };
}

export function createFileFilter(file: string, negate = false): QueryFilter {
  return {
    field: 'file',
    operator: 'equals',
    value: file,
    negate,
  };
}

export function createTimeRangeFilter(from: Date, to: Date): QueryFilter {
  return {
    field: 'timestamp',
    operator: 'range',
    value: [from, to],
  };
}

// Suggest completions for KQL queries
export function getSuggestions(query: string, position: number, fieldNames: string[]): string[] {
  const suggestions: string[] = [];
  
  // Get the current word being typed
  const beforeCursor = query.slice(0, position);
  const wordMatch = beforeCursor.match(/\S*$/);
  const currentWord = wordMatch ? wordMatch[0] : '';
  
  // If we're after a field name and colon, suggest values
  const fieldMatch = beforeCursor.match(/(\w+):\s*\S*$/);
  if (fieldMatch) {
    const field = fieldMatch[1];
    
    if (field === 'level') {
      suggestions.push('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
    }
    
    return suggestions.filter(s => 
      s.toLowerCase().startsWith(currentWord.toLowerCase())
    );
  }
  
  // Suggest field names
  suggestions.push(...fieldNames.map(f => f + ':'));
  
  // Suggest operators
  suggestions.push('AND', 'OR', 'NOT');
  
  return suggestions.filter(s => 
    s.toLowerCase().startsWith(currentWord.toLowerCase())
  );
}