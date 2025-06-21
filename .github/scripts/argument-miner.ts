#!/usr/bin/env node

import * as crypto from 'crypto';

export interface ToulminArgument {
  id: string;
  agent: string;
  timestamp: Date;
  claim: string;
  grounds: string[];
  warrant: string;
  backing: Evidence[];
  qualifier?: string;
  rebuttal?: string;
  strength: number; // 0-1
}

export interface Evidence {
  type: 'code' | 'metric' | 'documentation' | 'historical' | 'external';
  content: string;
  source: string;
  confidence: number; // 0-1
}

export interface ArgumentGraph {
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
}

export interface ArgumentNode {
  id: string;
  argument: ToulminArgument;
  type: 'support' | 'attack' | 'neutral';
}

export interface ArgumentEdge {
  from: string;
  to: string;
  type: 'supports' | 'rebuts' | 'undermines' | 'qualifies';
  strength: number; // 0-1
}

export interface ArgumentMetrics {
  totalArguments: number;
  averageStrength: number;
  consensusLevel: number;
  conflictPoints: string[];
  strongestArguments: ToulminArgument[];
  weakestArguments: ToulminArgument[];
}

export class ArgumentMiner {
  private arguments: Map<string, ToulminArgument> = new Map();
  private graph: ArgumentGraph = { nodes: [], edges: [] };

  /**
   * Parse agent output into structured Toulmin arguments
   */
  parseAgentOutput(agentName: string, output: string): ToulminArgument[] {
    const arguments: ToulminArgument[] = [];
    
    // Split output into sections based on common markers
    const sections = this.splitIntoSections(output);
    
    for (const section of sections) {
      const argument = this.extractToulminComponents(section, agentName);
      if (argument) {
        arguments.push(argument);
        this.arguments.set(argument.id, argument);
      }
    }
    
    return arguments;
  }

