interface MetricData {
  count: number;
  lastUpdated: Date;
  totalTime?: number;
  avgTime?: number;
}

class Metrics {
  private metrics: Map<string, MetricData> = new Map();

  increment(key: string, value: number = 1) {
    const existing = this.metrics.get(key) || { count: 0, lastUpdated: new Date() };
    this.metrics.set(key, {
      ...existing,
      count: existing.count + value,
      lastUpdated: new Date()
    });
  }

  recordTime(key: string, timeMs: number) {
    const existing = this.metrics.get(key) || { 
      count: 0, 
      lastUpdated: new Date(),
      totalTime: 0 
    };
    
    const newTotal = (existing.totalTime || 0) + timeMs;
    const newCount = existing.count + 1;
    
    this.metrics.set(key, {
      count: newCount,
      lastUpdated: new Date(),
      totalTime: newTotal,
      avgTime: newTotal / newCount
    });
  }

  get(key: string): MetricData | undefined {
    return this.metrics.get(key);
  }

  getAll(): Record<string, MetricData> {
    const result: Record<string, MetricData> = {};
    for (const [key, value] of this.metrics) {
      result[key] = value;
    }
    return result;
  }

  reset(key?: string) {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
    }
  }

  summary(): string {
    const lines = ['=== Relayer Metrics ==='];
    
    for (const [key, data] of this.metrics) {
      let line = `${key}: ${data.count}`;
      if (data.avgTime) {
        line += ` (avg: ${data.avgTime.toFixed(2)}ms)`;
      }
      lines.push(line);
    }
    
    return lines.join('\n');
  }
}

export const metrics = new Metrics();

// Helper function to measure execution time
export async function measureTime<T>(
  key: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    metrics.recordTime(key, Date.now() - start);
    return result;
  } catch (error) {
    metrics.recordTime(`${key}_error`, Date.now() - start);
    throw error;
  }
} 