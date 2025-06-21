# Token Optimization Strategies for Multi-Agent Systems

## Executive Summary

This document outlines comprehensive strategies for optimizing token usage in multi-agent systems, particularly focusing on debate-style architectures. While cost is a consideration, the primary focus is on efficiency and performance optimization to maximize the value extracted from each token consumed.

## 1. Token Usage Analysis

### 1.1 Typical Token Consumption in Debates

Multi-agent debates typically consume tokens in several phases:

**Initial Context Loading**
- System prompts: 500-1,500 tokens per agent
- Shared context: 2,000-10,000 tokens
- File contents: Variable (100-50,000+ tokens)

**Debate Rounds**
- Opening statements: 500-1,500 tokens per agent
- Rebuttals: 300-1,000 tokens per exchange
- Summaries: 200-500 tokens per round
- Meta-analysis: 1,000-3,000 tokens

**Typical Total Consumption**
- Small debate (3 agents, 2 rounds): 15,000-25,000 tokens
- Medium debate (5 agents, 3 rounds): 40,000-80,000 tokens
- Large debate (7+ agents, 5+ rounds): 100,000-200,000+ tokens

### 1.2 Cost Breakdown by Agent Type

```
Agent Type          | Tokens/Turn | Cost Weight | Optimization Priority
--------------------|-------------|-------------|---------------------
Architect           | 1,500-3,000 | High        | Critical
Code Reviewer       | 1,000-2,000 | Medium      | Important
Security Analyst    | 800-1,500   | Medium      | Important
Performance Expert  | 1,000-2,000 | Medium      | Important
UX Specialist       | 500-1,000   | Low         | Optional
Documentation       | 300-800     | Low         | Optional
Moderator           | 200-500     | Low         | Minimal
```

### 1.3 Context Window Management Strategies

**Progressive Context Loading**
```python
class ContextManager:
    def __init__(self, max_tokens=100000):
        self.max_tokens = max_tokens
        self.priority_queue = []
        
    def add_context(self, content, priority):
        # Add content with priority-based retention
        self.priority_queue.append((priority, content))
        self._trim_to_limit()
    
    def _trim_to_limit(self):
        # Keep highest priority items within token limit
        self.priority_queue.sort(key=lambda x: x[0], reverse=True)
        total_tokens = 0
        kept_items = []
        
        for priority, content in self.priority_queue:
            content_tokens = self.count_tokens(content)
            if total_tokens + content_tokens <= self.max_tokens:
                kept_items.append((priority, content))
                total_tokens += content_tokens
        
        self.priority_queue = kept_items
```

**Sliding Window Approach**
- Maintain last N exchanges
- Keep critical decisions and rationale
- Discard verbose intermediate discussions
- Preserve key code snippets and decisions

### 1.4 Token Usage Patterns Over Debate Phases

```
Phase               | Token Distribution | Optimization Potential
--------------------|-------------------|----------------------
Initialization      | 20-30%           | High (cache reusable)
Opening Arguments   | 15-20%           | Medium
Core Debate         | 40-50%           | Low (essential)
Consensus Building  | 10-15%           | Medium
Final Summary       | 5-10%            | Low (essential)
```

## 2. Optimization Techniques

### 2.1 Smart Context Truncation

**Intelligent Summarization Pipeline**
```python
def smart_truncate(content, max_tokens, preserve_patterns):
    """
    Intelligently truncate content while preserving critical information
    """
    # Priority preservation order
    preserved = {
        'code_blocks': extract_code_blocks(content),
        'decisions': extract_decisions(content),
        'errors': extract_errors(content),
        'key_points': extract_bullet_points(content)
    }
    
    # Reconstruct with priority
    result = ""
    token_count = 0
    
    for category in ['errors', 'decisions', 'code_blocks', 'key_points']:
        for item in preserved[category]:
            item_tokens = count_tokens(item)
            if token_count + item_tokens < max_tokens:
                result += item + "\n"
                token_count += item_tokens
    
    return result
```

**Context Compression Techniques**
- Remove redundant explanations
- Compress verbose descriptions to bullet points
- Extract and preserve only actionable items
- Use reference pointers instead of full content

### 2.2 Diff Summarization Strategies