  /**
   * Extract evidence citations from arguments
   */
  extractEvidence(text: string): Evidence[] {
    const evidence: Evidence[] = [];
    
    // Pattern matching for different evidence types
    const patterns = {
      code: /`([^`]+)`|```[\s\S]*?```/g,
      fileReference: /(?:file|File):?\s*([^\s:]+):(\d+)/g,
      metric: /(\d+(?:\.\d+)?)\s*(%|ms|MB|ops\/sec)/g,
      citation: /\[([^\]]+)\]\(([^)]+)\)/g,
      historical: /(?:commit|Commit)\s+([a-f0-9]{7,40})/g,
    };
    
    // Extract code evidence
    const codeMatches = text.matchAll(patterns.code);
    for (const match of codeMatches) {
      evidence.push({
        type: 'code',
        content: match[1] || match[0],
        source: 'inline',
        confidence: 0.9,
      });
    }
    
    // Extract file references
    const fileMatches = text.matchAll(patterns.fileReference);
    for (const match of fileMatches) {
      evidence.push({
        type: 'code',
        content: `${match[1]}:${match[2]}`,
        source: 'file',
        confidence: 0.95,
      });
    }
    
    // Extract metrics
    const metricMatches = text.matchAll(patterns.metric);
    for (const match of metricMatches) {
      evidence.push({
        type: 'metric',
        content: match[0],
        source: 'measurement',
        confidence: 0.85,
      });
    }
    
    // Extract external citations
    const citationMatches = text.matchAll(patterns.citation);
    for (const match of citationMatches) {
      evidence.push({
        type: 'external',
        content: match[1],
        source: match[2],
        confidence: 0.8,
      });
    }
    
    // Extract historical references
    const historicalMatches = text.matchAll(patterns.historical);
    for (const match of historicalMatches) {
      evidence.push({
        type: 'historical',
        content: match[1],
        source: 'git',
        confidence: 0.9,
      });
    }
    
    return evidence;
  }

  /**
   * Build argument dependency graph
   */
  buildArgumentGraph(arguments: ToulminArgument[]): ArgumentGraph {
    // Clear existing graph
    this.graph = { nodes: [], edges: [] };
    
    // Add all arguments as nodes
    for (const arg of arguments) {
      this.graph.nodes.push({
        id: arg.id,
        argument: arg,
        type: this.classifyArgument(arg),
      });
    }
    
    // Analyze relationships between arguments
    for (let i = 0; i < arguments.length; i++) {
      for (let j = i + 1; j < arguments.length; j++) {
        const relation = this.analyzeRelationship(arguments[i], arguments[j]);
        if (relation) {
          this.graph.edges.push(relation);
        }
      }
    }
    
    return this.graph;
  }

  /**
   * Calculate argument strength scores
   */
  calculateArgumentStrength(argument: ToulminArgument): number {
    let strength = 0;
    
    // Base score components
    const components = {
      hasGrounds: argument.grounds.length > 0 ? 0.2 : 0,
      groundsQuality: Math.min(argument.grounds.length * 0.1, 0.3),
      hasWarrant: argument.warrant ? 0.2 : 0,
      hasEvidence: argument.backing.length > 0 ? 0.1 : 0,
      evidenceQuality: this.calculateEvidenceQuality(argument.backing) * 0.2,
    };
    
    strength = Object.values(components).reduce((sum, val) => sum + val, 0);
    
    // Modifiers
    if (argument.qualifier) {
      // Qualified arguments show nuance
      strength += 0.05;
    }
    
    if (argument.rebuttal) {
      // Acknowledging rebuttals shows completeness
      strength += 0.05;
    }
    
    // Consider graph relationships
    const supportingEdges = this.graph.edges.filter(
      e => e.to === argument.id && e.type === 'supports'
    );
    const attackingEdges = this.graph.edges.filter(
      e => e.to === argument.id && (e.type === 'rebuts' || e.type === 'undermines')
    );
    
    strength += supportingEdges.length * 0.05;
    strength -= attackingEdges.length * 0.05;
    
    return Math.max(0, Math.min(1, strength));
  }

  /**
   * Generate argument metrics for analysis
   */
  generateMetrics(): ArgumentMetrics {
    const allArguments = Array.from(this.arguments.values());
    
    // Calculate strengths
    for (const arg of allArguments) {
      arg.strength = this.calculateArgumentStrength(arg);
    }
    
    // Sort by strength
    const sortedByStrength = [...allArguments].sort((a, b) => b.strength - a.strength);
    
    // Find conflict points
    const conflictPoints = this.findConflictPoints();
    
    // Calculate consensus
    const consensusLevel = this.calculateConsensusLevel();
    
    return {
      totalArguments: allArguments.length,
      averageStrength: allArguments.reduce((sum, arg) => sum + arg.strength, 0) / allArguments.length,
      consensusLevel,
      conflictPoints,
      strongestArguments: sortedByStrength.slice(0, 3),
      weakestArguments: sortedByStrength.slice(-3).reverse(),
    };
  }

  /**
   * Export argument graph for visualization
   */
  exportGraphML(): string {
    const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="agent" for="node" attr.name="agent" attr.type="string"/>
  <key id="strength" for="node" attr.name="strength" attr.type="double"/>
  <key id="type" for="edge" attr.name="type" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  
  <graph id="ArgumentGraph" edgedefault="directed">
${this.graph.nodes.map(node => `    <node id="${node.id}">
      <data key="label">${this.truncate(node.argument.claim, 50)}</data>
      <data key="agent">${node.argument.agent}</data>
      <data key="strength">${node.argument.strength}</data>
    </node>`).join('\n')}
    
${this.graph.edges.map((edge, i) => `    <edge id="e${i}" source="${edge.from}" target="${edge.to}">
      <data key="type">${edge.type}</data>
      <data key="weight">${edge.strength}</data>
    </edge>`).join('\n')}
  </graph>
</graphml>`;
    
