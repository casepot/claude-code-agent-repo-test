#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CodeMetrics {
  complexity: ComplexityMetrics;
  size: SizeMetrics;
  quality: QualityMetrics;
  dependencies: DependencyMetrics;
}

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  halstead: {
    difficulty: number;
    volume: number;
    effort: number;
  };
  maintainabilityIndex: number;
}

export interface SizeMetrics {
  loc: number;
  sloc: number;
  files: number;
  functions: number;
  classes: number;
}

export interface QualityMetrics {
  duplicateLines: number;
  duplicateBlocks: number;
  codeSmells: number;
  technicalDebt: number; // in minutes
}

export interface DependencyMetrics {
  direct: number;
  transitive: number;
  outdated: number;
  vulnerable: number;
  licenses: string[];
}

export interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  file: string;
  line: number;
  column: number;
  message: string;
  cwe?: string;
  owasp?: string;
  fixSuggestion?: string;
}

export interface PerformanceImpact {
  cpuImpact: 'high' | 'medium' | 'low' | 'none';
  memoryImpact: 'high' | 'medium' | 'low' | 'none';
  ioImpact: 'high' | 'medium' | 'low' | 'none';
  estimatedLatencyChange: number; // in ms
  scalabilityIssues: string[];
  optimizationOpportunities: string[];
}

export interface HistoricalMatch {
  commit: string;
  date: string;
  author: string;
  similarity: number; // 0-1
  outcome: 'merged' | 'rejected' | 'reverted';
  issues: string[];
  performanceImpact?: number;
}

export interface Change {
  file: string;
  type: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  patches: string[];
}

export class EvidenceExtractor {
  private cacheDir: string;
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.cacheDir = path.join(repoPath, '.evidence-cache');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Extract comprehensive code metrics for the given files
   */
  async extractCodeMetrics(files: string[]): Promise<CodeMetrics> {
    const metrics: CodeMetrics = {
      complexity: await this.calculateComplexity(files),
      size: await this.calculateSize(files),
      quality: await this.analyzeQuality(files),
      dependencies: await this.analyzeDependencies(files),
    };

    return metrics;
  }

