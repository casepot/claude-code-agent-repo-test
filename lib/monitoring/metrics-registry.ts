import { Counter, Histogram, Gauge, Registry } from 'prom-client';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export interface DebateMetrics {
  // Counters
  debatesTotal: Counter;
  agentInvocationsTotal: Counter;
  tokensUsedTotal: Counter;
  errorsTotal: Counter;
  decisionsTotal: Counter;
  
  // Histograms
  debateDuration: Histogram;
  agentResponseTime: Histogram;
  consensusScore: Histogram;
  tokenUsagePerDebate: Histogram;
  argumentComplexity: Histogram;
  
  // Gauges
  activeDebates: Gauge;
  queueDepth: Gauge;
  agentAvailability: Gauge;
  tokenBudgetRemaining: Gauge;
  cacheHitRatio: Gauge;
}

export interface BusinessMetrics {
  prReviewTimeSaved: Histogram;
  issuesPrevented: Counter;
  codeQualityScore: Gauge;
  developerSatisfaction: Histogram;
  costPerDebate: Histogram;
}

export interface SystemMetrics {
  githubApiCalls: Counter;
  githubApiRateLimit: Gauge;
  circuitBreakerStatus: Gauge;
  memoryUsage: Gauge;
  cpuUsage: Gauge;
}

export class MetricsRegistry {
  private registry: Registry;
  private meterProvider: MeterProvider;
  public debate: DebateMetrics;
  public business: BusinessMetrics;
  public system: SystemMetrics;