    return graphml;
  }

  // Private helper methods

  private splitIntoSections(output: string): string[] {
    // Split by common section markers
    const markers = [
      /#{1,3}\s+\w+/g,  // Markdown headers
      /\n\n/g,          // Double newlines
      /---+/g,          // Horizontal rules
    ];
    
    let sections = [output];
    
    for (const marker of markers) {
      const newSections: string[] = [];
      for (const section of sections) {
        const parts = section.split(marker);
        newSections.push(...parts.filter(p => p.trim().length > 50)); // Min 50 chars
      }
      sections = newSections;
    }
    
    return sections;
  }

  private extractToulminComponents(section: string, agentName: string): ToulminArgument | null {
    // Look for explicit Toulmin markers
    const explicitPattern = {
      claim: /claim[:\s]+([^\n]+)/i,
      grounds: /grounds?[:\s]+([^\n]+)/gi,
      warrant: /warrant[:\s]+([^\n]+)/i,
      backing: /(?:backing|evidence)[:\s]+([^\n]+)/gi,
      qualifier: /qualifier[:\s]+([^\n]+)/i,
      rebuttal: /rebuttal[:\s]+([^\n]+)/i,
    };
    
    let claim = '';
    const grounds: string[] = [];
    let warrant = '';
    const backing: Evidence[] = [];
    let qualifier = '';
    let rebuttal = '';
    
    // Try explicit extraction first
    const claimMatch = section.match(explicitPattern.claim);
    if (claimMatch) {
      claim = claimMatch[1].trim();
    }
    
    const groundsMatches = section.matchAll(explicitPattern.grounds);
    for (const match of groundsMatches) {
      grounds.push(match[1].trim());
    }
    
    const warrantMatch = section.match(explicitPattern.warrant);
    if (warrantMatch) {
      warrant = warrantMatch[1].trim();
    }
    
    // If no explicit markers, use heuristics
    if (!claim) {
      // First sentence often contains the claim
      const sentences = section.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length > 0) {
        claim = sentences[0].trim();
      }
    }
    
    // Extract evidence
    const evidence = this.extractEvidence(section);
    backing.push(...evidence);
    
    // Only create argument if we have at least a claim
    if (!claim) {
      return null;
    }
    
    return {
      id: crypto.randomUUID(),
      agent: agentName,
      timestamp: new Date(),
      claim,
      grounds,
      warrant,
      backing,
      qualifier,
      rebuttal: rebuttal || undefined,
      strength: 0, // Will be calculated later
    };
  }

  private classifyArgument(argument: ToulminArgument): 'support' | 'attack' | 'neutral' {
    const negativePhrases = /should not|must not|avoid|prevent|dangerous|vulnerable|risk/i;
    const positivePhrases = /should|must|improve|enhance|benefit|secure|safe/i;
    
    if (negativePhrases.test(argument.claim)) {
      return 'attack';
    } else if (positivePhrases.test(argument.claim)) {
      return 'support';
    }
    
    return 'neutral';
  }

  private analyzeRelationship(arg1: ToulminArgument, arg2: ToulminArgument): ArgumentEdge | null {
    // Check for direct references
    if (arg2.claim.includes(arg1.agent) || arg2.rebuttal?.includes(arg1.claim.substring(0, 20))) {
      return {
        from: arg2.id,
        to: arg1.id,
        type: 'rebuts',
        strength: 0.8,
      };
    }
    
    // Check for supporting relationships
    const similarity = this.calculateSimilarity(arg1.claim, arg2.claim);
    if (similarity > 0.7) {
      return {
        from: arg1.id,
        to: arg2.id,
        type: 'supports',
        strength: similarity,
      };
    }
    
    // Check for conflicting claims
    if (this.areConflicting(arg1, arg2)) {
      return {
        from: arg1.id,
        to: arg2.id,
        type: 'undermines',
        strength: 0.7,
      };
    }
    
    return null;
  }

  private calculateEvidenceQuality(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    
    const weights = {
      code: 0.9,
      metric: 0.85,
      documentation: 0.7,
      historical: 0.8,
      external: 0.6,
    };
    
    const totalQuality = evidence.reduce((sum, e) => {
      return sum + (weights[e.type] * e.confidence);
    }, 0);
    
    return Math.min(1, totalQuality / evidence.length);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private areConflicting(arg1: ToulminArgument, arg2: ToulminArgument): boolean {
    // Check for opposite recommendations
    const opposites = [
      ['approve', 'reject'],
      ['allow', 'deny'],
      ['enable', 'disable'],
      ['include', 'exclude'],
    ];
    
    for (const [word1, word2] of opposites) {
      if (
        (arg1.claim.toLowerCase().includes(word1) && arg2.claim.toLowerCase().includes(word2)) ||
        (arg1.claim.toLowerCase().includes(word2) && arg2.claim.toLowerCase().includes(word1))
      ) {
        return true;
      }
    }
    
    return false;
  }

  private findConflictPoints(): string[] {
    const conflicts: string[] = [];
    
    for (const edge of this.graph.edges) {
      if (edge.type === 'rebuts' || edge.type === 'undermines') {
        const fromNode = this.graph.nodes.find(n => n.id === edge.from);
        const toNode = this.graph.nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
          conflicts.push(
            `${fromNode.argument.agent} vs ${toNode.argument.agent}: ${this.truncate(fromNode.argument.claim, 30)}`
          );
        }
      }
    }
    
    return conflicts;
  }

  private calculateConsensusLevel(): number {
    if (this.graph.nodes.length === 0) return 0;
    
    // Count supporting vs conflicting edges
    let supportCount = 0;
    let conflictCount = 0;
    
    for (const edge of this.graph.edges) {
      if (edge.type === 'supports') {
        supportCount++;
      } else if (edge.type === 'rebuts' || edge.type === 'undermines') {
        conflictCount++;
      }
    }
    
    const totalEdges = supportCount + conflictCount;
    if (totalEdges === 0) return 0.5; // No relationships = neutral consensus
    
    return supportCount / totalEdges;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Export for use as a module
export default ArgumentMiner;