  /**
   * Find similar historical changes using git history
   */
  async findSimilarChanges(diff: string): Promise<HistoricalMatch[]> {
    const matches: HistoricalMatch[] = [];
    const diffHash = this.hashDiff(diff);

    try {
      // Get recent commits
      const commits = execSync('git log --format="%H|%ai|%an|%s" -n 1000', {
        cwd: this.repoPath,
        encoding: 'utf8',
      }).trim().split('\n');

      for (const commitLine of commits) {
        const [hash, date, author, message] = commitLine.split('|');
        
        // Get diff for this commit
        const commitDiff = execSync(`git show --format="" ${hash}`, {
          cwd: this.repoPath,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10, // 10MB
        }).trim();

        const similarity = this.calculateDiffSimilarity(diff, commitDiff);
        
        if (similarity > 0.3) { // 30% similarity threshold
          const outcome = await this.getCommitOutcome(hash);
          const issues = await this.getRelatedIssues(hash);
          
          matches.push({
            commit: hash,
            date,
            author,
            similarity,
            outcome,
            issues,
            performanceImpact: await this.getHistoricalPerformanceImpact(hash),
          });
        }
      }
    } catch (error) {
      console.error('Error finding similar changes:', error);
    }

    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  /**
   * Scan for security vulnerabilities in code
   */
  async scanSecurityIssues(code: string, filename: string = 'code'): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Common vulnerability patterns
    const patterns = [
      {
        name: 'SQL Injection',
        severity: 'critical' as const,
        regex: /(\$\{[^}]+\}|"\s*\+[^+]+\+\s*")\s*(?:WHERE|SELECT|INSERT|UPDATE|DELETE)/gi,
        message: 'Potential SQL injection vulnerability',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
      },
      {
        name: 'Command Injection',
        severity: 'critical' as const,
        regex: /(exec|spawn|system)\s*\([^)]*\$\{[^}]+\}/gi,
        message: 'Potential command injection vulnerability',
        cwe: 'CWE-78',
        owasp: 'A03:2021',
      },
      {
        name: 'XSS',
        severity: 'high' as const,
        regex: /innerHTML\s*=\s*[^'"`]+(\$\{[^}]+\}|user|input|param)/gi,
        message: 'Potential XSS vulnerability',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
      },
      {
        name: 'Hardcoded Secret',
        severity: 'high' as const,
        regex: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}/gi,
        message: 'Hardcoded secret detected',
        cwe: 'CWE-798',
        owasp: 'A07:2021',
      },
      {
        name: 'Weak Crypto',
        severity: 'medium' as const,
        regex: /\b(MD5|SHA1|DES|RC4)\b/gi,
        message: 'Weak cryptographic algorithm',
        cwe: 'CWE-327',
        owasp: 'A02:2021',
      },
    ];

    const lines = code.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of patterns) {
        const matches = line.matchAll(pattern.regex);
        
        for (const match of matches) {
          issues.push({
            id: crypto.randomUUID(),
            severity: pattern.severity,
            type: pattern.name,
            file: filename,
            line: lineNum + 1,
            column: match.index || 0,
            message: pattern.message,
            cwe: pattern.cwe,
            owasp: pattern.owasp,
            fixSuggestion: this.generateFixSuggestion(pattern.name, line),
          });
        }
      }
    }

    // Additional AST-based analysis would go here
    // For now, we're using regex patterns

    return issues;
  }

  /**
   * Analyze performance impact of changes
   */
  async analyzePerformanceImpact(changes: Change[]): Promise<PerformanceImpact> {
    let cpuImpact: PerformanceImpact['cpuImpact'] = 'none';
    let memoryImpact: PerformanceImpact['memoryImpact'] = 'none';
    let ioImpact: PerformanceImpact['ioImpact'] = 'none';
    let estimatedLatencyChange = 0;
    const scalabilityIssues: string[] = [];
    const optimizationOpportunities: string[] = [];

    for (const change of changes) {
      if (change.type === 'deleted') continue;

      const content = await this.getFileContent(change.file);
      
      // Check for performance anti-patterns
      const antiPatterns = this.detectPerformanceAntiPatterns(content);
      
      if (antiPatterns.nestedLoops > 2) {
        cpuImpact = 'high';
        scalabilityIssues.push(`Deeply nested loops in ${change.file}`);
        estimatedLatencyChange += 50 * antiPatterns.nestedLoops;
      }
      
      if (antiPatterns.synchronousIO > 0) {
        ioImpact = 'high';
        optimizationOpportunities.push(`Convert sync I/O to async in ${change.file}`);
        estimatedLatencyChange += 100 * antiPatterns.synchronousIO;
      }
      
      if (antiPatterns.largeArrayOperations > 0) {
        memoryImpact = 'medium';
        optimizationOpportunities.push(`Optimize array operations in ${change.file}`);
      }
      
      if (antiPatterns.nPlusOneQueries) {
        ioImpact = 'high';
        scalabilityIssues.push(`N+1 query pattern detected in ${change.file}`);
        estimatedLatencyChange += 200;
      }
    }

    return {
      cpuImpact,
      memoryImpact,
      ioImpact,
      estimatedLatencyChange,
      scalabilityIssues,
      optimizationOpportunities,
    };
  }

  // Private helper methods

  private async calculateComplexity(files: string[]): Promise<ComplexityMetrics> {
    // Simplified complexity calculation
    // In production, integrate with tools like ESLint complexity rules
    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let totalFunctions = 0;

    for (const file of files) {
      const content = await this.getFileContent(file);
      const analysis = this.analyzeCodeComplexity(content);
      
      totalCyclomatic += analysis.cyclomatic;
      totalCognitive += analysis.cognitive;
      totalFunctions += analysis.functions;
    }

    const avgCyclomatic = totalFunctions > 0 ? totalCyclomatic / totalFunctions : 0;
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(avgCyclomatic) - 0.23 * totalCognitive);

    return {
      cyclomatic: avgCyclomatic,
      cognitive: totalCognitive,
      halstead: {
        difficulty: avgCyclomatic * 2,
        volume: totalFunctions * 10,
        effort: avgCyclomatic * totalFunctions * 10,
      },
      maintainabilityIndex,
    };
  }

  private analyzeCodeComplexity(content: string): { cyclomatic: number; cognitive: number; functions: number } {
    // Simplified analysis - count control flow statements
    const patterns = {
      functions: /function\s+\w+|=>\s*{|\w+\s*:\s*function/g,
      conditions: /if\s*\(|else\s+if|\?\s*:/g,
      loops: /for\s*\(|while\s*\(|do\s*{/g,
      switches: /switch\s*\(|case\s+/g,
    };

    const functions = (content.match(patterns.functions) || []).length;
    const conditions = (content.match(patterns.conditions) || []).length;
    const loops = (content.match(patterns.loops) || []).length;
    const switches = (content.match(patterns.switches) || []).length;

    return {
      cyclomatic: conditions + loops + switches + 1,
      cognitive: conditions + loops * 2 + switches * 3,
      functions,
    };
  }

  private async calculateSize(files: string[]): Promise<SizeMetrics> {
    let totalLoc = 0;
    let totalSloc = 0;
    let totalFunctions = 0;
    let totalClasses = 0;

    for (const file of files) {
      const content = await this.getFileContent(file);
      const lines = content.split('\n');
      
      totalLoc += lines.length;
      totalSloc += lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
      totalFunctions += (content.match(/function\s+\w+|=>\s*{/g) || []).length;
      totalClasses += (content.match(/class\s+\w+/g) || []).length;
    }

    return {
      loc: totalLoc,
      sloc: totalSloc,
      files: files.length,
      functions: totalFunctions,
      classes: totalClasses,
    };
  }

  private async analyzeQuality(files: string[]): Promise<QualityMetrics> {
    // Simplified quality analysis
    let duplicateLines = 0;
    let duplicateBlocks = 0;
    let codeSmells = 0;
    let technicalDebt = 0;

    for (const file of files) {
      const content = await this.getFileContent(file);
      
      // Check for long functions (code smell)
      const longFunctions = (content.match(/function[\s\S]{500,}}/g) || []).length;
      codeSmells += longFunctions;
      technicalDebt += longFunctions * 30; // 30 minutes per long function
      
      // Check for deep nesting (code smell)
      const deepNesting = (content.match(/{\s*{\s*{\s*{/g) || []).length;
      codeSmells += deepNesting;
      technicalDebt += deepNesting * 15; // 15 minutes per deep nesting
    }

    return {
      duplicateLines,
      duplicateBlocks,
      codeSmells,
      technicalDebt,
    };
  }

  private async analyzeDependencies(files: string[]): Promise<DependencyMetrics> {
    const dependencies = new Set<string>();
    const licenses = new Set<string>();

    // Analyze package.json if it exists
    try {
      const packageJson = await fs.readFile(path.join(this.repoPath, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);
      
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(dep => dependencies.add(dep));
      }
    } catch (error) {
      // No package.json or error reading it
    }

    return {
      direct: dependencies.size,
      transitive: dependencies.size * 3, // Rough estimate
      outdated: 0, // Would need to check npm registry
      vulnerable: 0, // Would need to check vulnerability database
      licenses: Array.from(licenses),
    };
  }

  private detectPerformanceAntiPatterns(content: string): {
    nestedLoops: number;
    synchronousIO: number;
    largeArrayOperations: number;
    nPlusOneQueries: boolean;
  } {
    return {
      nestedLoops: (content.match(/for\s*\([^)]*\)\s*{[^}]*for\s*\(/g) || []).length,
      synchronousIO: (content.match(/readFileSync|execSync|writeFileSync/g) || []).length,
      largeArrayOperations: (content.match(/\.map\s*\([^)]*\)\s*\.filter\s*\([^)]*\)\s*\.map/g) || []).length,
      nPlusOneQueries: /for\s*\([^)]*\)\s*{[^}]*await\s+\w+\.query/g.test(content),
    };
  }

  private async getFileContent(filepath: string): Promise<string> {
    try {
      const fullPath = path.join(this.repoPath, filepath);
      return await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  private hashDiff(diff: string): string {
    return crypto.createHash('sha256').update(diff).digest('hex');
  }

  private calculateDiffSimilarity(diff1: string, diff2: string): number {
    // Simplified similarity calculation using Jaccard index on tokens
    const tokens1 = new Set(diff1.match(/\b\w+\b/g) || []);
    const tokens2 = new Set(diff2.match(/\b\w+\b/g) || []);
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async getCommitOutcome(hash: string): Promise<'merged' | 'rejected' | 'reverted'> {
    try {
      // Check if commit is in main branch
      const inMain = execSync(`git branch --contains ${hash} | grep -E "(main|master)"`, {
        cwd: this.repoPath,
        encoding: 'utf8',
      }).trim();
      
      if (!inMain) return 'rejected';
      
      // Check if commit was reverted
      const revertSearch = execSync(`git log --grep="Revert.*${hash.substring(0, 7)}" --format="%H"`, {
        cwd: this.repoPath,
        encoding: 'utf8',
      }).trim();
      
      if (revertSearch) return 'reverted';
      
      return 'merged';
    } catch (error) {
      return 'merged'; // Default if we can't determine
    }
  }

  private async getRelatedIssues(hash: string): Promise<string[]> {
    try {
      const message = execSync(`git log -1 --format="%B" ${hash}`, {
        cwd: this.repoPath,
        encoding: 'utf8',
      });
      
      const issuePattern = /#(\d+)/g;
      const matches = message.matchAll(issuePattern);
      
      return Array.from(matches, m => m[1]);
    } catch (error) {
      return [];
    }
  }

  private async getHistoricalPerformanceImpact(hash: string): Promise<number | undefined> {
    // This would query performance monitoring data
    // For now, return undefined
    return undefined;
  }

  private generateFixSuggestion(vulnerabilityType: string, code: string): string {
    const suggestions: Record<string, string> = {
      'SQL Injection': 'Use parameterized queries or prepared statements',
      'Command Injection': 'Validate and sanitize input, use safe APIs',
      'XSS': 'Use textContent instead of innerHTML, escape user input',
      'Hardcoded Secret': 'Use environment variables or secret management service',
      'Weak Crypto': 'Use strong algorithms like AES-256, SHA-256',
    };
    
    return suggestions[vulnerabilityType] || 'Review and fix the security issue';
  }
}

// Export for use as a module
export default EvidenceExtractor;