  constructor() {
    // Initialize Prometheus registry
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      app: 'multi-agent-debate',
      environment: process.env.NODE_ENV || 'development',
    });

    // Initialize OpenTelemetry
    const exporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
      headers: {
        'api-key': process.env.OTEL_API_KEY || '',
      },
    });

    this.meterProvider = new MeterProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'multi-agent-debate',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION || '1.0.0',
      }),
      readers: [
        new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis: 60000, // 1 minute
        }),
      ],
    });

    // Initialize metrics
    this.debate = this.createDebateMetrics();
    this.business = this.createBusinessMetrics();
    this.system = this.createSystemMetrics();
  }

  private createDebateMetrics(): DebateMetrics {
    const meter = this.meterProvider.getMeter('debate');

    return {
      debatesTotal: new Counter({
        name: 'debate_total',
        help: 'Total number of debates initiated',
        labelNames: ['trigger', 'pr_size', 'outcome'],
        registers: [this.registry],
      }),

      agentInvocationsTotal: new Counter({
        name: 'agent_invocations_total',
        help: 'Total number of agent invocations',
        labelNames: ['agent_name', 'agent_type', 'phase'],
        registers: [this.registry],
      }),

      tokensUsedTotal: new Counter({
        name: 'tokens_used_total',
        help: 'Total tokens consumed',
        labelNames: ['agent_name', 'model', 'phase'],
        registers: [this.registry],
      }),

      errorsTotal: new Counter({
        name: 'errors_total',
        help: 'Total errors encountered',
        labelNames: ['agent_name', 'error_type', 'phase'],
        registers: [this.registry],
      }),

      decisionsTotal: new Counter({
        name: 'decisions_total',
        help: 'Total decisions made',
        labelNames: ['decision_type', 'consensus_level'],
        registers: [this.registry],
      }),

      debateDuration: new Histogram({
        name: 'debate_duration_seconds',
        help: 'Duration of debates in seconds',
        buckets: [30, 60, 120, 300, 600, 1200, 1800],
        labelNames: ['trigger', 'complexity'],
        registers: [this.registry],
      }),

      agentResponseTime: new Histogram({
        name: 'agent_response_time_seconds',
        help: 'Agent response time in seconds',
        buckets: [1, 5, 10, 20, 30, 60, 120],
        labelNames: ['agent_name', 'phase'],
        registers: [this.registry],
      }),

      consensusScore: new Histogram({
        name: 'consensus_score',
        help: 'Consensus score distribution (0-1)',
        buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        labelNames: ['decision_type'],
        registers: [this.registry],
      }),

      tokenUsagePerDebate: new Histogram({
        name: 'token_usage_per_debate',
        help: 'Tokens used per debate',
        buckets: [1000, 2500, 5000, 10000, 15000, 20000, 30000],
        labelNames: ['complexity'],
        registers: [this.registry],
      }),

      argumentComplexity: new Histogram({
        name: 'argument_complexity_score',
        help: 'Complexity score of arguments',
        buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        labelNames: ['agent_name'],
        registers: [this.registry],
      }),

      activeDebates: new Gauge({
        name: 'active_debates',
        help: 'Number of currently active debates',
        registers: [this.registry],
      }),

      queueDepth: new Gauge({
        name: 'queue_depth',
        help: 'Number of debates waiting in queue',
        labelNames: ['priority'],
        registers: [this.registry],
      }),

      agentAvailability: new Gauge({
        name: 'agent_availability',
        help: 'Agent availability (0=unavailable, 1=available)',
        labelNames: ['agent_name'],
        registers: [this.registry],
      }),

      tokenBudgetRemaining: new Gauge({
        name: 'token_budget_remaining',
        help: 'Remaining token budget',
        labelNames: ['budget_type'],
        registers: [this.registry],
      }),

      cacheHitRatio: new Gauge({
        name: 'cache_hit_ratio',
        help: 'Cache hit ratio (0-1)',
        labelNames: ['cache_type'],
        registers: [this.registry],
      }),
    };
  }

  private createBusinessMetrics(): BusinessMetrics {
    return {
      prReviewTimeSaved: new Histogram({
        name: 'pr_review_time_saved_hours',
        help: 'Time saved on PR reviews in hours',
        buckets: [0.5, 1, 2, 4, 8, 16, 24],
        registers: [this.registry],
      }),

      issuesPrevented: new Counter({
        name: 'issues_prevented_total',
        help: 'Number of issues prevented by agent review',
        labelNames: ['issue_type', 'severity'],
        registers: [this.registry],
      }),

      codeQualityScore: new Gauge({
        name: 'code_quality_score',
        help: 'Overall code quality score (0-100)',
        labelNames: ['repository'],
        registers: [this.registry],
      }),

      developerSatisfaction: new Histogram({
        name: 'developer_satisfaction_score',
        help: 'Developer satisfaction with agent feedback (1-5)',
        buckets: [1, 2, 3, 4, 5],
        registers: [this.registry],
      }),

      costPerDebate: new Histogram({
        name: 'cost_per_debate_usd',
        help: 'Cost per debate in USD',
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
        registers: [this.registry],
      }),
    };
  }

  private createSystemMetrics(): SystemMetrics {
    return {
      githubApiCalls: new Counter({
        name: 'github_api_calls_total',
        help: 'Total GitHub API calls',
        labelNames: ['endpoint', 'status'],
        registers: [this.registry],
      }),

      githubApiRateLimit: new Gauge({
        name: 'github_api_rate_limit_remaining',
        help: 'Remaining GitHub API rate limit',
        registers: [this.registry],
      }),

      circuitBreakerStatus: new Gauge({
        name: 'circuit_breaker_status',
        help: 'Circuit breaker status (0=closed, 1=open, 0.5=half-open)',
        labelNames: ['service'],
        registers: [this.registry],
      }),

      memoryUsage: new Gauge({
        name: 'memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['type'],
        registers: [this.registry],
      }),

      cpuUsage: new Gauge({
        name: 'cpu_usage_percent',
        help: 'CPU usage percentage',
        registers: [this.registry],
      }),
    };
  }

  /**
   * Get Prometheus metrics for exposition
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Start collecting system metrics
   */
  startCollectors(): void {
    // Collect memory metrics every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.system.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.system.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.system.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.system.memoryUsage.set({ type: 'external' }, memUsage.external);
    }, 30000);

    // Collect CPU metrics every 10 seconds
    let previousCpuUsage = process.cpuUsage();
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(previousCpuUsage);
      const totalUsage = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds
      const cpuPercent = (totalUsage / 10) * 100; // 10 second interval
      this.system.cpuUsage.set(cpuPercent);
      previousCpuUsage = process.cpuUsage();
    }, 10000);
  }

  /**
   * Record a debate metric
   */
  recordDebate(data: {
    trigger: string;
    prSize: 'small' | 'medium' | 'large';
    duration: number;
    tokensUsed: number;
    consensusScore: number;
    outcome: 'approved' | 'rejected' | 'modified';
  }): void {
    this.debate.debatesTotal.inc({
      trigger: data.trigger,
      pr_size: data.prSize,
      outcome: data.outcome,
    });

    this.debate.debateDuration.observe(
      { trigger: data.trigger, complexity: data.prSize },
      data.duration
    );

    this.debate.tokenUsagePerDebate.observe(
      { complexity: data.prSize },
      data.tokensUsed
    );

    this.debate.consensusScore.observe(
      { decision_type: data.outcome },
      data.consensusScore
    );
  }

  /**
   * Record an agent invocation
   */
  recordAgentInvocation(data: {
    agentName: string;
    agentType: 'stakeholder' | 'maintainer';
    phase: string;
    responseTime: number;
    tokensUsed: number;
    error?: string;
  }): void {
    this.debate.agentInvocationsTotal.inc({
      agent_name: data.agentName,
      agent_type: data.agentType,
      phase: data.phase,
    });

    this.debate.agentResponseTime.observe(
      { agent_name: data.agentName, phase: data.phase },
      data.responseTime
    );

    this.debate.tokensUsedTotal.inc(
      {
        agent_name: data.agentName,
        model: 'claude',
        phase: data.phase,
      },
      data.tokensUsed
    );

    if (data.error) {
      this.debate.errorsTotal.inc({
        agent_name: data.agentName,
        error_type: data.error,
        phase: data.phase,
      });
    }
  }

  /**
   * Shutdown and flush metrics
   */
  async shutdown(): Promise<void> {
    await this.meterProvider.shutdown();
  }
}

// Singleton instance
export const metrics = new MetricsRegistry();
metrics.startCollectors();