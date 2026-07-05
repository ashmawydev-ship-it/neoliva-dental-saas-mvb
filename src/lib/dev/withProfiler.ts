import { performance } from 'perf_hooks';

export function withProfiler<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  if (process.env.ENABLE_PERFORMANCE_PROFILER !== 'true') {
    return fn;
  }

  return (async (...args: any[]) => {
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      return result;
    } finally {
      const endTime = performance.now();
      const endCpu = process.cpuUsage(startCpu);
      const endMemory = process.memoryUsage();

      const duration = endTime - startTime;
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
      const cpuTime = (endCpu.user + endCpu.system) / 1000; // in ms

      console.log(`[PROFILER][SERVER_ACTION][${name}] Duration: ${duration.toFixed(2)}ms | CPU: ${cpuTime.toFixed(2)}ms | MemDiff: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
    }
  }) as T;
}
