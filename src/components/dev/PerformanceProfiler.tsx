"use client";

import React, { useEffect } from "react";

// Collects web vitals and logs them to the console
export function PerformanceProfiler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_PROFILER !== "true") return;

    if (typeof window !== "undefined" && "performance" in window) {
      // Basic Web Vitals simulation
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.log(`[PROFILER][CLIENT][${entry.name}] Duration/Value: ${entry.startTime} / ${entry.duration}`);
        });
      });
      observer.observe({ entryTypes: ["paint", "largest-contentful-paint", "layout-shift", "longtask"] });

      return () => observer.disconnect();
    }
  }, []);

  if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_PROFILER !== "true") {
    return <>{children}</>;
  }

  return (
    <React.Profiler id="AppRoot" onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      console.log(`[PROFILER][CLIENT][REACT_RENDER] Phase: ${phase} | Actual: ${actualDuration.toFixed(2)}ms | Base: ${baseDuration.toFixed(2)}ms`);
    }}>
      {children}
    </React.Profiler>
  );
}
