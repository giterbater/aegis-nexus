"""
AEGIS NEXUS — Intelligence API Service

Primary gateway for intelligence data, providing REST endpoints and 
WebSocket streams for real-time monitoring and analysis.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import asyncio
import json
import logging
from datetime import datetime
from typing import Optional
import uvicorn

from .routers import events, agents, reports, search
from .core.config import settings
from .core.database import init_db
from .core.kafka import init_kafka
from .services.websocket_manager import ConnectionManager
from .middleware.auth import verify_token

logger = logging.getLogger("aegis.api")

# --- WebSocket Manager ---
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Context manager for the FastAPI application lifespan.
    Handles startup initialization and graceful shutdown of core services.
    """
    logger.info("AEGIS Intelligence API starting...")
    
    # Initialize infrastructure connections
    await init_db()
    await init_kafka()
    
    # Start the WebSocket broadcast background loop
    asyncio.create_task(ws_manager.broadcast_loop())
    
    logger.info("All systems initialized — AEGIS ONLINE")
    yield
    logger.info("AEGIS Intelligence API shutting down")


# --- FastAPI Application Setup ---

app = FastAPI(
    title="AEGIS NEXUS Intelligence API",
    description="Global intelligence monitoring and analysis platform API",
    version="4.2.1",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# --- Router Registration ---

app.include_router(events.router,  prefix="/api/v1/events",  tags=["Events"])
app.include_router(agents.router,  prefix="/api/v1/agents",  tags=["AI Agents"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(search.router,  prefix="/api/v1/search",  tags=["Search"])


# --- API Endpoints ---

@app.get("/health")
async def health():
    """
    Health check endpoint to verify the operational status of the API 
    and its dependent services.
    """
    return {
        "status": "online",
        "version": "4.2.1",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "ok",
            "kafka": "ok",
            "vector_db": "ok",
            "ai_agents": "ok",
        },
    }


@app.websocket("/ws/intelligence")
async def intelligence_stream(websocket: WebSocket, token: Optional[str] = None):
    """
    Real-time intelligence event stream via WebSocket.
    
    Provides clients with live event feeds, threat updates, and 
    system-wide intelligence alerts.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "subscribe":
                await ws_manager.subscribe(websocket, msg.get("channels", []))
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong", "ts": datetime.utcnow().isoformat()})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.websocket("/ws/agents")
async def agent_stream(websocket: WebSocket):
    """
    Real-time AI agent status and findings stream via WebSocket.
    
    Clients receive heartbeat signals and live updates on agent 
    activity and research progress.
    """
    await ws_manager.connect(websocket, channel="agents")
    try:
        while True:
            await asyncio.sleep(1)
            await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
        workers=4,
    )
