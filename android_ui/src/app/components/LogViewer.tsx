import { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function LogViewer({ logs, onClearLogs }: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return '📝';
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-950 border-2 border-gray-700 rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-gray-300">Logs Robot</span>
          <span className="text-xs text-gray-500">({logs.length})</span>
        </div>
        <Button
          onClick={onClearLogs}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={logs.length === 0}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Effacer
        </Button>
      </div>

      {/* Logs container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Terminal className="w-8 h-8 mb-2" />
            <p className="text-sm">Aucun log reçu</p>
            <p className="text-xs mt-1">Les logs du robot apparaîtront ici</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-2 hover:bg-gray-900/50 px-2 py-1 rounded"
            >
              <span className="flex-shrink-0 text-xs">{getLogIcon(log.type)}</span>
              <span className="flex-shrink-0 text-gray-500">{log.timestamp}</span>
              <span className={`flex-1 ${getLogColor(log.type)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer indicator */}
      <div className="px-3 py-1 bg-gray-900 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Réception Bluetooth active
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
    </div>
  );
}
