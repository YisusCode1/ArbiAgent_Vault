from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime
import secrets

app = FastAPI(
    title="ArbiAgent AI Engine - Startbase API",
    description="Backend de Inteligencia Artificial y API REST para Vault DeFi ERC-4626 en Arbitrum",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StrategyResponse(BaseModel):
    action: str
    confidence: float
    estimated_apy: float
    risk_level: str
    volatility_7d: float
    recommended_protocol: str
    timestamp: str
    startbase_score: float

class RebalanceRequest(BaseModel):
    vault_address: Optional[str] = "0x8A731D082A895D940a02128a3A8174e92410aEc1"
    target_protocol: Optional[str] = "Aave V3"

class RebalanceResponse(BaseModel):
    success: bool
    txHash: str
    message: str
    timestamp: str

class StartbaseMetrics(BaseModel):
    ecosystem: str
    active_vaults: int
    total_volume_usd: float
    health_score: float
    arbitrum_network_status: str

@app.get("/")
def read_root():
    return {"status": "online", "system": "ArbiAgent AI Backend"}

@app.get("/api/v1/strategy", response_model=StrategyResponse)
def get_current_strategy():
    return StrategyResponse(
        action="HOLD",
        confidence=0.90,
        estimated_apy=5.74,
        risk_level="Bajo",
        volatility_7d=7.85,
        recommended_protocol="Aave V3",
        timestamp=datetime.datetime.utcnow().isoformat(),
        startbase_score=94.5
    )

@app.post("/api/v1/rebalance", response_model=RebalanceResponse)
def execute_rebalance(payload: Optional[RebalanceRequest] = None):
    dummy_hash = "0x" + secrets.token_hex(20)
    return RebalanceResponse(
        success=True,
        txHash=dummy_hash,
        message="Rebalanceo ejecutado correctamente mediante la firma de la IA.",
        timestamp=datetime.datetime.utcnow().isoformat()
    )

@app.get("/api/v1/startbase", response_model=StartbaseMetrics)
def get_startbase_metrics():
    return StartbaseMetrics(
        ecosystem="Arbitrum Sepolia",
        active_vaults=1,
        total_volume_usd=125446.51,
        health_score=98.2,
        arbitrum_network_status="Optimal"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
