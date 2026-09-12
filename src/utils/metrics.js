/**
 * GoRide Application Observability Metrics
 * High-performance, memory-bounded in-memory metrics accumulator.
 */

const MAX_LATENCY_SAMPLES = 1000;

class MetricsRegistry {
  constructor() {
    this.reset();
  }

  reset() {
    this.startedAt = Date.now();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.statusCategories = {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
    };
    this.methods = {};
    this.statusCodes = {};
    this.errorsByType = {};
    this.queueJobs = {};

    // Fixed-size circular buffer for latencies
    this.latencies = new Float64Array(MAX_LATENCY_SAMPLES);
    this.latencyIndex = 0;
    this.latencyCount = 0;
  }

  /**
   * Record HTTP request completion.
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} route - Route pattern or path
   * @param {number} statusCode - HTTP response code
   * @param {number} durationMs - Duration in milliseconds
   */
  recordRequest(method, route, statusCode, durationMs) {
    this.totalRequests += 1;

    // Methods
    const m = (method || "UNKNOWN").toUpperCase();
    this.methods[m] = (this.methods[m] || 0) + 1;

    // Status code
    const code = Number(statusCode) || 500;
    this.statusCodes[code] = (this.statusCodes[code] || 0) + 1;

    // Status category
    if (code >= 200 && code < 300) {
      this.statusCategories["2xx"] += 1;
    } else if (code >= 300 && code < 400) {
      this.statusCategories["3xx"] += 1;
    } else if (code >= 400 && code < 500) {
      this.statusCategories["4xx"] += 1;
    } else if (code >= 500) {
      this.statusCategories["5xx"] += 1;
      this.totalErrors += 1;
    }

    // Circular latency sample buffer
    const duration = Math.max(0, Number(durationMs) || 0);
    this.latencies[this.latencyIndex] = duration;
    this.latencyIndex = (this.latencyIndex + 1) % MAX_LATENCY_SAMPLES;
    if (this.latencyCount < MAX_LATENCY_SAMPLES) {
      this.latencyCount += 1;
    }
  }

  /**
   * Record custom error occurrence.
   * @param {string} type - Error category or name
   */
  recordError(type = "UnknownError") {
    this.totalErrors += 1;
    this.errorsByType[type] = (this.errorsByType[type] || 0) + 1;
  }

  /**
   * Record background queue job status.
   * @param {string} queueName
   * @param {string} status - "completed", "failed"
   */
  recordQueueJob(queueName, status) {
    if (!this.queueJobs[queueName]) {
      this.queueJobs[queueName] = { completed: 0, failed: 0 };
    }
    if (status === "completed") {
      this.queueJobs[queueName].completed += 1;
    } else if (status === "failed") {
      this.queueJobs[queueName].failed += 1;
    }
  }

  /**
   * Calculate percentile from current latency sample buffer.
   * @param {number} percentile - 50, 90, 95, 99
   */
  getPercentile(percentile) {
    if (this.latencyCount === 0) {
      return 0;
    }

    const samples = Array.from(this.latencies.subarray(0, this.latencyCount)).sort(
      (a, b) => a - b,
    );

    const index = Math.min(
      Math.floor((percentile / 100) * samples.length),
      samples.length - 1,
    );

    return Number(samples[index].toFixed(2));
  }

  /**
   * Get formatted metrics summary.
   */
  getSummary() {
    let sum = 0;
    let min = this.latencyCount > 0 ? Infinity : 0;
    let max = 0;

    for (let i = 0; i < this.latencyCount; i++) {
      const val = this.latencies[i];
      sum += val;
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const avg = this.latencyCount > 0 ? Number((sum / this.latencyCount).toFixed(2)) : 0;
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      requestsByStatus: { ...this.statusCategories },
      requestsByMethod: { ...this.methods },
      statusCodes: { ...this.statusCodes },
      latency: {
        avgMs: avg,
        p50Ms: this.getPercentile(50),
        p90Ms: this.getPercentile(90),
        p95Ms: this.getPercentile(95),
        p99Ms: this.getPercentile(99),
        minMs: min === Infinity ? 0 : Number(min.toFixed(2)),
        maxMs: Number(max.toFixed(2)),
        sampleCount: this.latencyCount,
      },
      queueJobs: { ...this.queueJobs },
      errorsByType: { ...this.errorsByType },
    };
  }
}

const metrics = new MetricsRegistry();

module.exports = metrics;