**Incremental Updates Only**
```python
class DiffSummarizer:
    def __init__(self):
        self.previous_state = {}
    
    def summarize_changes(self, current_state):
        diff = {
            'added': [],
            'modified': [],
            'removed': [],
            'unchanged_count': 0
        }
        
        for key, value in current_state.items():
            if key not in self.previous_state:
                diff['added'].append(self._compress_addition(key, value))
            elif self.previous_state[key] != value:
                diff['modified'].append(self._compress_change(key, 
                    self.previous_state[key], value))
        
        for key in self.previous_state:
            if key not in current_state:
                diff['removed'].append(key)
        
        # Count unchanged for context
        diff['unchanged_count'] = len(set(current_state.keys()) & 
                                     set(self.previous_state.keys()))
        
        self.previous_state = current_state.copy()
        return self._format_diff(diff)
```

### 2.3 Selective File Inclusion

**Smart File Loading Strategy**
```python
def select_relevant_files(query, file_list, max_files=10):
    """
    Select most relevant files based on query context
    """
    relevance_scores = []
    
    for file in file_list:
        score = calculate_relevance(query, file)
        relevance_scores.append((score, file))
    
    # Sort by relevance and select top files
    relevance_scores.sort(key=lambda x: x[0], reverse=True)
    selected = relevance_scores[:max_files]
    
    # Load files with smart truncation
    loaded_files = []
    for score, file in selected:
        content = load_file_with_truncation(file, 
            max_tokens=2000 if score < 0.8 else 5000)
        loaded_files.append({
            'path': file,
            'content': content,
            'relevance': score
        })
    
    return loaded_files
```

### 2.4 Progressive Context Refinement

**Multi-Pass Refinement**
1. **First Pass**: Broad context, all agents contribute
2. **Second Pass**: Refined focus on contentious points
3. **Third Pass**: Targeted resolution of specific issues
4. **Final Pass**: Consensus summary only

**Context Decay Function**
```python
def apply_context_decay(messages, decay_rate=0.8):
    """
    Apply exponential decay to older messages
    """
    refined_messages = []
    
    for i, msg in enumerate(messages):
        age = len(messages) - i
        retention_probability = decay_rate ** age
        
        if random.random() < retention_probability:
            # Keep full message
            refined_messages.append(msg)
        else:
            # Keep only summary
            refined_messages.append(summarize_message(msg))
    
    return refined_messages
```

## 3. Model Selection Strategy

### 3.1 Task-Appropriate Model Assignment

**Model Selection Matrix**
```
Task Type           | Recommended Model | Rationale
--------------------|------------------|----------------------------------
System Architecture | Claude Opus      | Complex reasoning, holistic view
Code Review         | Claude Opus      | Detailed analysis, pattern recognition
Security Analysis   | Claude Sonnet    | Specialized knowledge, efficiency
Performance Tuning  | Claude Sonnet    | Technical analysis, cost-effective
UI/UX Feedback      | Claude Haiku     | Quick insights, low complexity
Documentation       | Claude Haiku     | Straightforward generation
Moderation          | Claude Haiku     | Simple rule application
```

### 3.2 Dynamic Model Selection

```python
class ModelSelector:
    def __init__(self):
        self.models = {
            'opus': {'cost': 1.0, 'capability': 1.0},
            'sonnet': {'cost': 0.2, 'capability': 0.8},
            'haiku': {'cost': 0.025, 'capability': 0.6}
        }
    
    def select_model(self, task_complexity, budget_remaining, urgency):
        """
        Dynamically select model based on current conditions
        """
        if task_complexity > 0.8 and budget_remaining > 0.5:
            return 'opus'
        elif task_complexity > 0.5 or urgency > 0.8:
            return 'sonnet'
        else:
            return 'haiku'
    
    def adaptive_selection(self, debate_phase, previous_consensus):
        """
        Adapt model selection based on debate progress
        """
        if debate_phase == 'initialization':
            return 'sonnet'  # Good enough for setup
        elif debate_phase == 'core_debate' and previous_consensus < 0.5:
            return 'opus'  # Need maximum capability for conflicts
        elif debate_phase == 'summary':
            return 'haiku'  # Simple consolidation
        else:
            return 'sonnet'  # Default balanced choice
```

