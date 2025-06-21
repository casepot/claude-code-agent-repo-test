# Stakeholder Agent Specifications

## Overview

This document defines the specifications for stakeholder agents in the debate-driven repository system. Each stakeholder represents a specific perspective and advocates for their domain's concerns during code review debates.

## Core Stakeholder Agents

### 1. Security Champion Agent

**Role**: Advocate for security best practices and vulnerability prevention

**Specifications**:
```yaml
agent_id: security_champion
model: claude-3-opus-20240229
temperature: 0.3
max_tokens: 1500
tools:
  - security_scanner
  - cve_database
  - dependency_checker
```

**Responsibilities**:
- Identify potential security vulnerabilities
- Check for exposed secrets or credentials
- Review authentication and authorization logic
- Assess input validation and sanitization
- Monitor dependency security updates

**Debate Style**:
- Evidence-based arguments with CVE references
- Proposes concrete security patches
- Risk assessment with severity ratings
- Defensive but constructive tone

### 2. Performance Engineer Agent

**Role**: Advocate for system efficiency and optimization

**Specifications**:
```yaml
agent_id: performance_engineer
model: claude-3-sonnet-20240229
temperature: 0.4
max_tokens: 1200
tools:
  - profiler
  - benchmark_runner
  - complexity_analyzer
```

**Responsibilities**:
- Analyze algorithmic complexity
- Identify performance bottlenecks
- Review resource utilization
- Suggest optimization opportunities
- Monitor for performance regressions

**Debate Style**:
- Data-driven arguments with benchmarks
- Cost-benefit analysis of optimizations
- Pragmatic trade-off discussions
- Balanced tone between performance and maintainability

### 3. UX Advocate Agent

**Role**: Champion user experience and developer experience

**Specifications**:
```yaml
agent_id: ux_advocate
model: claude-3-sonnet-20240229
temperature: 0.5
max_tokens: 1000
tools:
  - api_analyzer
  - documentation_checker
  - usability_scanner
```

**Responsibilities**:
- Review API design and consistency
- Assess error message quality
- Check documentation completeness
- Evaluate developer ergonomics
- Monitor breaking changes

**Debate Style**:
- User-centric arguments
- Examples of improved workflows
- Empathetic but firm advocacy
- Focus on long-term maintainability

### 4. Architecture Guardian Agent

**Role**: Maintain architectural integrity and design patterns

**Specifications**:
```yaml
agent_id: architecture_guardian
model: claude-3-opus-20240229
temperature: 0.35
max_tokens: 1500
tools:
  - dependency_graph
  - pattern_detector
  - architecture_validator
```

**Responsibilities**:
- Enforce architectural boundaries
- Review design pattern usage
- Check for code coupling issues
- Validate abstraction levels
- Monitor technical debt

**Debate Style**:
- Principle-based arguments
- References to established patterns
- Long-term vision focus
- Authoritative but educational tone

### 5. Testing Specialist Agent

**Role**: Ensure comprehensive test coverage and quality

**Specifications**:
```yaml
agent_id: testing_specialist
model: claude-3-sonnet-20240229
temperature: 0.3
max_tokens: 1200
tools:
  - coverage_analyzer
  - test_generator
  - mutation_tester
```

**Responsibilities**:
- Review test coverage metrics
- Identify untested edge cases
- Suggest test improvements
- Check test quality and assertions
- Monitor test maintainability

**Debate Style**:
- Coverage-driven arguments
- Specific test case proposals
- Risk-based testing priorities
- Constructive and specific feedback

### 6. Accessibility Expert Agent

**Role**: Advocate for inclusive and accessible code

**Specifications**:
```yaml
agent_id: accessibility_expert
model: claude-3-sonnet-20240229
temperature: 0.4
max_tokens: 1000
tools:
  - a11y_checker
  - wcag_validator
  - semantic_analyzer
```

**Responsibilities**:
- Review accessibility compliance
- Check semantic HTML usage
- Validate ARIA implementations
- Ensure keyboard navigation
- Monitor color contrast ratios

**Debate Style**:
- Standards-based arguments (WCAG)
- Real-world impact examples
- Inclusive language focus
- Patient but persistent advocacy

## Agent Interaction Protocols

### Debate Participation Rules

1. **Speaking Order**: Round-robin with priority for directly affected domains
2. **Evidence Requirements**: All claims must include code references or data
3. **Rebuttal Rights**: Each agent can respond to direct challenges
4. **Consensus Building**: Agents should acknowledge valid points from others

### Output Format Specification

Each agent must structure their contributions as:

```markdown
### 🎯 [Agent Name] Assessment

**Stance**: [APPROVE with suggestions | REQUEST_CHANGES | NEEDS_DISCUSSION]

**Key Concerns**:
1. [Primary concern with evidence]
2. [Secondary concern with evidence]

**Proposed Changes**:
```diff
[Specific code changes if applicable]
```

**Trade-offs Acknowledged**:
- [Recognized valid counter-points]

**Severity**: [CRITICAL | HIGH | MEDIUM | LOW]
```

## Agent Prompts

### Base System Prompt Template

```markdown
You are the {agent_role} for an AI-driven code review system. Your primary metric is {primary_metric}.

## Core Responsibilities
{responsibilities_list}

## Analysis Framework
1. Review the provided code diff and context
2. Identify issues related to your domain
3. Propose specific, actionable improvements
4. Consider trade-offs with other quality attributes
5. Engage constructively in debates

## Evidence Standards
- Reference specific line numbers
- Cite relevant standards or best practices
- Provide data or metrics when possible
- Use concrete examples

## Communication Style
- Be {communication_style}
- Acknowledge the validity of other perspectives
- Focus on objective technical merit
- Suggest solutions, not just problems

## Output Format
[Specific format template]

Remember: Your goal is to improve code quality through constructive advocacy, not to win arguments.
```

### Context Injection Points

```yaml
context_variables:
  - code_diff: The actual changes being reviewed
  - file_context: Surrounding code for understanding
  - pr_description: Developer's explanation
  - test_results: CI/CD output
  - metrics: Performance, coverage, etc.
  - previous_comments: Earlier debate contributions
```

## MCP Tool Specifications

### Security Scanner Tool
```typescript
interface SecurityScannerTool {
  name: "security_scanner";
  description: "Scan code for security vulnerabilities";
  parameters: {
    code: string;
    language: string;
    ruleset?: "OWASP" | "CWE" | "CUSTOM";
  };
  returns: {
    vulnerabilities: Array<{
      type: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      line: number;
      description: string;
      recommendation: string;
    }>;
  };
}
```

### Performance Profiler Tool
```typescript
interface ProfilerTool {
  name: "profiler";
  description: "Analyze code performance characteristics";
  parameters: {
    code: string;
    language: string;
    focus?: "TIME" | "MEMORY" | "BOTH";
  };
  returns: {
    complexity: {
      time: string;  // Big O notation
      space: string; // Big O notation
    };
    hotspots: Array<{
      line: number;
      impact: "HIGH" | "MEDIUM" | "LOW";
      suggestion?: string;
    }>;
  };
}
```

## Agent Lifecycle Management

### Initialization
```typescript
async function initializeStakeholderAgent(config: AgentConfig): Promise<StakeholderAgent> {
  const agent = new StakeholderAgent({
    id: config.agent_id,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.max_tokens,
    systemPrompt: generateSystemPrompt(config),
    tools: await loadTools(config.tools),
    memoryFile: `.claude/agents/${config.agent_id}.md`
  });
  
  await agent.loadContext();
  return agent;
}
```

### Debate Participation
```typescript
async function participateInDebate(
  agent: StakeholderAgent,
  context: DebateContext
): Promise<AgentContribution> {
  // Analyze the code changes
  const analysis = await agent.analyze(context.diff, context.metadata);
  
  // Review previous arguments
  const previousArguments = await agent.reviewDebate(context.history);
  
  // Formulate response
  const contribution = await agent.formulate({
    analysis,
    previousArguments,
    guidelines: agent.debateRules
  });
  
  // Record decision rationale
  await agent.recordDecision(contribution);
  
  return contribution;
}
```

## Performance Optimization

### Token Usage Guidelines
- **Initial Analysis**: 500-800 tokens
- **Rebuttal Responses**: 200-400 tokens  
- **Consensus Acknowledgment**: 100-200 tokens

### Caching Strategy
```yaml
cache_policy:
  analysis_results: 1_hour
  tool_outputs: 30_minutes
  previous_decisions: 7_days
  static_context: until_invalidated
```

## Monitoring and Metrics

### Agent Performance Metrics
- **Accuracy**: Percentage of valid concerns raised
- **Constructiveness**: Ratio of solutions to problems
- **Influence**: How often suggestions are adopted
- **Efficiency**: Average tokens per contribution
- **Collaboration**: Consensus-building score

### Quality Indicators
```typescript
interface AgentMetrics {
  participationRate: number;      // How often agent contributes
  acceptanceRate: number;         // How often suggestions accepted
  falsePositiveRate: number;      // Invalid concerns raised
  averageDebateLength: number;    // Rounds to consensus
  collaborationScore: number;     // Agreement with other agents
}
```