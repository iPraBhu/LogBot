import React, { useRef, useState } from 'react';
import { Upload, File, X, AlertCircle, Zap } from 'lucide-react';
import { useAppStore } from '@/store';

const FileLoader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    loadedFiles, 
    setLoadedFiles, 
    setIsIndexing, 
    setIndexingProgress,
    setTotalEntries,
    setSearchResults,
    isIndexing,
    settings 
  } = useAppStore();

  const handleFileSelect = (files: File[]) => {
    setError(null);
    
    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > settings.maxFileSize) {
        setError(`File ${file.name} is too large (max ${formatFileSize(settings.maxFileSize)})`);
        continue;
      }
      
      if (!file.name.match(/\.(log|txt|json|jsonl|ndjson)$/i)) {
        setError(`File ${file.name} has an unsupported format`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setLoadedFiles([...loadedFiles, ...validFiles]);
      processFiles(validFiles);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsIndexing(true);
    setIndexingProgress(0);
    
    try {
      const { parseLogFile } = await import('@/lib/parse');
      const allEntries: any[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file: ${file.name}`);
        
        setIndexingProgress(((i) / files.length) * 50); // First 50% for parsing
        
        try {
          const parsed = await parseLogFile(file);
          allEntries.push(...parsed.entries);
          console.log(`Parsed ${parsed.entries.length} entries from ${file.name}`);
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error);
          setError(`Failed to parse ${file.name}: ${error}`);
        }
        
        setIndexingProgress(((i + 1) / files.length) * 50);
      }
      
      // Update store with parsed entries
      if (allEntries.length > 0) {
        const { getSearchIndex } = await import('@/lib/search');
        const searchIndex = getSearchIndex();
        
        setIndexingProgress(75); // Indexing phase
        await searchIndex.addEntries(allEntries);
        
        // Update the store
        const { useAppStore } = await import('@/store');
        const { setTotalEntries, setSearchResults } = useAppStore.getState();
        
        setTotalEntries(allEntries.length);
        setSearchResults({
          entries: allEntries, // Show all entries, not just first 100
          total: allEntries.length,
          took: 0
        });
        
        setIndexingProgress(100);
        console.log(`Successfully loaded ${allEntries.length} total entries`);
      }
      
    } catch (error) {
      console.error('Error processing files:', error);
      setError('Failed to process files');
    } finally {
      setIsIndexing(false);
      setIndexingProgress(0);
    }
  };

  const loadDemoData = async () => {
    setError(null);
    setIsIndexing(true);
    setIndexingProgress(0);
    
    try {
      const { generateSampleLogs } = await import('@/lib/parse');
      const { getSearchIndex } = await import('@/lib/search');
      
      setIndexingProgress(25);
      
      // Generate sample data
      const sampleEntries = generateSampleLogs(200); // Reduced to 200 entries to prevent hanging
      console.log(`Generated ${sampleEntries.length} sample log entries`);
      
      setIndexingProgress(50);
      
      // Add to search index
      const searchIndex = getSearchIndex();
      await searchIndex.addEntries(sampleEntries);
      
      setIndexingProgress(75);
      
      // Update store - show ALL entries, not just first 100
      setTotalEntries(sampleEntries.length);
      setSearchResults({
        entries: sampleEntries, // Show all entries
        total: sampleEntries.length,
        took: 0
      });
      
      setIndexingProgress(100);
      console.log('Demo data loaded successfully');
      
    } catch (error) {
      console.error('Error loading demo data:', error);
      setError('Failed to load demo data');
    } finally {
      setIsIndexing(false);
      setIndexingProgress(0);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = loadedFiles.filter((_, i) => i !== index);
    setLoadedFiles(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelect(files);
    }
  };

  return (
    <div className="space-y-4">
      {/* File upload area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary hover:bg-primary/5'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          Drop log files here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports .log, .txt, .json, .jsonl, .ndjson files up to {formatFileSize(settings.maxFileSize)}
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".log,.txt,.json,.jsonl,.ndjson"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Demo data button */}
      <div className="flex justify-center">
        <button
          onClick={loadDemoData}
          disabled={isIndexing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          {isIndexing ? 'Loading...' : 'Load Demo Data'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loaded files list */}
      {loadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Loaded Files ({loadedFiles.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {loadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default FileLoader;