### 3.3 Cost-Performance Trade-offs

**Optimization Curves**
```
Performance vs Cost Analysis:
- Opus: 100% performance at 100% cost
- Sonnet: 85% performance at 20% cost (4.25x efficiency)
- Haiku: 70% performance at 2.5% cost (28x efficiency)

Recommended Mix:
- Critical decisions: 20% Opus
- Standard analysis: 60% Sonnet  
- Routine tasks: 20% Haiku
```

### 3.4 Fallback Strategies

```python
class ModelFallbackHandler:
    def __init__(self):
        self.fallback_chain = ['opus', 'sonnet', 'haiku']
        self.retry_limits = {'opus': 2, 'sonnet': 3, 'haiku': 5}
    
    async def execute_with_fallback(self, task):
        for model in self.fallback_chain:
            for attempt in range(self.retry_limits[model]):
                try:
                    result = await self.execute_task(task, model)
                    if self.validate_result(result):
                        return result
                except (RateLimitError, TimeoutError) as e:
                    if attempt == self.retry_limits[model] - 1:
                        continue  # Try next model
                    await self.backoff(attempt)
        
        raise Exception("All models failed")
```

## 4. Caching and Reuse

### 4.1 Common Context Caching

**Hierarchical Cache Structure**
```python
class ContextCache:
    def __init__(self):
        self.system_prompts = {}  # Cached indefinitely
        self.project_context = {}  # Cached per session
        self.debate_history = {}   # Cached per debate
        self.decision_cache = {}   # Cached outcomes
    
    def get_cached_context(self, context_type, key):
        cache_map = {
            'system': self.system_prompts,
            'project': self.project_context,
            'debate': self.debate_history,
            'decision': self.decision_cache
        }
        
        cache = cache_map.get(context_type, {})
        if key in cache:
            return cache[key]['content'], cache[key]['tokens']
        return None, 0
    
    def cache_context(self, context_type, key, content):
        # Implement LRU eviction if needed
        tokens = count_tokens(content)
        cache_entry = {
            'content': content,
            'tokens': tokens,
            'timestamp': time.time(),
            'access_count': 0
        }
        # Store in appropriate cache
```

### 4.2 Debate Template Reuse

**Template Library**
```python
DEBATE_TEMPLATES = {
    'architecture_review': {
        'opening': "Analyze the proposed architecture for {component}...",
        'rebuttal': "Addressing the concerns about {issue}...",
        'consensus': "Based on the discussion, we agree that {decision}..."
    },
    'code_quality': {
        'opening': "Reviewing code quality for {file}...",
        'rebuttal': "Regarding the {concern} raised...",
        'consensus': "The code should be {action} because {reason}..."
    }
}

def generate_from_template(template_type, phase, variables):
    template = DEBATE_TEMPLATES[template_type][phase]
    return template.format(**variables)
```

### 4.3 Memoization of Agent Decisions

```python
class DecisionMemoizer:
    def __init__(self, ttl=3600):
        self.cache = {}
        self.ttl = ttl
    
    def get_memoized_decision(self, agent_type, context_hash):
        key = f"{agent_type}:{context_hash}"
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['decision']
        return None
    
    def memoize_decision(self, agent_type, context_hash, decision):
        key = f"{agent_type}:{context_hash}"
        self.cache[key] = {
            'decision': decision,
            'timestamp': time.time(),
            'hit_count': 0
        }
    
    def compute_context_hash(self, context):
        # Create stable hash of relevant context
        relevant_parts = extract_decision_relevant_parts(context)
        return hashlib.sha256(
            json.dumps(relevant_parts, sort_keys=True).encode()
        ).hexdigest()
```

### 4.4 Session Persistence Strategies

**Persistent Session Manager**
```python
class SessionPersistence:
    def __init__(self, storage_backend):
        self.storage = storage_backend
    
    async def save_session_state(self, session_id, state):
        compressed = self.compress_state(state)
        await self.storage.save(f"session:{session_id}", compressed)
    
    async def restore_session_state(self, session_id):
        compressed = await self.storage.load(f"session:{session_id}")
        return self.decompress_state(compressed) if compressed else None
    
    def compress_state(self, state):
        # Remove redundant data
        essential_state = {
            'decisions': state.get('decisions', []),
            'key_context': self.extract_key_context(state),
            'agent_states': self.compress_agent_states(state.get('agents', {}))
        }
        return gzip.compress(json.dumps(essential_state).encode())
```

## 5. Cost Modeling

### 5.1 Token Cost Calculators

```python
class TokenCostCalculator:
    def __init__(self):
        # Costs per 1M tokens (as of 2024)
        self.model_costs = {
            'claude-3-opus': {'input': 15.00, 'output': 75.00},
            'claude-3-sonnet': {'input': 3.00, 'output': 15.00},
            'claude-3-haiku': {'input': 0.25, 'output': 1.25}
        }
    
    def calculate_debate_cost(self, debate_config):
        total_cost = 0
        
        for round in debate_config['rounds']:
            for agent in round['agents']:
                model = agent['model']
                input_tokens = agent['input_tokens']
                output_tokens = agent['output_tokens']
                
                cost = self.calculate_cost(model, input_tokens, output_tokens)
                total_cost += cost
        
        return {
            'total_cost': total_cost,
            'cost_per_decision': total_cost / len(debate_config['decisions']),
            'efficiency_score': self.calculate_efficiency(debate_config)
        }
    
    def calculate_cost(self, model, input_tokens, output_tokens):
        rates = self.model_costs[model]
        input_cost = (input_tokens / 1_000_000) * rates['input']
        output_cost = (output_tokens / 1_000_000) * rates['output']
        return input_cost + output_cost
```

### 5.2 Budget Allocation Formulas

**Dynamic Budget Distribution**
```python
class BudgetAllocator:
    def __init__(self, total_budget):
        self.total_budget = total_budget
        self.spent = 0
        self.allocations = {
            'initialization': 0.1,    # 10%
            'core_debate': 0.6,       # 60%
            'refinement': 0.2,        # 20%
            'summary': 0.1            # 10%
        }
    
    def allocate_phase_budget(self, phase, remaining_phases):
        phase_allocation = self.allocations[phase]
        remaining_budget = self.total_budget - self.spent
        
        # Adaptive allocation based on remaining work
        if remaining_budget < (self.total_budget * 0.3):
            # Running low, be conservative
            return remaining_budget * 0.5
        else:
            return self.total_budget * phase_allocation
    
    def should_continue_debate(self, consensus_level, cost_so_far):
        # Cost-benefit analysis
        expected_improvement = (1 - consensus_level) * 0.3
        expected_cost = cost_so_far * 0.2  # Estimate 20% more
        
        roi = expected_improvement / expected_cost
        return roi > 0.5  # Continue if ROI > 50%
```

### 5.3 ROI Metrics for Agent Debates

**ROI Calculation Framework**
```python
class DebateROI:
    def calculate_roi(self, debate_metrics):
        # Quantifiable benefits
        bugs_prevented = debate_metrics['bugs_found'] * 1000  # $1000 per bug
        architecture_improvements = debate_metrics['arch_issues'] * 5000
        performance_gains = debate_metrics['perf_improvements'] * 2000
        
        total_benefit = (bugs_prevented + 
                        architecture_improvements + 
                        performance_gains)
        
        total_cost = debate_metrics['token_cost']
        
        roi = (total_benefit - total_cost) / total_cost
        
        return {
            'roi_percentage': roi * 100,
            'net_benefit': total_benefit - total_cost,
            'cost_per_insight': total_cost / debate_metrics['total_insights'],
            'efficiency_rating': self.calculate_efficiency(debate_metrics)
        }
    
    def calculate_efficiency(self, metrics):
        # Insights per dollar spent
        return metrics['total_insights'] / metrics['token_cost']
```

### 5.4 Cost Caps and Circuit Breakers

```python
class CostController:
    def __init__(self, max_cost=10.0, warning_threshold=0.7):
        self.max_cost = max_cost
        self.warning_threshold = warning_threshold
        self.current_cost = 0
        self.cost_history = []
    
    def check_circuit_breaker(self, projected_cost):
        if self.current_cost + projected_cost > self.max_cost:
            raise CostLimitExceeded(f"Would exceed max cost of ${self.max_cost}")
        
        if self.current_cost > (self.max_cost * self.warning_threshold):
            self.trigger_warning()
        
        # Velocity check - rapid cost acceleration
        if self.detect_cost_spike():
            raise CostSpikeDetected("Abnormal cost acceleration detected")
    
    def detect_cost_spike(self, window=5):
        if len(self.cost_history) < window:
            return False
        
        recent_costs = self.cost_history[-window:]
        average_cost = sum(recent_costs) / window
        current_rate = self.cost_history[-1]
        
        return current_rate > (average_cost * 3)  # 3x spike threshold
```

