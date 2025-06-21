# Implementation Plan: Enhancing the Multi-Agent Debate System (v2)

## 1. Introduction

This document outlines a detailed, research-driven plan for implementing high-priority features to evolve the current multi-agent debate system. The plan synthesizes the project's architectural vision with state-of-the-art findings from the provided research on multi-agent systems, debate protocols, prompt engineering, and token optimization.

The goal is to create a clear roadmap for transforming the existing prototype into a sophisticated, efficient, and intelligent code review tool by focusing on three core pillars: **Debate and Consensus**, **Agent Intelligence**, and **System Efficiency**.

## 2. Guiding Principles from Research

The implementation will be guided by the following key principles synthesized from the research documents:

*   **Structured Argumentation is Key:** The quality of debate is directly tied to the structure of the arguments. Implementing formal models like the **Toulmin Model** or **IBIS** is critical for coherent and evidence-based reasoning (`research/debate-protocols-code-review.md`).
*   **Hierarchy and Trust Drive Consensus:** Effective consensus is not just about voting but about weighted, trust-based decision-making, inspired by proven models like the **Linux Kernel's governance structure** (`research/linux-kernel-governance.md`).
*   **Specialization Enhances Performance:** Agents must be highly specialized through detailed, role-specific prompt engineering and equipped with custom tools via MCP to perform deep analysis rather than just surface-level reviews (`research/stakeholder-prompt-engineering.md`, `research/claude-code-sdk-integration.md`).
*   **Event-Driven Architecture Enables Scalability:** A robust, event-driven workflow is necessary to orchestrate complex, multi-phase agent interactions efficiently (`research/event-driven-ci-architecture.md`).
*   **Efficiency is a Strategic Advantage:** Token and cost optimization are not just about saving money but about enabling more complex and higher-quality analysis within practical limits. This involves a mix of model selection, caching, and context management (`research/token-optimization-strategies.md`).

## 3. High-Priority Implementation Areas

### Feature 1: Structured Debate Protocol and Orchestration

-   **Goal:** Evolve from a simple, sequential comment-and-reply workflow to a formal, multi-phase debate protocol orchestrated by a dedicated moderator.
-   **Detailed Implementation Steps:**
    1.  **Phased Debate Workflow:** Modify the [`.github/workflows/pr-debate.yml`](.github/workflows/pr-debate.yml) to implement a phased approach as described in `research/debate-protocols-code-review.md`. The phases should include:
        *   `initialization`: Identify issues and assign agent roles.
        *   `argumentation`: Allow multiple rounds of claims, evidence, and rebuttals.
        *   `synthesis`: A dedicated phase for maintainer agents to synthesize arguments and propose a final decision.
    2.  **Debate Moderator Logic:** Implement a "Debate Moderator" script within the GitHub Actions workflow. This script will manage the state transitions between phases, enforce time limits, and collect/distribute arguments to the relevant agents for the next phase, following the event-driven patterns in `research/event-driven-ci-architecture.md`.
    3.  **Structured Argumentation Format:** Update all agent prompts to enforce a structured output based on the **Toulmin Model** (`Claim`, `Grounds`, `Warrant`) or **IBIS** (`Issue`, `Position`, `Argument`). This is crucial for the moderator to parse arguments reliably. The templates in `research/stakeholder-prompt-engineering.md` provide an excellent starting point.

### Feature 2: Advanced Agent Intelligence

