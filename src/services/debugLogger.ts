interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: string;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 50;

  log(message: string, details?: any) {
    this.addEntry('info', message, details);
  }

  warn(message: string, details?: any) {
    this.addEntry('warn', message, details);
  }

  error(message: string, details?: any) {
    this.addEntry('error', message, details);
  }

  private addEntry(level: 'info' | 'warn' | 'error', message: string, details?: any) {
    const timestamp = new Date().toISOString().substring(11, 19);
    let detailsStr: string | undefined;

    if (details !== undefined) {
      if (details instanceof Error) {
        detailsStr = `${details.message}\n${details.stack || ''}`;
      } else if (typeof details === 'object') {
        try {
          detailsStr = JSON.stringify(details);
        } catch {
          detailsStr = String(details);
        }
      } else {
        detailsStr = String(details);
      }
    }

    this.logs.unshift({ timestamp, level, message, details: detailsStr });
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (__DEV__) {
      if (level === 'error') {
        console.error(`[DebugLogger] ${message}`, details || '');
      } else if (level === 'warn') {
        console.warn(`[DebugLogger] ${message}`, details || '');
      } else {
        console.log(`[DebugLogger] ${message}`, details || '');
      }
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();
