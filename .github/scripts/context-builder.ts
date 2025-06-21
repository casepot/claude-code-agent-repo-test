#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import EvidenceExtractor from './evidence-extractor';
import ArgumentMiner from './argument-miner';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

interface PRContext {
  number: number;
  title: string;
  author: string;
  labels: string[];
  changedFiles: ChangedFile[];
  diff: string;
  commits: Commit[];
  relatedIssues: number[];
  testResults?: TestResults;
  securityScan?: SecurityScan;
  codeMetrics?: CodeMetrics;
  performanceImpact?: PerformanceImpact;
  historicalMatches?: HistoricalMatch[];
  riskAssessment?: RiskAssessment;
  contextHash?: string;
}

interface CodeMetrics {
  complexity: any;
  size: any;
  quality: any;
  dependencies: any;
}

interface PerformanceImpact {
  cpuImpact: string;
  memoryImpact: string;
  ioImpact: string;
  estimatedLatencyChange: number;
  scalabilityIssues: string[];
  optimizationOpportunities: string[];
}

interface HistoricalMatch {
  commit: string;
  date: string;
  author: string;
  similarity: number;
  outcome: string;
  issues: string[];
  performanceImpact?: number;
}

interface RiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  security: number; // 0-10
  performance: number; // 0-10
  architectural: number; // 0-10
  compatibility: number; // 0-10
  summary: string;
}

interface ChangedFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  coverage?: number;
}

interface SecurityScan {
  vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

class ContextBuilder {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private evidenceExtractor: EvidenceExtractor;
  private argumentMiner: ArgumentMiner;
  private cacheDir: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const repository = process.env.GITHUB_REPOSITORY || '';
    [this.owner, this.repo] = repository.split('/');
    
    this.evidenceExtractor = new EvidenceExtractor(process.cwd());
    this.argumentMiner = new ArgumentMiner();
    this.cacheDir = path.join(process.cwd(), '.context-cache');
  }

  async buildContext(prNumber: number, options?: { 
    includeMetrics?: boolean; 
    includeHistory?: boolean;
    summarize?: boolean;
  }): Promise<string> {
    console.error(`Building enhanced context for PR #${prNumber}...`);

    // Initialize cache
    await fs.mkdir(this.cacheDir, { recursive: true });
    await this.evidenceExtractor.initialize();

    // Check cache first
    const cacheKey = this.getCacheKey(prNumber, options);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.error('Using cached context');
      return cached;
    }

    const context = await this.gatherPRContext(prNumber, options);
    const formatted = await this.formatContext(context, options);
    
    // Cache the result
    await this.saveToCache(cacheKey, formatted);
    
