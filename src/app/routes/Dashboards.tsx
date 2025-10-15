import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { BarChart3, TrendingUp, AlertTriangle, FileText, Search, Filter, ExternalLink, Bug, Zap } from 'lucide-react';
import type { LogEntry } from '@/types';

interface ErrorPattern {
  type: string;
  count: number;
  examples: LogEntry[];
  services: string[];
  firstSeen: Date;
  lastSeen: Date;
}

interface ExceptionDetails {
  exception: string;
  count: number;
  files: string[];
  services: string[];
  entries: LogEntry[];
}

const Dashboards: React.FC = () => {
  const navigate = useNavigate();
  const { searchResults, totalEntries, setQuery } = useAppStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedErrorType, setSelectedErrorType] = useState('all');
  
  // Get current data
  const entries = searchResults?.entries || [];
  
  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    let filtered = entries;
    
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      const hours = parseInt(selectedTimeRange);
      const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      filtered = filtered.filter(e => e.timestamp >= cutoff);
    }
    
    if (selectedService !== 'all') {
      filtered = filtered.filter(e => e.service === selectedService || e.source === selectedService);
    }
    
    if (selectedErrorType !== 'all') {
      filtered = filtered.filter(e => e.level === selectedErrorType);
    }
    
    return filtered;
  }, [entries, selectedTimeRange, selectedService, selectedErrorType]);
  
  // Analyze error patterns
  const errorAnalysis = useMemo(() => {
    const errors = filteredEntries.filter(e => e.level === 'ERROR');
    const warnings = filteredEntries.filter(e => e.level === 'WARN');
    const patterns = new Map<string, ErrorPattern>();
    const exceptions = new Map<string, ExceptionDetails>();
    
    // Extract error patterns
    [...errors, ...warnings].forEach(entry => {
      // Extract exception types from messages
      const exceptionMatch = entry.message.match(/(\w*Exception|\w*Error|\w*Fault)/);
      
      if (exceptionMatch) {
        const excType = exceptionMatch[1];
        if (!exceptions.has(excType)) {
          exceptions.set(excType, {
            exception: excType,
            count: 0,
            files: [],
            services: [],
            entries: []
          });
        }
        const excData = exceptions.get(excType)!;
        excData.count++;
        excData.entries.push(entry);
        if (entry.file && !excData.files.includes(entry.file)) {
          excData.files.push(entry.file);
        }
        if (entry.service && !excData.services.includes(entry.service)) {
          excData.services.push(entry.service);
        }
      }
      
      // Group by error message pattern (first 50 chars)
      const pattern = entry.message.substring(0, 50).replace(/\d+/g, 'N').replace(/[a-f0-9]{8,}/g, 'HASH');
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          type: pattern,
          count: 0,
          examples: [],
          services: [],
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp
        });
      }
      const patternData = patterns.get(pattern)!;
      patternData.count++;
      if (patternData.examples.length < 3) {
        patternData.examples.push(entry);
      }
      if (entry.service && !patternData.services.includes(entry.service)) {
        patternData.services.push(entry.service);
      }
      if (entry.timestamp < patternData.firstSeen) {
        patternData.firstSeen = entry.timestamp;
      }
      if (entry.timestamp > patternData.lastSeen) {
        patternData.lastSeen = entry.timestamp;
      }
    });
    
    return {
      patterns: Array.from(patterns.values()).sort((a, b) => b.count - a.count),
      exceptions: Array.from(exceptions.values()).sort((a, b) => b.count - a.count)
    };
  }, [filteredEntries]);
  
  // Get unique services for filter
  const services = useMemo(() => {
    const serviceSet = new Set<string>();
    entries.forEach(e => {
      if (e.service) serviceSet.add(e.service);
      if (e.source) serviceSet.add(e.source);
    });
    return Array.from(serviceSet).sort();
  }, [entries]);
  
  // Calculate comprehensive stats
  const errorCount = filteredEntries.filter(e => e.level === 'ERROR').length;
  const warnCount = filteredEntries.filter(e => e.level === 'WARN').length;
  const infoCount = filteredEntries.filter(e => e.level === 'INFO').length;
  const debugCount = filteredEntries.filter(e => e.level === 'DEBUG').length;
  const traceCount = filteredEntries.filter(e => e.level === 'TRACE').length;
  
  const stats = [
    {
      title: 'Total Entries',
      value: filteredEntries.length.toLocaleString(),
      total: totalEntries,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/discover')
    },
    {
      title: 'Unique Exceptions',
      value: errorAnalysis.exceptions.length.toString(),
      total: errorCount,
      icon: Bug,
      color: 'text-red-600 dark:text-red-400',
      onClick: () => {
        setQuery({ text: 'level:ERROR', filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
        navigate('/discover');
      }
    },
    {
      title: 'Error Patterns',
      value: errorAnalysis.patterns.length.toString(),
      total: errorCount + warnCount,
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      onClick: () => {
        setQuery({ text: 'level:ERROR OR level:WARN', filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
        navigate('/discover');
      }
    },
    {
      title: 'Services Affected',
      value: services.length.toString(),
      total: filteredEntries.length,
      icon: Zap,
      color: 'text-purple-600 dark:text-purple-400',
      onClick: () => navigate('/discover')
    }
  ];
  
  const searchForPattern = (pattern: string) => {
    setQuery({ text: `"${pattern}"`, filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
    navigate('/discover');
  };
  
  const searchForException = (exception: string) => {
    setQuery({ text: `"${exception}"`, filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
    navigate('/discover');
  };
  
  const searchForService = (service: string) => {
    setQuery({ text: `service:${service}`, filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
    navigate('/discover');
  };
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Error Analytics Dashboard</h2>
        <p className="text-muted-foreground">Deep insights into errors, exceptions, and system health</p>
      </div>
      
      {/* Filters */}
      <div className="mb-6 p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Time Range</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Time</option>
              <option value="1">Last Hour</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last Week</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Services</option>
              {services.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Log Level</label>
            <select
              value={selectedErrorType}
              onChange={(e) => setSelectedErrorType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Levels</option>
              <option value="ERROR">Errors Only</option>
              <option value="WARN">Warnings Only</option>
              <option value="INFO">Info Only</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className="p-6 border border-border rounded-lg bg-card hover:shadow-md transition-all cursor-pointer group"
              onClick={stat.onClick}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold group-hover:text-primary transition-colors">{stat.value}</p>
                  {stat.total !== undefined && (
                    <p className="text-xs text-muted-foreground">of {stat.total.toLocaleString()} total</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Icon className={`h-8 w-8 ${stat.color} group-hover:scale-110 transition-transform`} />
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Exception Types */}
        <div className="p-6 border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Exception Types
            </h3>
            <span className="text-sm text-muted-foreground">
              {errorAnalysis.exceptions.length} unique types
            </span>
          </div>
          
          {errorAnalysis.exceptions.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {errorAnalysis.exceptions.slice(0, 10).map((exc, index) => (
                <div 
                  key={index} 
                  className="p-3 border border-border rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => searchForException(exc.exception)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-red-600 dark:text-red-400">
                      {exc.exception}
                    </span>
                    <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-xs font-medium">
                      {exc.count} occurrences
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Files: {exc.files.slice(0, 2).join(', ')}{exc.files.length > 2 && ` +${exc.files.length - 2} more`}</div>
                    <div>Services: {exc.services.slice(0, 2).join(', ')}{exc.services.length > 2 && ` +${exc.services.length - 2} more`}</div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Search className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">Click to search traces</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No exceptions found in current data</p>
          )}
        </div>
        
        {/* Error Patterns */}
        <div className="p-6 border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Error Patterns
            </h3>
            <span className="text-sm text-muted-foreground">
              {errorAnalysis.patterns.length} patterns found
            </span>
          </div>
          
          {errorAnalysis.patterns.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {errorAnalysis.patterns.slice(0, 8).map((pattern, index) => (
                <div 
                  key={index} 
                  className="p-3 border border-border rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => searchForPattern(pattern.type)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate flex-1 mr-2">
                      {pattern.type}...
                    </span>
                    <span className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                      {pattern.count}x
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Services: {pattern.services.join(', ') || 'Unknown'}</div>
                    <div>First: {pattern.firstSeen.toLocaleString()}</div>
                    <div>Last: {pattern.lastSeen.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Search className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">Click to find similar</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No error patterns detected</p>
          )}
        </div>
      </div>
      
      {/* Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Log Level Distribution */}
        <div className="p-6 border border-border rounded-lg bg-card">
          <h3 className="font-medium mb-4">Log Level Distribution</h3>
          <div className="space-y-3">
            {[
              { level: 'ERROR', count: errorCount, color: 'bg-red-500', bgColor: 'bg-red-100 dark:bg-red-900' },
              { level: 'WARN', count: warnCount, color: 'bg-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
              { level: 'INFO', count: infoCount, color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900' },
              { level: 'DEBUG', count: debugCount, color: 'bg-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900' },
              { level: 'TRACE', count: traceCount, color: 'bg-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900' }
            ].map(({ level, count, color, bgColor }) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span 
                    className={`px-2 py-1 rounded text-xs font-medium ${bgColor} text-current cursor-pointer hover:opacity-80`}
                    onClick={() => {
                      setQuery({ text: `level:${level}`, filters: [], timeRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), preset: 'last24h' } });
                      navigate('/discover');
                    }}
                  >
                    {level}
                  </span>
                  <span className="text-sm font-mono">{count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className={`${color} h-2 rounded-full transition-all duration-300`} 
                      style={{ width: `${filteredEntries.length > 0 ? (count / filteredEntries.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {filteredEntries.length > 0 ? ((count / filteredEntries.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {filteredEntries.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">Load log data to see distribution</p>
          )}
        </div>
        
        {/* Service Breakdown */}
        <div className="p-6 border border-border rounded-lg bg-card">
          <h3 className="font-medium mb-4">Services & Error Rates</h3>
          {services.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {services.map((service) => {
                const serviceEntries = filteredEntries.filter(e => e.service === service || e.source === service);
                const serviceErrors = serviceEntries.filter(e => e.level === 'ERROR');
                const errorRate = serviceEntries.length > 0 ? (serviceErrors.length / serviceEntries.length) * 100 : 0;
                
                return (
                  <div 
                    key={service}
                    className="p-3 border border-border rounded bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => searchForService(service)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{service}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        errorRate > 10 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        errorRate > 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {errorRate.toFixed(1)}% errors
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{serviceEntries.length} total entries</span>
                      <span>{serviceErrors.length} errors</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Search className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">Click to filter by service</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No service data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboards;