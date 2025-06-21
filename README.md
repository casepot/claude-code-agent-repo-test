# Event-Driven Multi-Agent Debate Repository

An advanced GitHub repository system that uses LLM agents to conduct structured debates for code review, inspired by the Linux kernel maintainer model.

## Overview

This repository implements a sophisticated multi-agent system where:
- **Stakeholder agents** analyze PRs from different perspectives (security, performance, UX, etc.)
- **Maintainer agents** synthesize feedback and make decisions
- **Core maintainer** acts as final arbiter when consensus cannot be reached
- All debates follow formal argumentation protocols

## Key Features

### 🤖 Multi-Agent Architecture
- Hierarchical agent structure mimicking Linux kernel governance
- Specialized agents with domain expertise
- Weighted consensus mechanisms
- Structured debate protocols using Toulmin argumentation model

### 🔄 Event-Driven Orchestration
- GitHub Actions-based workflow automation
- Automatic debate triggering based on PR characteristics
- Parallel stakeholder analysis for efficiency
- Sequential maintainer deliberation for synthesis

### 📊 Evidence-Based Decision Making
- Agents provide concrete evidence for claims
- Code-level analysis and metrics
- Historical context awareness
- Traceable decision rationale

### 🔒 Security & Safety
- Prompt injection prevention
- Sandboxed agent execution
- Rate limiting and budget controls
- Comprehensive audit trails

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/your-repo.git

# Install dependencies
npm install

# Set up GitHub secrets
# Add ANTHROPIC_API_KEY to your repository secrets
```

### 2. Triggering a Debate

Debates can be triggered in several ways:

1. **Label a PR**: Add the `needs-debate` label
2. **Comment trigger**: Comment `/debate` on a PR
3. **Automatic**: PRs with 500+ line changes trigger automatically
4. **Manual**: Use the workflow dispatch feature

### 3. Understanding the Process

1. **Evidence Gathering**: Agents analyze the PR independently
2. **Stakeholder Arguments**: Each stakeholder presents their perspective
3. **Maintainer Synthesis**: Maintainers review and synthesize feedback
4. **Consensus Decision**: Weighted voting determines outcome
5. **Action Items**: Clear feedback provided to PR author

## Architecture

### Agent Hierarchy

```
Core Maintainer (Final Arbiter)
    ├── Architecture Maintainer
    ├── Security Maintainer
    ├── Performance Maintainer
    └── Quality Maintainer

Stakeholders (Domain Experts)
    ├── Security Analyst
    ├── Performance Analyst
    ├── UX Advocate
    ├── Testing Advocate
    ├── Compatibility Guardian
    └── Documentation Reviewer
```

### Key Components

- **`.github/claude/agents.yaml`**: Agent configuration and roles
- **`.github/claude/prompts/`**: Agent-specific prompts
- **`.github/workflows/pr-debate.yml`**: Main orchestration workflow
- **`docs/architecture/`**: Detailed system documentation

## Configuration

### Agent Configuration

Edit `.github/claude/agents.yaml` to customize:
- Agent models and parameters
- Temperature settings for creativity vs consistency
- Token budgets
- Domain assignments

### Debate Parameters

Configure debate behavior:
- Phase durations
- Consensus thresholds
- Escalation triggers
- Token limits

## Advanced Features

### 🚀 Performance Optimization
- Parallel stakeholder execution
- Intelligent context windowing
- Response caching
- Circuit breaker patterns

### 📈 Observability
- OpenTelemetry integration
- Debate metrics tracking
- Cost monitoring
- Performance dashboards

### 🔧 Extensibility
- Add custom stakeholder agents
- Define new maintainer roles
- Create specialized prompts
- Implement custom consensus algorithms

## Best Practices

1. **Start Small**: Begin with a few agents and expand gradually
2. **Monitor Costs**: Track token usage and optimize prompts
3. **Iterate on Prompts**: Refine based on debate quality
4. **Human Oversight**: Maintain human review for critical decisions
5. **Document Decisions**: Keep debate transcripts for learning

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Adding new agents
- Improving prompts
- Enhancing workflows
- Reporting issues

## Documentation

- [Architecture Overview](docs/architecture/agent-hierarchy.md)
- [Debate Protocol](docs/architecture/debate-protocol.md)
- [Event Flow](docs/architecture/event-flow.md)
- [Research Documents](research/)

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by the Linux kernel development model
- Built on Claude Code SDK and GitHub Actions
- Informed by state-of-the-art multi-agent research

---

**Note**: This is an experimental system. Always maintain human oversight for critical decisions and monitor agent behavior carefully.