    return formatted;
  }

  private async gatherPRContext(prNumber: number, options?: {
    includeMetrics?: boolean;
    includeHistory?: boolean;
  }): Promise<PRContext> {
    // Get PR metadata
    const { data: pr } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    // Get changed files
    const { data: files } = await this.octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Get commits
    const { data: commits } = await this.octokit.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      per_page: 50,
    });

    // Get diff
    const diff = await this.getPRDiff(prNumber);

    // Extract related issues
    const relatedIssues = this.extractIssueReferences(pr.body || '');

    // Get test results if available
    const testResults = await this.getTestResults(pr.head.sha);

    // Get security scan if available
    const securityScan = await this.getSecurityScan(pr.head.sha);

    // Extract code metrics if requested
    let codeMetrics: CodeMetrics | undefined;
    let performanceImpact: PerformanceImpact | undefined;
    let historicalMatches: HistoricalMatch[] | undefined;
    
    if (options?.includeMetrics) {
      const fileList = files.map(f => f.filename);
      codeMetrics = await this.evidenceExtractor.extractCodeMetrics(fileList);
      
      const changes = files.map(f => ({
        file: f.filename,
        type: f.status as 'added' | 'modified' | 'deleted',
        additions: f.additions,
        deletions: f.deletions,
        patches: [f.patch || ''],
      }));
      
      performanceImpact = await this.evidenceExtractor.analyzePerformanceImpact(changes);
    }
    
    if (options?.includeHistory) {
      historicalMatches = await this.evidenceExtractor.findSimilarChanges(diff);
    }

    // Calculate risk assessment
    const riskAssessment = await this.calculateRiskAssessment({
      securityScan,
      codeMetrics,
      performanceImpact,
      changedFiles: files,
    });

    // Generate context hash for caching
    const contextHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ pr: pr.number, sha: pr.head.sha, options }))
      .digest('hex');

    return {
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || 'unknown',
      labels: pr.labels.map(l => l.name),
      changedFiles: files.map(f => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      })),
      diff: diff,
      commits: commits.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name || 'unknown',
        timestamp: c.commit.author?.date || '',
      })),
      relatedIssues,
      testResults,
      securityScan,
      codeMetrics,
      performanceImpact,
      historicalMatches,
      riskAssessment,
      contextHash,
    };
  }

  private async getPRDiff(prNumber: number): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `gh pr diff ${prNumber} --repo ${this.owner}/${this.repo}`
      );
      // Limit diff size to prevent token overflow
      const lines = stdout.split('\n');
      if (lines.length > 1000) {
        return lines.slice(0, 1000).join('\n') + '\n\n... (diff truncated)';
      }
      return stdout;
    } catch (error) {
      console.error('Failed to get PR diff:', error);
      return 'Failed to retrieve diff';
    }
  }

  private extractIssueReferences(text: string): number[] {
    const regex = /#(\d+)/g;
    const matches = text.matchAll(regex);
    return Array.from(matches, m => parseInt(m[1]));
  }

  private async getTestResults(sha: string): Promise<TestResults | undefined> {
    try {
      // Check for test results in check runs
      const { data: checkRuns } = await this.octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: sha,
      });

      const testRun = checkRuns.check_runs.find(run => 
        run.name.toLowerCase().includes('test')
      );

      if (testRun?.output?.summary) {
        // Parse test results from summary
        const summary = testRun.output.summary;
        const passed = parseInt(summary.match(/(\d+) passed/)?.[1] || '0');
        const failed = parseInt(summary.match(/(\d+) failed/)?.[1] || '0');
        const skipped = parseInt(summary.match(/(\d+) skipped/)?.[1] || '0');
        const coverage = parseFloat(summary.match(/coverage: ([\d.]+)%/)?.[1] || '0');

        return { passed, failed, skipped, coverage };
      }
    } catch (error) {
      console.error('Failed to get test results:', error);
    }
    return undefined;
  }

  private async getSecurityScan(sha: string): Promise<SecurityScan | undefined> {
    try {
      // Check for security alerts
      const { data: alerts } = await this.octokit.codeScanning.listAlertsForRepo({
        owner: this.owner,
        repo: this.repo,
        ref: sha,
      });

      const critical = alerts.filter(a => a.rule.severity === 'critical').length;
      const high = alerts.filter(a => a.rule.severity === 'high').length;
      const medium = alerts.filter(a => a.rule.severity === 'medium').length;
      const low = alerts.filter(a => a.rule.severity === 'low').length;

      return {
        vulnerabilities: alerts.length,
        critical,
        high,
        medium,
        low,
      };
    } catch (error) {
      console.error('Failed to get security scan:', error);
    }
    return undefined;
  }

  private async calculateRiskAssessment(data: {
    securityScan?: SecurityScan;
    codeMetrics?: CodeMetrics;
    performanceImpact?: PerformanceImpact;
    changedFiles: any[];
  }): Promise<RiskAssessment> {
    let securityScore = 5; // Default medium
    let performanceScore = 5;
    let architecturalScore = 5;
    let compatibilityScore = 5;
    
    // Security risk calculation
    if (data.securityScan) {
      securityScore = Math.min(10, 
        data.securityScan.critical * 4 +
        data.securityScan.high * 2 +
        data.securityScan.medium * 1 +
        data.securityScan.low * 0.5
      );
    }
    
    // Performance risk calculation
    if (data.performanceImpact) {
      const impactMap = { high: 3, medium: 2, low: 1, none: 0 };
      performanceScore = 
        impactMap[data.performanceImpact.cpuImpact] +
        impactMap[data.performanceImpact.memoryImpact] +
        impactMap[data.performanceImpact.ioImpact] +
        (data.performanceImpact.scalabilityIssues.length * 0.5);
    }
    
    // Architectural risk based on complexity
    if (data.codeMetrics) {
      architecturalScore = Math.min(10,
        (data.codeMetrics.complexity.cyclomatic / 10) +
        (data.codeMetrics.quality.codeSmells * 0.5)
      );
    }
    
    // Compatibility risk based on file changes
    const apiChanges = data.changedFiles.filter(f => 
      f.filename.includes('api') || f.filename.includes('interface')
    ).length;
    compatibilityScore = Math.min(10, apiChanges * 2);
    
    // Calculate overall risk
    const avgScore = (securityScore + performanceScore + architecturalScore + compatibilityScore) / 4;
    let overall: RiskAssessment['overall'] = 'low';
    
    if (avgScore >= 8) overall = 'critical';
    else if (avgScore >= 6) overall = 'high';
    else if (avgScore >= 4) overall = 'medium';
    
    return {
      overall,
      security: securityScore,
      performance: performanceScore,
      architectural: architecturalScore,
      compatibility: compatibilityScore,
      summary: `Overall risk: ${overall}. Key concerns: ${
        securityScore >= 7 ? 'security ' : ''
      }${performanceScore >= 7 ? 'performance ' : ''}${
        architecturalScore >= 7 ? 'architecture ' : ''
      }${compatibilityScore >= 7 ? 'compatibility' : ''}`.trim() || 'None identified',
    };
  }

  private async formatContext(context: PRContext, options?: {
    summarize?: boolean;
  }): Promise<string> {
    let output = `# Pull Request Context

## PR #${context.number}: ${context.title}

**Author**: @${context.author}
**Labels**: ${context.labels.join(', ') || 'none'}
**Related Issues**: ${context.relatedIssues.map(i => `#${i}`).join(', ') || 'none'}

## Summary Statistics

- **Files Changed**: ${context.changedFiles.length}
- **Lines Added**: ${context.changedFiles.reduce((sum, f) => sum + f.additions, 0)}
- **Lines Deleted**: ${context.changedFiles.reduce((sum, f) => sum + f.deletions, 0)}
- **Commits**: ${context.commits.length}

`;

    // Add risk assessment prominently
    if (context.riskAssessment) {
      output += `## 🚨 Risk Assessment

**Overall Risk Level**: ${context.riskAssessment.overall.toUpperCase()}

| Category | Score (0-10) | Risk Level |
|----------|--------------|------------|
| Security | ${context.riskAssessment.security} | ${this.getRiskLevel(context.riskAssessment.security)} |
| Performance | ${context.riskAssessment.performance} | ${this.getRiskLevel(context.riskAssessment.performance)} |
| Architecture | ${context.riskAssessment.architectural} | ${this.getRiskLevel(context.riskAssessment.architectural)} |
| Compatibility | ${context.riskAssessment.compatibility} | ${this.getRiskLevel(context.riskAssessment.compatibility)} |

**Summary**: ${context.riskAssessment.summary}

`;
    }

    if (context.testResults) {
      output += `## Test Results

- **Passed**: ${context.testResults.passed}
- **Failed**: ${context.testResults.failed}
- **Skipped**: ${context.testResults.skipped}
- **Coverage**: ${context.testResults.coverage}%

`;
    }

    if (context.securityScan && context.securityScan.vulnerabilities > 0) {
      output += `## Security Scan

- **Total Vulnerabilities**: ${context.securityScan.vulnerabilities}
- **Critical**: ${context.securityScan.critical}
- **High**: ${context.securityScan.high}
- **Medium**: ${context.securityScan.medium}
- **Low**: ${context.securityScan.low}

`;
    }

    // Add code metrics if available
    if (context.codeMetrics) {
      output += `## Code Metrics

### Complexity
- **Cyclomatic**: ${context.codeMetrics.complexity.cyclomatic.toFixed(2)}
- **Cognitive**: ${context.codeMetrics.complexity.cognitive}
- **Maintainability Index**: ${context.codeMetrics.complexity.maintainabilityIndex.toFixed(2)}

### Quality
- **Code Smells**: ${context.codeMetrics.quality.codeSmells}
- **Technical Debt**: ${context.codeMetrics.quality.technicalDebt} minutes

### Dependencies
- **Direct**: ${context.codeMetrics.dependencies.direct}
- **Vulnerable**: ${context.codeMetrics.dependencies.vulnerable}

`;
    }

    // Add performance impact if available
    if (context.performanceImpact) {
      output += `## Performance Impact Analysis

- **CPU Impact**: ${context.performanceImpact.cpuImpact}
- **Memory Impact**: ${context.performanceImpact.memoryImpact}
- **I/O Impact**: ${context.performanceImpact.ioImpact}
- **Estimated Latency Change**: ${context.performanceImpact.estimatedLatencyChange}ms

### Scalability Issues
${context.performanceImpact.scalabilityIssues.map(issue => `- ${issue}`).join('\n') || '- None identified'}

### Optimization Opportunities
${context.performanceImpact.optimizationOpportunities.map(opp => `- ${opp}`).join('\n') || '- None identified'}

`;
    }

    // Add historical matches if available
    if (context.historicalMatches && context.historicalMatches.length > 0) {
      output += `## Historical Similar Changes

| Commit | Date | Author | Similarity | Outcome | Issues |
|--------|------|--------|------------|---------|--------|
${context.historicalMatches.slice(0, 5).map(match => 
  `| ${match.commit.substring(0, 7)} | ${match.date.split('T')[0]} | ${match.author} | ${(match.similarity * 100).toFixed(1)}% | ${match.outcome} | ${match.issues.join(', ') || 'None'} |`
).join('\n')}

`;
    }

    output += `## Changed Files

${context.changedFiles.map(f => 
  `- \`${f.filename}\` (+${f.additions} -${f.deletions})`
).join('\n')}

## Recent Commits

${context.commits.slice(-10).map(c => 
  `- \`${c.sha.substring(0, 7)}\` ${c.message.split('\n')[0]} - ${c.author}`
).join('\n')}

## Code Changes

### File Analysis

`;

    // Group files by directory
    const filesByDir = new Map<string, ChangedFile[]>();
    for (const file of context.changedFiles) {
      const dir = path.dirname(file.filename);
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, []);
      }
      filesByDir.get(dir)!.push(file);
    }

    // Analyze changes by directory
    for (const [dir, files] of filesByDir) {
      const additions = files.reduce((sum, f) => sum + f.additions, 0);
      const deletions = files.reduce((sum, f) => sum + f.deletions, 0);
      
      output += `#### ${dir}/
- Files: ${files.length}
- Changes: +${additions} -${deletions}

`;
    }

    // Add diff preview
    output += `### Diff Preview

\`\`\`diff
${context.diff}
\`\`\`

`;

    // Add metadata for agents
    output += `## Agent Metadata

\`\`\`json
{
  "pr_number": ${context.number},
  "total_changes": ${context.changedFiles.reduce((sum, f) => sum + f.changes, 0)},
  "file_count": ${context.changedFiles.length},
  "has_tests": ${context.changedFiles.some(f => f.filename.includes('test'))},
  "has_docs": ${context.changedFiles.some(f => f.filename.match(/\.(md|rst|txt)$/))},
  "touches_security": ${context.changedFiles.some(f => 
    f.filename.match(/auth|security|crypto|permission/i)
  )},
  "touches_api": ${context.changedFiles.some(f => 
    f.filename.match(/api|endpoint|route|controller/i)
  )}
}
\`\`\`
`;

    return output;
  }

  private getRiskLevel(score: number): string {
    if (score >= 8) return '🔴 Critical';
    if (score >= 6) return '🟠 High';
    if (score >= 4) return '🟡 Medium';
    return '🟢 Low';
  }

  private getCacheKey(prNumber: number, options?: any): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify({ prNumber, options }))
      .digest('hex');
  }

  private async getFromCache(key: string): Promise<string | null> {
    try {
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      const cached = await fs.readFile(cachePath, 'utf8');
      const data = JSON.parse(cached);
      
      // Check if cache is still valid (1 hour)
      if (Date.now() - data.timestamp < 3600000) {
        return data.content;
      }
    } catch (error) {
      // Cache miss or error
    }
    return null;
  }

  private async saveToCache(key: string, content: string): Promise<void> {
    try {
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(cachePath, JSON.stringify({
        content,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }
}

// Main execution
async function main() {
  const prNumber = parseInt(process.argv[2] || process.env.PR_NUMBER || '0');
  
  if (!prNumber) {
    console.error('Usage: context-builder.ts <pr-number>');
    process.exit(1);
  }

  const builder = new ContextBuilder();
  const context = await builder.buildContext(prNumber);
  console.log(context);
}

main().catch(error => {
  console.error('Error building context:', error);
  process.exit(1);
});