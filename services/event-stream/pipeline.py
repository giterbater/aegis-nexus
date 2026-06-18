"""
AEGIS NEXUS — Real-time Event Ingestion Pipeline

Coordinates the flow of intelligence data from raw Kafka streams to 
classified events and agent-driven analysis. Handles deduplication, 
AI-based classification, and vector indexing.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncIterator
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import anthropic
import hashlib
import uuid

logger = logging.getLogger("aegis.pipeline")

# --- Kafka Configuration ---
KAFKA_BOOTSTRAP     = "localhost:9092"
RAW_EVENTS_TOPIC    = "aegis.raw-events"
CLASSIFIED_TOPIC    = "aegis.classified-events"
THREAT_ALERTS_TOPIC = "aegis.threat-alerts"
AGENT_TASKS_TOPIC   = "aegis.agent-tasks"

# --- Vector Store Configuration ---
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION  = "aegis_intelligence"
VECTOR_DIM  = 1536


class IntelligencePipeline:
    """
    Core data ingestion and processing pipeline for AEGIS.
    
    Processing Steps:
    1. Consume raw event data from Kafka.
    2. Deduplicate events using content hashing.
    3. Use AI (Claude) for classification (category, threat level, entities).
    4. Generate vector embeddings for semantic search and deduplication.
    5. Store enriched events in the Qdrant vector database.
    6. Publish classified events to downstream topics.
    7. Route HIGH/CRITICAL threat events to the agent task queue.
    """

    def __init__(self):
        self.anthropic = anthropic.AsyncAnthropic()
        self.qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        self.seen_hashes: set[str] = set()
        self.producer: AIOKafkaProducer | None = None
        self.consumer: AIOKafkaConsumer | None = None
        self._ensure_collection()

    def _ensure_collection(self):
        """Initializes the Qdrant collection if it does not already exist."""
        try:
            self.qdrant.get_collection(COLLECTION)
        except Exception:
            self.qdrant.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
            )
            logger.info(f"Created Qdrant collection: {COLLECTION}")

    async def start(self):
        """Starts the Kafka producer and consumer and enters the main processing loop."""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        self.consumer = AIOKafkaConsumer(
            RAW_EVENTS_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP,
            group_id="aegis-pipeline",
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="latest",
        )
        await self.producer.start()
        await self.consumer.start()
        logger.info("Pipeline ONLINE — consuming from %s", RAW_EVENTS_TOPIC)
        await self._process_loop()

    async def _process_loop(self):
        """Main asynchronous loop for consuming and processing Kafka messages."""
        async for msg in self.consumer:
            raw_event = msg.value
            try:
                await self._process_event(raw_event)
            except Exception as e:
                logger.error("Pipeline error on event %s: %s", raw_event.get("id"), e)

    async def _process_event(self, raw: dict):
        """Processes a single raw event through all pipeline stages."""
        # 1. Content-based Deduplication
        content_hash = hashlib.sha256(
            (raw.get("title", "") + raw.get("body", "")).encode()
        ).hexdigest()

        if content_hash in self.seen_hashes:
            logger.debug("Duplicate event skipped: %s", raw.get("id"))
            return

        self.seen_hashes.add(content_hash)

        # 2. AI Classification and Enrichment
        classified = await self._classify_event(raw)

        # 3. Vector Embedding and Semantic Deduplication
        embedding = await self._embed_text(classified["title"] + " " + classified["summary"])

        # Threshold for considering events near-duplicates
        results = self.qdrant.search(
            collection_name=COLLECTION,
            query_vector=embedding,
            limit=1,
            score_threshold=0.92,
        )
        if results:
            logger.debug("Semantically similar event exists — merging")
            return

        # 4. Persistence to Vector Database
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                **classified,
                "content_hash": content_hash,
                "indexed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        self.qdrant.upsert(collection_name=COLLECTION, points=[point])

        # 5. Downstream Publication
        await self.producer.send(CLASSIFIED_TOPIC, classified)

        # 6. Priority Routing for Autonomous Agent Analysis
        if classified.get("threat") in ("CRITICAL", "HIGH"):
            await self.producer.send(AGENT_TASKS_TOPIC, {
                "type": "ANALYZE",
                "event": classified,
                "priority": 1 if classified["threat"] == "CRITICAL" else 2,
            })
            logger.info("Routed %s event to agent queue: %s", classified["threat"], classified["title"])

    async def _classify_event(self, raw: dict) -> dict:
        """Invokes Claude to classify the raw event data into structured fields."""
        prompt = f"""Classify this intelligence event. Return JSON only.

Title: {raw.get("title", "")}
Body: {raw.get("body", raw.get("content", ""))[:1000]}
Source: {raw.get("source", "unknown")}

Return JSON with these fields:
- id: (keep original or generate uuid)
- title: (cleaned, concise)
- summary: (1-2 sentences)
- category: one of [MILITARY, CYBER, GEOPOLITICAL, ECONOMIC, HUMANITARIAN, NATURAL, HEALTH, INTELLIGENCE, SPACE, NUCLEAR]
- threat: one of [CRITICAL, HIGH, MEDIUM, LOW, NOMINAL]
- confidence: 0-100
- country: primary country affected
- region: geographic region
- tags: list of 3-6 relevant tags
- entities: list of key actors/organizations/locations mentioned
- lat: approximate latitude of primary location (number)
- lng: approximate longitude of primary location (number)"""

        try:
            response = await self.anthropic.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=[{
                    "type": "text",
                    "text": "You are an intelligence classification system. Output only valid JSON.",
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{"role": "user", "content": prompt}],
            )
            classified = json.loads(response.content[0].text)
            classified["timestamp"] = raw.get("timestamp", datetime.now(timezone.utc).isoformat())
            classified["sources"] = raw.get("sources", [raw.get("source", "unknown")])
            return classified

        except Exception as e:
            logger.error("Classification failed: %s", e)
            # Fallback for resiliency
            return {
                **raw,
                "category": "INTELLIGENCE",
                "threat": "MEDIUM",
                "confidence": 50,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    async def _embed_text(self, text: str) -> list[float]:
        """Generates a numerical embedding for the given text for semantic search."""
        # NOTE: Placeholder implementation. Replace with actual embedding model call.
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        import random
        rng = random.Random(h)
        return [rng.gauss(0, 1) for _ in range(VECTOR_DIM)]


async def main():
    """Main entry point for starting the intelligence pipeline."""
    pipeline = IntelligencePipeline()
    await pipeline.start()


if __name__ == "__main__":
    asyncio.run(main())