-   **Goal:** Significantly improve agent performance and consistency through advanced prompt engineering and specialized tooling.
-   **Detailed Implementation Steps:**
    1.  **Deep Prompt Engineering:** Create and populate the missing prompt files in `.github/claude/prompts/`. These prompts should not just define a role but also embed:
        *   **Chain-of-Thought (CoT) Frameworks:** Instruct agents on *how* to reason through a problem, as detailed in `research/stakeholder-prompt-engineering.md`.
        *   **Few-Shot Examples:** Provide concrete examples of high-quality analysis for the agent's specific role to ensure consistent and reliable output.
        *   **Debate Etiquette:** Explicitly define rules for constructive criticism and collaboration.
    2.  **Specialized Tooling via MCP:**
        *   Create a new `mcp/` directory to house a custom `CodeReviewMCPServer` as designed in `architecture/agent-system-design.md`.
        *   Implement initial versions of specialized tools. For example:
            *   `security_scanner`: A tool for the `security_analyst` that wraps a linter or static analysis tool.
            *   `complexity_analyzer`: A tool for the `performance_analyst` that calculates cyclomatic complexity for a given function.
        *   These tools allow agents to base their arguments on direct, verifiable evidence from the code, rather than just inferring from the text.

### Feature 3: Dynamic, Trust-Based Consensus

-   **Goal:** Implement a sophisticated consensus mechanism that reflects the expertise and historical performance of agents, inspired by the Linux Kernel's governance model.
-   **Detailed Implementation Steps:**
    1.  **Dynamic Trust Scores:** Extend the [`.github/claude/agents.yaml`](.github/claude/agents.yaml) to include a `trust_score` for each agent. Initially static, this lays the groundwork for a future system where scores are updated based on performance metrics (e.g., percentage of accepted suggestions, bug detection rate).
    2.  **Weighted Consensus Script:** Replace the `consensus-decision` job with a script that calculates a weighted consensus. The script will:
        *   Parse the structured arguments from each agent.
        *   Assign a weight to each agent's "vote" based on their `decision_weight` and `trust_score`.
        *   Implement the "Hybrid Consensus-Voting" protocol from `research/debate-protocols-code-review.md`, where a decision is escalated to a `core` maintainer (the "Benevolent Dictator") if a consensus threshold is not met.

### Feature 4: Strategic Token and Cost Optimization

-   **Goal:** Implement intelligent, research-backed optimization strategies to improve system efficiency and reduce costs, allowing for more complex analysis.
-   **Detailed Implementation Steps:**
    1.  **Task-Appropriate Model Selection:** Update [`.github/claude/agents.yaml`](.github/claude/agents.yaml) to use a mix of models based on the **Model Selection Matrix** from `research/token-optimization-strategies.md`. Use `claude-3-opus-20240229` for high-stakes architectural decisions, `claude-3-sonnet-20240229` for detailed code analysis, and `claude-3-haiku-20240307` for summarization, documentation, or moderation.
    2.  **Smart Context Management:**
        *   In the `prepare-context` job, implement **intelligent summarization** for very large diffs or files, preserving key elements like function signatures, comments, and errors, as described in `research/token-optimization-strategies.md`.
        *   Implement a **context caching** mechanism (e.g., using GitHub Actions cache) for reusable context like system prompts and project-level documentation to reduce redundant token usage on each run.

## 4. Updated Implementation Roadmap

-   **Phase 1: Foundational Intelligence and Efficiency (Immediate Impact)**
    1.  **Enhanced Prompt Engineering:** Implement detailed, role-specific prompts with CoT and few-shot examples.
    2.  **Token Optimization (Model Selection):** Implement task-appropriate model selection in `agents.yaml`.
    3.  **Token Optimization (Context Caching):** Implement caching for system prompts and static context.

-   **Phase 2: Core Debate and Consensus Mechanics**
    1.  **Structured Debate Protocol:** Rework the GitHub workflow to support a multi-phase debate.
    2.  **Structured Argumentation:** Enforce structured output formats in all agent prompts.
    3.  **Advanced Consensus Mechanism:** Implement the weighted, trust-based consensus script.

-   **Phase 3: Advanced Capabilities and Tooling**
    1.  **Specialized Agent Tooling (MCP):** Build and integrate the first version of the `CodeReviewMCPServer` with placeholder tools.
    2.  **Dynamic Trust Scores:** Design and implement the logic for updating agent trust scores based on performance metrics stored in the `metrics-registry`.