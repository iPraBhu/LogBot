import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { generateSampleLogs } from '@/lib/parse';
import type { LogEntry } from '@/types';

const ITEMS_PER_PAGE = 50; // Limit to 50 items per page to prevent hanging

const LogTable: React.FC = () => {
  const { 
    searchResults, 
    selectedEntries, 
    toggleEntrySelection,
    setDetailFlyoutEntry 
  } = useAppStore();
  
  const [currentPage, setCurrentPage] = useState(0);

  // Use search results if available, otherwise show sample data
  const sampleLogs = React.useMemo(() => generateSampleLogs(100), []);
  const allEntries = searchResults?.entries && searchResults.entries.length > 0 
    ? searchResults.entries 
    : sampleLogs;

  // Paginate entries to prevent browser hanging
  const { entries, totalPages, startIndex, endIndex } = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, allEntries.length);
    const paginatedEntries = allEntries.slice(start, end);
    const pages = Math.ceil(allEntries.length / ITEMS_PER_PAGE);
    
    return {
      entries: paginatedEntries,
      totalPages: pages,
      startIndex: start + 1,
      endIndex: end
    };
  }, [allEntries, currentPage]);

  console.log(`LogTable: showing ${entries.length} of ${allEntries.length} entries (page ${currentPage + 1}/${totalPages})`);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  const handleRowClick = (entry: LogEntry) => {
    setDetailFlyoutEntry(entry);
  };

  const handleRowSelect = (e: React.ChangeEvent<HTMLInputElement>, entryId: string) => {
    e.stopPropagation();
    toggleEntrySelection(entryId);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    }).format(timestamp);
  };

  const getLevelStyle = (level: string) => {
    const styles = {
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      WARN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      INFO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      DEBUG: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TRACE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      FATAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return styles[level as keyof typeof styles] || styles.INFO;
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {allEntries.length === 0 ? 'Load log files to see entries here' : 'No entries on this page'}
          </p>
          <p className="text-sm text-muted-foreground">
            {allEntries.length === 0 ? 'Use the file loader above to get started' : 'Try a different page or search criteria'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Table header */}
      <div className="border-b border-border bg-muted/50 px-4 py-3 flex-shrink-0">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground">
          <div className="col-span-1">
            <input
              type="checkbox"
              className="rounded"
              onChange={(_e) => {
                // TODO: Implement select all
              }}
            />
          </div>
          <div className="col-span-2">Time</div>
          <div className="col-span-1">Level</div>
          <div className="col-span-2">File</div>
          <div className="col-span-6">Message</div>
        </div>
      </div>

      {/* Table content - scrollable area */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            onClick={() => handleRowClick(entry)}
            className={`
              grid grid-cols-12 gap-4 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors
              ${selectedEntries.has(entry.id) ? 'bg-primary/10' : ''}
              ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
            `}
          >
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedEntries.has(entry.id)}
                onChange={(e) => handleRowSelect(e, entry.id)}
                className="rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="col-span-2 text-xs font-mono text-muted-foreground">
              {formatTimestamp(entry.timestamp)}
            </div>
            
            <div className="col-span-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelStyle(entry.level)}`}>
                {entry.level}
              </span>
            </div>
            
            <div className="col-span-2 text-xs text-muted-foreground truncate" title={entry.file}>
              {entry.file}
            </div>
            
            <div className="col-span-6 text-sm" title={entry.message}>
              <div className="line-clamp-2">
                {entry.message}
              </div>
            </div>
          </div>
        ))}
        
        {/* Pagination info */}
        {totalPages > 1 && entries.length === ITEMS_PER_PAGE && (
          <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
            Use pagination controls below to view more entries
          </div>
        )}
      </div>

      {/* Footer with pagination */}
      <div className="border-t border-border px-4 py-3 bg-muted/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing {startIndex}-{endIndex} of {allEntries.length} entries
            {selectedEntries.size > 0 && (
              <span className="ml-4">
                {selectedEntries.size} selected
              </span>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              
              <span className="text-xs text-muted-foreground px-2">
                Page {currentPage + 1} of {totalPages}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogTable;