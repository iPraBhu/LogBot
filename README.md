"# Local Log Explorer

A browser-only log analytics web application with a Kibana-like interface. Analyze your log files entirely client-side without any servers or cloud dependencies.

## Features

- 🔍 **Advanced Search**: KQL-like query language with field filters, boolean operators, and fuzzy search
- 📊 **Analytics Dashboard**: Log volume charts, error rate tracking, and top field analysis  
- 💾 **Local Storage**: All data processing happens in your browser using IndexedDB
- 🚀 **High Performance**: Web Workers for parsing and indexing, virtualized tables for large datasets
- 🎨 **Modern UI**: Dark/light themes, responsive design, keyboard shortcuts
- 📱 **PWA Ready**: Works offline, installable as a desktop/mobile app
- 🔒 **Privacy First**: No external network requests, all processing is local

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173`

4. **Load sample data**:
   - Click "Load Files" or drag/drop the sample logs from `public/sample-logs/`
   - Or use the demo mode that auto-loads synthetic data

## Supported File Formats

- **Plain text logs** (`.log`, `.txt`): Timestamp + level + message format
- **JSON Lines** (`.jsonl`, `.ndjson`): One JSON object per line
- **JSON** (`.json`): Array of log objects

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## Search Syntax

- **Free text**: `error timeout`
- **Field filters**: `level:ERROR`, `service:api`
- **Quoted phrases**: `"connection timeout"`
- **Boolean operators**: `error AND database`, `warn OR error`
- **Negation**: `NOT level:DEBUG`
- **Ranges**: `timestamp:[2025-10-01 TO 2025-10-15]`
- **Wildcards**: `service:api*`, `*timeout*`

## Keyboard Shortcuts

- `/` - Focus search bar
- `j/k` - Navigate table rows
- `Enter` - Open detail flyout
- `Esc` - Close modals/flyouts
- `[ ]` - Toggle filters

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand with IndexedDB persistence
- **Search**: MiniSearch with custom KQL parser
- **Charts**: Recharts for analytics visualization
- **Workers**: Comlink for background processing
- **Storage**: Dexie (IndexedDB wrapper)

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

Requires modern browser features: Web Workers, IndexedDB, File API, ES2020

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details" 