## 6. Production Examples

### 6.1 Real-World Token Usage Data

**Case Study: E-Commerce Platform Architecture Review**
```
Debate Configuration:
- Agents: 5 (Architect, Security, Performance, Database, Frontend)
- Rounds: 4
- Context: 15 files, ~50,000 lines of code

Token Usage:
- Initial Context: 45,000 tokens
- Round 1: 25,000 tokens (5,000 per agent)
- Round 2: 18,000 tokens (3,600 per agent)
- Round 3: 12,000 tokens (2,400 per agent)
- Round 4: 8,000 tokens (1,600 per agent)
- Summary: 5,000 tokens

Total: 113,000 tokens
Cost: $8.50 (mixed model strategy)
Insights Generated: 23
Cost per Insight: $0.37
```

### 6.2 Cost Optimization Case Studies

**Before Optimization**
```
Project: Payment Processing System Review
- All agents using Claude Opus
- Full context passed to each agent
- No caching or deduplication
- Total tokens: 450,000
- Total cost: $45.00
- Time: 25 minutes
```

**After Optimization**
```
Same Project with Optimizations:
- Smart model selection (20% Opus, 60% Sonnet, 20% Haiku)
- Context compression and caching
- Diff-based updates
- Template reuse
- Total tokens: 180,000
- Total cost: $9.20
- Time: 15 minutes
- Quality: 95% of original (measured by insight quality)
```

### 6.3 Benchmarks from Similar Systems

**Industry Comparisons**
```
System Type         | Avg Tokens/Decision | Avg Cost/Decision | Quality Score
--------------------|--------------------|--------------------|---------------
Single LLM          | 5,000              | $0.50             | 75%
Dual Agent          | 15,000             | $1.50             | 85%
Multi-Agent (5+)    | 40,000             | $4.00             | 95%
Optimized Multi     | 20,000             | $1.20             | 92%
```

**Performance Benchmarks**
```python
OPTIMIZATION_BENCHMARKS = {
    'context_compression': {
        'token_reduction': '60-70%',
        'quality_retention': '90-95%',
        'processing_overhead': '50-100ms'
    },
    'smart_caching': {
        'cache_hit_rate': '30-40%',
        'token_savings': '25-35%',
        'memory_usage': '100-500MB'
    },
    'model_selection': {
        'cost_reduction': '70-80%',
        'quality_impact': '5-10%',
        'decision_time': '+0-20%'
    }
}
```

## Implementation Recommendations

### Quick Wins (Implement First)
1. **Template-based responses**: 30% token reduction
2. **Smart file loading**: 40% context reduction
3. **Model mixing**: 70% cost reduction

### Medium-term Optimizations
1. **Context caching system**: 25% token savings
2. **Diff-based updates**: 50% reduction in update costs
3. **Progressive refinement**: 30% quality improvement

### Long-term Strategies
1. **ML-based relevance scoring**: Dynamic context selection
2. **Predictive budget allocation**: Optimal resource distribution
3. **Cross-debate learning**: Reuse insights across projects

## Conclusion

Token optimization in multi-agent systems requires a multi-faceted approach combining smart context management, appropriate model selection, and intelligent caching strategies. The key is finding the right balance between cost efficiency and decision quality.

For systems with unlimited budgets (max plan), focus on:
- Maximizing insight quality through selective Opus usage
- Reducing latency through parallel processing
- Improving developer experience through faster iterations

For cost-conscious implementations, prioritize:
- Aggressive model mixing (80% Sonnet/Haiku)
- Context compression and caching
- Early termination when consensus is reached

Remember: The goal is not to minimize tokens at all costs, but to maximize the value extracted from each token consumed. A well-optimized multi-agent system can deliver 90%+ of the quality at 20-30% of the naive implementation cost.