import React from 'react';
import { X, Copy } from 'lucide-react';
import { useAppStore } from '@/store';

const DetailFlyout: React.FC = () => {
  const { detailFlyoutEntry, setDetailFlyoutEntry } = useAppStore();

  if (!detailFlyoutEntry) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Log Details</h3>
        <button
          onClick={() => setDetailFlyoutEntry(null)}
          className="p-1 hover:bg-accent rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Timestamp */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 p-2 bg-muted rounded text-sm">
              {detailFlyoutEntry.timestamp.toISOString()}
            </code>
            <button
              onClick={() => copyToClipboard(detailFlyoutEntry.timestamp.toISOString())}
              className="p-2 hover:bg-accent rounded"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Level */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Level</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 p-2 bg-muted rounded text-sm">
              {detailFlyoutEntry.level}
            </code>
            <button
              onClick={() => copyToClipboard(detailFlyoutEntry.level)}
              className="p-2 hover:bg-accent rounded"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Message</label>
          <div className="flex items-start gap-2 mt-1">
            <pre className="flex-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap break-words">
              {detailFlyoutEntry.message}
            </pre>
            <button
              onClick={() => copyToClipboard(detailFlyoutEntry.message)}
              className="p-2 hover:bg-accent rounded flex-shrink-0 mt-0"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* File */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">File</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 p-2 bg-muted rounded text-sm">
              {detailFlyoutEntry.file}
            </code>
            <button
              onClick={() => copyToClipboard(detailFlyoutEntry.file)}
              className="p-2 hover:bg-accent rounded"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Raw */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Raw</label>
          <div className="flex items-start gap-2 mt-1">
            <pre className="flex-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap break-words">
              {detailFlyoutEntry.raw}
            </pre>
            <button
              onClick={() => copyToClipboard(detailFlyoutEntry.raw)}
              className="p-2 hover:bg-accent rounded flex-shrink-0 mt-0"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Fields */}
        {detailFlyoutEntry.fields && Object.keys(detailFlyoutEntry.fields).length > 0 && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fields</label>
            <div className="mt-1 space-y-2">
              {Object.entries(detailFlyoutEntry.fields).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <div className="flex-1 p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground">{key}</div>
                    <code className="text-sm">{JSON.stringify(value)}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(value))}
                    className="p-2 hover:bg-accent rounded flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailFlyout;