import React, { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import SearchBar from '@/components/SearchBar';
import TimePicker from '@/components/TimePicker';
import FilterPills from '@/components/FilterPills';
import Histogram from '@/components/Histogram';
import LogTable from '@/components/LogTable';
import DetailFlyout from '@/components/DetailFlyout';
import FileLoader from '@/components/FileLoader';

const Discover: React.FC = () => {
  const { 
    query,
    searchResults,
    isSearching,
    setIsSearching,
    setSearchResults,
    detailFlyoutEntry,
    totalEntries,
    loadedFiles,
    isIndexing,
    indexingProgress,
  } = useAppStore();

  // Mock search function (will be replaced with actual search implementation)
  const performSearch = useCallback(async () => {
    // Only perform search if we have actual query text or filters
    if (!query.text && query.filters.length === 0) {
      // Don't clear results if we have loaded data
      if (!searchResults || searchResults.entries.length === 0) {
        setSearchResults(null);
      }
      return;
    }

    setIsSearching(true);
    
    try {
      // Get search index and perform actual search
      const { getSearchIndex } = await import('@/lib/search');
      const searchIndex = getSearchIndex();
      const results = await searchIndex.search(query);
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ entries: [], total: 0, took: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [query, setIsSearching, setSearchResults, searchResults]);

  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  if (loadedFiles.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Discover</h2>
          <p className="text-sm text-muted-foreground">
            Search and explore your log data
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">No Data Loaded</h3>
              <p className="text-muted-foreground">
                Load your log files to start exploring and searching your data.
              </p>
            </div>
            <FileLoader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Discover</h2>
            <p className="text-sm text-muted-foreground">
              {totalEntries.toLocaleString()} entries across {loadedFiles.length} files
            </p>
          </div>
          <FileLoader />
        </div>
        
        {/* Search controls */}
        <div className="space-y-3">
          <SearchBar />
          <div className="flex items-center gap-4">
            <TimePicker />
            {(isSearching || isIndexing) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                {isIndexing ? `Processing files... ${Math.round(indexingProgress)}%` : 'Searching...'}
              </div>
            )}
          </div>
          <FilterPills />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Histogram */}
        <div className="h-32 border-b border-border flex-shrink-0">
          <Histogram />
        </div>

        {/* Results */}
        <div className="flex-1 flex min-h-0">
          <div className={`flex-1 ${detailFlyoutEntry ? 'pr-96' : ''} transition-all duration-300 min-h-0`}>
            <LogTable />
          </div>
          
          {/* Detail flyout */}
          {detailFlyoutEntry && (
            <div className="w-96 border-l border-border">
              <DetailFlyout />
            </div>
          )}
        </div>
      </div>

      {/* Results summary */}
      {searchResults && (
        <div className="px-4 py-2 border-t border-border bg-muted/50 text-sm text-muted-foreground">
          Found {searchResults.total.toLocaleString()} results in {searchResults.took}ms
        </div>
      )}
    </div>
  );
};

export default Discover;