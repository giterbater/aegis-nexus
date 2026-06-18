"""
AEGIS NEXUS — AI Agent Orchestrator

Main orchestration engine for the multi-agent intelligence research pipeline.
Coordinates specialized agents to analyze topics, verify claims, assess risk,
and generate executive briefings.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

from .model_router import complete as model_complete, stream as model_stream, active_provider

logger = logging.getLogger("aegis.agents")


class AgentRole(str, Enum):
    """Defined roles for specialized intelligence agents."""
    PLANNER      = "planner"
    RESEARCHER   = "researcher"
    VERIFIER     = "verifier"
    RISK_ANALYST = "risk_analyst"
    SUMMARIZER   = "summarizer"
    TIMELINE     = "timeline"


@dataclass
class AgentTask:
    """Represents a specific unit of work assigned to an agent."""
    id: str
    topic: str
    priority: int
    context: dict
    assigned_agent: Optional[str] = None
    result: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tokens_used: int = 0


@dataclass
class AgentState:
    """Represents the current status and historical metrics of an agent."""
    id: str
    role: AgentRole
    model: str
    status: str = "idle"
    current_task: Optional[AgentTask] = None
    findings: list[str] = field(default_factory=list)
    total_tokens: int = 0


class AegisOrchestrator:
    """
    Manages a pool of specialized AI agents for deep intelligence analysis.

    Architecture Overview:
    - Planner: Breaks down intelligence topics and delegates subtasks.
    - Researcher: Conducts deep OSINT and detailed analytical research.
    - Verifier: Cross-checks claims across multiple sources for reliability.
    - Risk Analyst: Performs threat modeling and calculates escalation scores.
    - Summarizer: Consolidates all findings into a concise executive briefing.
    """

    # --- Agent Configuration ---

    AGENT_POOL = [
        AgentState(id="planner-001",    role=AgentRole.PLANNER,     model="claude-opus-4-7"),
        AgentState(id="researcher-001", role=AgentRole.RESEARCHER,  model="claude-sonnet-4-6"),
        AgentState(id="researcher-002", role=AgentRole.RESEARCHER,  model="claude-sonnet-4-6"),
        AgentState(id="verifier-001",   role=AgentRole.VERIFIER,    model="claude-haiku-4-5-20251001"),
        AgentState(id="risk-001",       role=AgentRole.RISK_ANALYST,model="claude-opus-4-7"),
        AgentState(id="summary-001",    role=AgentRole.SUMMARIZER,  model="claude-sonnet-4-6"),
    ]

    SYSTEM_PROMPTS = {
        AgentRole.PLANNER: (
            "You are AEGIS-PLANNER, a strategic intelligence coordinator. "
            "Your role is to analyze incoming intelligence topics, identify key angles to investigate, "
            "and delegate structured research tasks to specialized agents. "
            "Always output structured JSON with task breakdowns, priorities, and agent assignments. "
            "Focus on: threat patterns, geopolitical context, historical precedents, actor motivations."
        ),
        AgentRole.RESEARCHER: (
            "You are DEEP-RESEARCH, an advanced OSINT intelligence researcher. "
            "Your role is to conduct deep analysis on specific intelligence topics. "
            "Synthesize information from multiple perspectives, identify key facts, flag uncertainty, "
            "and cite evidence. Structure findings as: key facts, supporting evidence, confidence level, "
            "gaps in knowledge, recommended follow-up."
        ),
        AgentRole.VERIFIER: (
            "You are VERITY, an intelligence verification specialist. "
            "Your role is to cross-check claims, identify contradictions between sources, "
            "assess source reliability, and flag unverified assertions. "
            "Always output: verified claims, disputed claims, unverified claims, source quality scores."
        ),
        AgentRole.RISK_ANALYST: (
            "You are RISKMETRIC, a geopolitical risk and threat modeling analyst. "
            "Your role is to assess escalation probability, model threat scenarios, "
            "quantify uncertainty, and generate risk scores. "
            "Use structured probabilistic analysis. Output: threat score (0-100), "
            "escalation probability, timeframe estimates, key risk indicators."
        ),
        AgentRole.SUMMARIZER: (
            "You are BRIEFER, an executive intelligence summarizer. "
            "Your role is to synthesize multi-agent findings into clear, concise executive briefings. "
            "Structure: executive summary (3 sentences), key findings (bullets), "
            "recommended actions, confidence level, classification recommendation."
        ),
    }

    def __init__(self):
        self.task_queue: asyncio.Queue[AgentTask] = asyncio.Queue()
        self.results: dict[str, dict] = {}
        provider_info = active_provider()
        logger.info("Orchestrator initialized — active provider: %s", provider_info["active"])

    async def run_agent(self, agent: AgentState, task: AgentTask) -> dict:
        """
        Executes a single intelligence task using a specific agent.
        
        Uses the model router for inference and tracks token usage and performance metrics.
        """
        agent.status = "analyzing"
        agent.current_task = task
        task.started_at = datetime.utcnow()

        system_prompt = self.SYSTEM_PROMPTS.get(agent.role, "You are an intelligence analyst.")

        user_message = (
            f"INTELLIGENCE TASK — PRIORITY {task.priority}\n\n"
            f"TOPIC: {task.topic}\n\n"
            f"CONTEXT:\n{task.context.get('summary', '')}\n\n"
            f"EVENTS:\n{self._format_events(task.context.get('events', []))}\n\n"
            f"Conduct your analysis now."
        )

        try:
            model_response = await model_complete(
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=4096,
            )

            content = model_response.text
            tokens  = model_response.input_tokens + model_response.output_tokens

            agent.total_tokens += tokens
            task.tokens_used = tokens
            task.completed_at = datetime.utcnow()
            agent.status = "idle"

            result = {
                "agent_id":    agent.id,
                "role":        agent.role,
                "task_id":     task.id,
                "analysis":    content,
                "tokens_used": tokens,
                "model":       model_response.model,
                "provider":    model_response.provider,
                "cached":      model_response.cached,
                "duration_s":  (task.completed_at - task.started_at).total_seconds(),
            }

            # Extract top findings for quick status reporting
            lines = [l.strip() for l in content.split("\n") if l.strip().startswith("-")]
            agent.findings.extend(lines[:3])

            self.results[task.id] = result
            logger.info(
                "Agent %s completed task %s (%d tokens via %s, cached=%s)",
                agent.id, task.id, tokens, model_response.provider, model_response.cached,
            )
            return result

        except Exception as e:
            agent.status = "error"
            logger.error("Agent %s failed on task %s: %s", agent.id, task.id, e)
            raise

    async def analyze_event(self, event: dict) -> dict:
        """
        Processes an intelligence event through the full multi-stage pipeline.
        
        Pipeline flow: 
        1. Planner (Plan)
        2. Researcher & Verifier (Execute & Validate - Parallel)
        3. Risk Analyst (Score)
        4. Summarizer (Brief)
        """
        logger.info("Starting full analysis pipeline for: %s", event.get("title", "Unknown"))

        planner    = next(a for a in self.AGENT_POOL if a.role == AgentRole.PLANNER)
        researcher = next(a for a in self.AGENT_POOL if a.role == AgentRole.RESEARCHER)
        verifier   = next(a for a in self.AGENT_POOL if a.role == AgentRole.VERIFIER)
        risk_agent = next(a for a in self.AGENT_POOL if a.role == AgentRole.RISK_ANALYST)
        summarizer = next(a for a in self.AGENT_POOL if a.role == AgentRole.SUMMARIZER)

        # Step 1: Strategic Planning
        plan_task = AgentTask(
            id=f"plan-{event['id']}",
            topic=event.get("title", ""),
            priority=1,
            context={"summary": event.get("summary", ""), "events": [event]},
        )
        plan_result = await self.run_agent(planner, plan_task)

        # Step 2: Research + Verification (Parallel execution)
        research_task = AgentTask(
            id=f"research-{event['id']}",
            topic=event.get("title", ""),
            priority=2,
            context={"summary": event.get("summary", ""), "plan": plan_result["analysis"]},
        )
        verify_task = AgentTask(
            id=f"verify-{event['id']}",
            topic=event.get("title", ""),
            priority=2,
            context={"summary": event.get("summary", ""), "sources": event.get("sources", [])},
        )

        research_result, verify_result = await asyncio.gather(
            self.run_agent(researcher, research_task),
            self.run_agent(verifier, verify_task),
        )

        # Step 3: Risk Assessment & Threat Modeling
        risk_task = AgentTask(
            id=f"risk-{event['id']}",
            topic=event.get("title", ""),
            priority=3,
            context={
                "summary":      event.get("summary", ""),
                "research":     research_result["analysis"],
                "verification": verify_result["analysis"],
            },
        )
        risk_result = await self.run_agent(risk_agent, risk_task)

        # Step 4: Executive Briefing Generation
        summary_task = AgentTask(
            id=f"summary-{event['id']}",
            topic=event.get("title", ""),
            priority=4,
            context={
                "plan":         plan_result["analysis"],
                "research":     research_result["analysis"],
                "verification": verify_result["analysis"],
                "risk":         risk_result["analysis"],
            },
        )
        summary_result = await self.run_agent(summarizer, summary_task)

        total_tokens = sum(
            r["tokens_used"]
            for r in [plan_result, research_result, verify_result, risk_result, summary_result]
        )

        logger.info("Analysis complete — %d total tokens used", total_tokens)

        return {
            "event_id":          event["id"],
            "pipeline_complete": True,
            "total_tokens":      total_tokens,
            "stages": {
                "plan":     plan_result,
                "research": research_result,
                "verify":   verify_result,
                "risk":     risk_result,
                "summary":  summary_result,
            },
            "executive_brief": summary_result["analysis"],
        }

    def _format_events(self, events: list) -> str:
        """Helper to format a list of events into a readable string for agent context."""
        return "\n".join(
            f"- [{e.get('threat', 'UNKNOWN')}] {e.get('title', '')}: {e.get('summary', '')}"
            for e in events[:5]
        )


# Global singleton instance
orchestrator = AegisOrchestrator()
