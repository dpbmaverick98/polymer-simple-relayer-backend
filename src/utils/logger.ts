import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel = 'info';
  private enableFileLogging: boolean = false;
  private logPath?: string;

  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  configure(options: {
    level: LogLevel;
    enableFileLogging: boolean;
    logPath?: string;
  }) {
    this.logLevel = options.level;
    this.enableFileLogging = options.enableFileLogging;
    this.logPath = options.logPath;

    if (this.enableFileLogging && this.logPath) {
      this.ensureLogDirectory();
    }
  }

  private async ensureLogDirectory() {
    if (this.logPath && !existsSync(this.logPath)) {
      await mkdir(this.logPath, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    
    // Custom replacer function for JSON.stringify to handle BigInt
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    const contextStr = context ? ` ${JSON.stringify(context, replacer, 2)}` : '';
    const colorMap = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      reset: '\x1b[0m'
    };

    const color = colorMap[level] || colorMap.reset;
    const levelTag = `[${level.toUpperCase()}]`.padEnd(7);

    // Don't color the file logs, only console
    return `[${timestamp}] ${levelTag} ${message}${context ? ` ${JSON.stringify(context, replacer, 2)}` : ''}`;
  }

  private consoleLog(level: LogLevel, message: string, context?: any) {
    if (!this.shouldLog(level)) return;
    
    // Custom replacer function for JSON.stringify to handle BigInt
    const replacer = (key: string, value: any) =>
      typeof value === 'bigint' ? value.toString() : value;
      
    const emojiMap = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    
    if (context) {
      // Check if it's a simple key-value object for compact logging
      if (typeof context === 'object' && context !== null && !Array.isArray(context)) {
        const contextString = Object.entries(context)
          .map(([key, value]) => `${key}=${JSON.stringify(value, replacer)}`)
          .join(' ');
        console.log(`${emojiMap[level]}  ${message} { ${contextString} }`);
      } else {
        console.log(`${emojiMap[level]}  ${message}`, JSON.parse(JSON.stringify(context, replacer)));
      }
    } else {
      console.log(`${emojiMap[level]}  ${message}`);
    }
  }

  private async writeToFile(level: LogLevel, message: string, context?: any) {
    if (!this.enableFileLogging || !this.logPath) return;

    try {
      const formattedMessage = this.formatMessage(level, message, context);
      const filename = `relayer-${new Date().toISOString().split('T')[0]}.log`;
      const filepath = join(this.logPath, filename);
      
      await writeFile(filepath, formattedMessage + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  debug(message: string, context?: any) {
    if (!this.shouldLog('debug')) return;
    this.consoleLog('debug', message, context);
    this.writeToFile('debug', message, context);
  }

  info(message: string, context?: any) {
    if (!this.shouldLog('info')) return;
    this.consoleLog('info', message, context);
    this.writeToFile('info', message, context);
  }

  warn(message: string, context?: any) {
    if (!this.shouldLog('warn')) return;
    this.consoleLog('warn', message, context);
    this.writeToFile('warn', message, context);
  }

  error(message: string, context?: any) {
    if (!this.shouldLog('error')) return;
    this.consoleLog('error', message, context);
    this.writeToFile('error', message, context);
  }
}

export const logger = new Logger(); 