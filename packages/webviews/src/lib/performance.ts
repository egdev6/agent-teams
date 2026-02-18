/**
 * Performance Monitoring Utilities
 * Track and report performance metrics for React 19
 */

import { useEffect } from 'react';

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

// Store metrics
const metrics: PerformanceMetrics[] = [];

/**
 * Mark performance entry
 */
export function markPerformance(name: string) {
  if (typeof performance !== 'undefined') {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof performance !== 'undefined') {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];

      metrics.push({
        name,
        duration: measure.duration,
        timestamp: Date.now(),
      });

      // Log in development
      if (import.meta.env.MODE === 'development') {
        console.log(`⚡ ${name}: ${measure.duration.toFixed(2)}ms`);
      }

      // Clean up
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }
}

/**
 * Get all collected metrics
 */
export function getMetrics(): PerformanceMetrics[] {
  return [...metrics];
}

/**
 * Clear all metrics
 */
export function clearMetrics() {
  metrics.length = 0;
}

/**
 * Hook to measure component render time
 */
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    markPerformance(startMark);

    return () => {
      markPerformance(endMark);
      measurePerformance(measureName, startMark, endMark);
    };
  });
}

/**
 * Report Core Web Vitals
 */
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint (FCP)
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

  if (fcp && import.meta.env.MODE === 'development') {
    console.log(`📊 FCP: ${fcp.startTime.toFixed(2)}ms`);
  }

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (import.meta.env.MODE === 'development') {
          console.log(`📊 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (_error) {
      // Observer not supported
    }
  }
}

/**
 * Log bundle size in development
 */
export function logBundleSize() {
  if (import.meta.env.MODE === 'development' && typeof navigator !== 'undefined') {
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;

    resources.forEach((resource: any) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        totalSize += resource.transferSize || 0;
      }
    });

    const sizeInKB = (totalSize / 1024).toFixed(2);
    console.log(`📦 Total Bundle Size: ${sizeInKB} KB`);
  }
}
