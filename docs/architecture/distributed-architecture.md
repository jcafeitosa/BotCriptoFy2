# Arquitetura Distribuída - BotCriptoFy2

## 🏗️ Visão Geral

O BotCriptoFy2 utiliza uma **arquitetura distribuída** com o **backend Elysia** e o **servidor AI/ML Python** em **máquinas separadas**, proporcionando melhor escalabilidade, segurança e performance.

## 📊 Diagrama de Arquitetura Distribuída

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA DISTRIBUÍDA - BOTCRIPTOFY2               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│        MÁQUINA 1                │    │        MÁQUINA 2                │
│     BACKEND ELYSIA              │    │    SERVIDOR AI/ML PYTHON        │
│                                 │    │                                 │
│  ┌─────────────────────────────┐│    │  ┌─────────────────────────────┐│
│  │     ELYSIA BACKEND          ││    │  │     PYTHON AI SERVER        ││
│  │                             ││    │  │                             ││
│  │  ┌─────────────────────┐    ││    │  │  ┌─────────────────────┐    ││
│  │  │   Trading Engine    │    ││    │  │  │   Neural Networks   │    ││
│  │  │   Bot Management    │    ││    │  │  │   LSTM/GRU/Transf   │    ││
│  │  │   Strategy Engine   │    ││    │  │  │   Reinforcement     │    ││
│  │  │   Risk Management   │    ││    │  │  │   Learning          │    ││
│  │  │   Portfolio Mgmt    │    ││    │  │  │   Evolutionary      │    ││
│  │  │   Analytics         │    ││    │  │  │   Strategies        │    ││
│  │  └─────────────────────┘    ││    │  │  └─────────────────────┘    ││
│  │                             ││    │  │                             ││
│  │  ┌─────────────────────┐    ││    │  │  ┌─────────────────────┐    ││
│  │  │   Better-Auth       │    ││    │  │  │   Backtrader        │    ││
│  │  │   User Management   │    ││    │  │  │   Strategy Engine   │    ││
│  │  │   Subscriptions     │    ││    │  │  │   Backtesting       │    ││
│  │  │   Billing           │    ││    │  │  │   Optimization      │    ││
│  │  └─────────────────────┘    ││    │  │  └─────────────────────┘    ││
│  │                             ││    │  │                             ││
│  │  ┌─────────────────────┐    ││    │  │  ┌─────────────────────┐    ││
│  │  │   Módulos Admin     │    ││    │  │  │   CCXT Integration  │    ││
│  │  │   Financeiro        │    ││    │  │  │   Exchange APIs      │    ││
│  │  │   Marketing         │    ││    │  │  │   Real-time Data    │    ││
│  │  │   Vendas            │    ││    │  │  │   Historical Data   │    ││
│  │  │   Segurança         │    ││    │  │  │   Market Analysis   │    ││
│  │  │   SAC               │    ││    │  │  │   News Integration  │    ││
│  │  │   Auditoria         │    ││    │  │  │   Sentiment Analysis│    ││
│  │  │   Documentos        │    ││    │  │  │   Signal Generation │    ││
│  │  │   Configurações     │    ││    │  │  │   Model Training    │    ││
│  │  │   Assinaturas       │    ││    │  │  │   Model Prediction  │    ││
│  │  └─────────────────────┘    ││    │  │  └─────────────────────┘    ││
│  └─────────────────────────────┘│    │  └─────────────────────────────┘│
│                                 │    │                                 │
│  ┌─────────────────────────────┐│    │  ┌─────────────────────────────┐│
│  │     REDIS CLUSTER           ││    │  │     REDIS CLUSTER           ││
│  │   (Cache & Message Queue)   ││    │  │   (Cache & Message Queue)   ││
│  └─────────────────────────────┘│    │  └─────────────────────────────┘│
└─────────────────────────────────┘    └─────────────────────────────────┘
           │                                        │
           └────────────────────────────────────────┘
                           │
           ┌─────────────────────────────────────────┐
           │           MÁQUINA 3                     │
           │        DATABASE SERVER                  │
           │                                         │
           │  ┌─────────────────────────────────┐    │
           │  │        TIMESCALEDB              │    │
           │  │   (Primary Database)            │    │
           │  │   - Trading Data                │    │
           │  │   - User Data                   │    │
           │  │   - AI/ML Data                  │    │
           │  │   - Analytics Data              │    │
           │  └─────────────────────────────────┘    │
           │                                         │
           │  ┌─────────────────────────────────┐    │
           │  │        REDIS CLUSTER            │    │
           │  │   (Centralized Cache)           │    │
           │  │   - Session Cache               │    │
           │  │   - Market Data Cache           │    │
           │  │   - AI Prediction Cache         │    │
           │  │   - Message Queue               │    │
           │  └─────────────────────────────────┘    │
           └─────────────────────────────────────────┘
                           │
           ┌─────────────────────────────────────────┐
           │           MÁQUINA 4                     │
           │        MONITORING SERVER                │
           │                                         │
           │  ┌─────────────────────────────────┐    │
           │  │        PROMETHEUS               │    │
           │  │   (Metrics Collection)          │    │
           │  └─────────────────────────────────┘    │
           │                                         │
           │  ┌─────────────────────────────────┐    │
           │  │        GRAFANA                  │    │
           │  │   (Dashboards & Alerts)         │    │
           │  └─────────────────────────────────┘    │
           │                                         │
           │  ┌─────────────────────────────────┐    │
           │  │        JAEGER                   │    │
           │  │   (Distributed Tracing)         │    │
           │  └─────────────────────────────────┘    │
           └─────────────────────────────────────────┘
```

## 🔧 Especificações das Máquinas

### **Máquina 1: Backend Elysia**
```yaml
# Especificações Mínimas
CPU: 8 cores (Intel Xeon ou AMD EPYC)
RAM: 32GB DDR4
Storage: 500GB SSD NVMe
Network: 1Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 16 cores (Intel Xeon ou AMD EPYC)
RAM: 64GB DDR4
Storage: 1TB SSD NVMe
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Software
- Bun v1.0.0
- Elysia v0.8.0
- Node.js v20.x
- Redis Client
- PostgreSQL Client
- Docker
- Nginx (Load Balancer)
```

### **Máquina 2: Servidor AI/ML Python**
```yaml
# Especificações Mínimas
CPU: 16 cores (Intel Xeon ou AMD EPYC)
RAM: 64GB DDR4
Storage: 1TB SSD NVMe
GPU: NVIDIA RTX 4090 (24GB VRAM)
Network: 1Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 32 cores (Intel Xeon ou AMD EPYC)
RAM: 128GB DDR4
Storage: 2TB SSD NVMe
GPU: NVIDIA A100 (80GB VRAM) ou H100
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Software
- Python 3.11+
- CUDA 12.x
- cuDNN 8.x
- TensorFlow 2.x
- PyTorch 2.x
- Backtrader
- CCXT
- CCXWS
- Redis Client
- PostgreSQL Client
- Docker
- Jupyter Notebook
```

### **Máquina 3: Database Server**
```yaml
# Especificações Mínimas
CPU: 8 cores (Intel Xeon ou AMD EPYC)
RAM: 32GB DDR4
Storage: 2TB SSD NVMe
Network: 1Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 16 cores (Intel Xeon ou AMD EPYC)
RAM: 64GB DDR4
Storage: 4TB SSD NVMe (RAID 1)
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Software
- TimescaleDB 16.0
- PostgreSQL 16.0
- Redis 7.2
- Redis Cluster
- Docker
- pgAdmin
```

### **Máquina 4: Monitoring Server**
```yaml
# Especificações Mínimas
CPU: 4 cores (Intel Xeon ou AMD EPYC)
RAM: 16GB DDR4
Storage: 500GB SSD NVMe
Network: 1Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 8 cores (Intel Xeon ou AMD EPYC)
RAM: 32GB DDR4
Storage: 1TB SSD NVMe
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Software
- Prometheus
- Grafana
- Jaeger
- Alert Manager
- Docker
- Docker Compose
```

## 🔌 Comunicação Entre Máquinas

### **1. Redis Cluster (Comunicação Principal)**
```yaml
# Configuração Redis Cluster
# Máquina 1 (Backend Elysia)
redis-cluster-node-1:
  host: 192.168.1.10
  port: 7000
  role: master

# Máquina 2 (AI/ML Python)
redis-cluster-node-2:
  host: 192.168.1.20
  port: 7000
  role: master

# Máquina 3 (Database Server)
redis-cluster-node-3:
  host: 192.168.1.30
  port: 7000
  role: master

# Canais de Comunicação
channels:
  - elysia:command          # Elysia → Python
  - python:response         # Python → Elysia
  - python:market_data      # Python → Elysia
  - python:ai_prediction    # Python → Elysia
  - python:trading_signal   # Python → Elysia
  - python:model_trained    # Python → Elysia
  - python:optimization_complete # Python → Elysia
```

### **2. HTTP/HTTPS APIs**
```yaml
# Backend Elysia (Máquina 1)
elysia-api:
  host: 192.168.1.10
  port: 3000
  ssl: true
  endpoints:
    - /api/trading/*
    - /api/ai-models/*
    - /api/strategies/*
    - /api/bots/*

# Servidor AI/ML Python (Máquina 2)
python-api:
  host: 192.168.1.20
  port: 8000
  ssl: true
  endpoints:
    - /api/ai/train
    - /api/ai/predict
    - /api/ai/optimize
    - /api/backtrader/backtest
```

### **3. WebSocket (Tempo Real)**
```yaml
# WebSocket para dados em tempo real
websocket:
  elysia: wss://192.168.1.10:3000/ws
  python: wss://192.168.1.20:8000/ws
  
# Canais WebSocket
channels:
  - market_data
  - ai_predictions
  - trading_signals
  - model_status
  - optimization_progress
```

## 🚀 Implementação da Arquitetura Distribuída

### **1. Backend Elysia (Máquina 1)**

```typescript
// backend/src/config/distributed.config.ts
export const distributedConfig = {
  // Configuração do servidor Elysia
  server: {
    host: '0.0.0.0',
    port: 3000,
    ssl: {
      key: process.env.SSL_KEY_PATH,
      cert: process.env.SSL_CERT_PATH
    }
  },
  
  // Configuração do Redis Cluster
  redis: {
    cluster: [
      { host: '192.168.1.10', port: 7000 },
      { host: '192.168.1.20', port: 7000 },
      { host: '192.168.1.30', port: 7000 }
    ],
    options: {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    }
  },
  
  // Configuração do banco de dados
  database: {
    host: '192.168.1.30',
    port: 5432,
    database: 'botcriptofy2',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: true
  },
  
  // Configuração do servidor Python
  pythonServer: {
    host: '192.168.1.20',
    port: 8000,
    ssl: true,
    timeout: 30000,
    retries: 3
  }
};

// backend/src/services/python-server.client.ts
export class PythonServerClient {
  private baseUrl: string;
  private httpClient: HttpClient;
  
  constructor() {
    this.baseUrl = `https://${distributedConfig.pythonServer.host}:${distributedConfig.pythonServer.port}`;
    this.httpClient = new HttpClient({
      baseURL: this.baseUrl,
      timeout: distributedConfig.pythonServer.timeout,
      retries: distributedConfig.pythonServer.retries,
      ssl: true
    });
  }
  
  async createModel(modelData: CreateModelRequest): Promise<ModelResponse> {
    const response = await this.httpClient.post('/api/ai/models', modelData);
    return response.data;
  }
  
  async trainModel(modelId: string, trainingData: TrainingData): Promise<TrainingResponse> {
    const response = await this.httpClient.post(`/api/ai/models/${modelId}/train`, trainingData);
    return response.data;
  }
  
  async getPrediction(modelId: string, symbol: string): Promise<PredictionResponse> {
    const response = await this.httpClient.get(`/api/ai/models/${modelId}/predict?symbol=${symbol}`);
    return response.data;
  }
  
  async generateSignal(modelId: string, signalData: SignalRequest): Promise<SignalResponse> {
    const response = await this.httpClient.post(`/api/ai/models/${modelId}/signal`, signalData);
    return response.data;
  }
  
  async optimizeStrategy(strategyId: string, optimizationData: OptimizationRequest): Promise<OptimizationResponse> {
    const response = await this.httpClient.post(`/api/backtrader/strategies/${strategyId}/optimize`, optimizationData);
    return response.data;
  }
}
```

### **2. Servidor AI/ML Python (Máquina 2)**

```python
# python-ai-server/main.py
import asyncio
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.ssl import SSLRedirectMiddleware
import uvicorn
import redis
import ssl
from typing import Dict, List, Optional
import os

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração da aplicação
app = FastAPI(
    title="BotCriptoFy2 AI/ML Server",
    description="Servidor de IA e Machine Learning para trading",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://192.168.1.10"],  # Backend Elysia
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# SSL
app.add_middleware(SSLRedirectMiddleware)

# Configuração Redis
redis_client = redis.Redis(
    host='192.168.1.30',  # Database Server
    port=6379,
    db=0,
    ssl=True,
    ssl_cert_reqs=ssl.CERT_REQUIRED
)

# Configuração do servidor
SERVER_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'ssl_keyfile': os.getenv('SSL_KEY_PATH'),
    'ssl_certfile': os.getenv('SSL_CERT_PATH')
}

class AIServer:
    def __init__(self):
        self.models = {}
        self.exchanges = {}
        self.websockets = {}
        self.running = False
    
    async def start(self):
        """Iniciar servidor AI/ML"""
        logger.info("Iniciando servidor AI/ML...")
        self.running = True
        
        # Inicializar componentes
        await self.initialize_exchanges()
        await self.initialize_models()
        await self.initialize_websockets()
        
        # Iniciar loops de processamento
        asyncio.create_task(self.market_data_loop())
        asyncio.create_task(self.ai_prediction_loop())
        asyncio.create_task(self.signal_generation_loop())
        asyncio.create_task(self.redis_communication_loop())
        
        logger.info("Servidor AI/ML iniciado com sucesso")
    
    async def initialize_exchanges(self):
        """Inicializar exchanges via CCXT"""
        # Implementar inicialização das exchanges
        pass
    
    async def initialize_models(self):
        """Inicializar modelos AI/ML"""
        # Implementar carregamento dos modelos
        pass
    
    async def initialize_websockets(self):
        """Inicializar WebSockets via CCXWS"""
        # Implementar inicialização dos WebSockets
        pass
    
    async def market_data_loop(self):
        """Loop principal de dados de mercado"""
        while self.running:
            try:
                # Implementar loop de dados de mercado
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Erro no loop de dados de mercado: {e}")
                await asyncio.sleep(5)
    
    async def ai_prediction_loop(self):
        """Loop principal de predições AI"""
        while self.running:
            try:
                # Implementar loop de predições AI
                await asyncio.sleep(60)
            except Exception as e:
                logger.error(f"Erro no loop de predições AI: {e}")
                await asyncio.sleep(10)
    
    async def signal_generation_loop(self):
        """Loop principal de geração de sinais"""
        while self.running:
            try:
                # Implementar loop de geração de sinais
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"Erro no loop de geração de sinais: {e}")
                await asyncio.sleep(5)
    
    async def redis_communication_loop(self):
        """Loop de comunicação com Redis"""
        while self.running:
            try:
                # Implementar loop de comunicação Redis
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Erro no loop de comunicação Redis: {e}")
                await asyncio.sleep(1)

# Instância do servidor
ai_server = AIServer()

# Endpoints da API
@app.post("/api/ai/models")
async def create_model(model_data: dict):
    """Criar novo modelo AI"""
    try:
        # Implementar criação de modelo
        return {"success": True, "model_id": "new_model_id"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/models/{model_id}/train")
async def train_model(model_id: str, training_data: dict):
    """Treinar modelo AI"""
    try:
        # Implementar treinamento de modelo
        return {"success": True, "training_id": "training_id"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/models/{model_id}/predict")
async def get_prediction(model_id: str, symbol: str):
    """Obter predição do modelo"""
    try:
        # Implementar predição
        return {"prediction": 0.5, "confidence": 0.8}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/models/{model_id}/signal")
async def generate_signal(model_id: str, signal_data: dict):
    """Gerar sinal de trading"""
    try:
        # Implementar geração de sinal
        return {"signal": "buy", "strength": 0.7, "confidence": 0.8}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backtrader/strategies/{strategy_id}/optimize")
async def optimize_strategy(strategy_id: str, optimization_data: dict):
    """Otimizar estratégia"""
    try:
        # Implementar otimização de estratégia
        return {"success": True, "optimization_id": "opt_id"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Inicializar servidor
@app.on_event("startup")
async def startup_event():
    await ai_server.start()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=SERVER_CONFIG['host'],
        port=SERVER_CONFIG['port'],
        ssl_keyfile=SERVER_CONFIG['ssl_keyfile'],
        ssl_certfile=SERVER_CONFIG['ssl_certfile'],
        log_level="info"
    )
```

### **3. Docker Compose para Deploy**

```yaml
# docker-compose.distributed.yml
version: '3.8'

services:
  # Backend Elysia (Máquina 1)
  elysia-backend:
    build: ./backend
    container_name: elysia-backend
    ports:
      - "3000:3000"
      - "3001:3001"  # WebSocket
    environment:
      - NODE_ENV=production
      - REDIS_CLUSTER_NODES=192.168.1.10:7000,192.168.1.20:7000,192.168.1.30:7000
      - DATABASE_HOST=192.168.1.30
      - DATABASE_PORT=5432
      - PYTHON_SERVER_HOST=192.168.1.20
      - PYTHON_SERVER_PORT=8000
    volumes:
      - ./backend:/app
      - /etc/ssl/certs:/etc/ssl/certs
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  # Servidor AI/ML Python (Máquina 2)
  python-ai-server:
    build: ./python-ai-server
    container_name: python-ai-server
    ports:
      - "8000:8000"
      - "8001:8001"  # WebSocket
    environment:
      - PYTHON_ENV=production
      - REDIS_HOST=192.168.1.30
      - REDIS_PORT=6379
      - DATABASE_HOST=192.168.1.30
      - DATABASE_PORT=5432
      - ELYSIA_SERVER_HOST=192.168.1.10
      - ELYSIA_SERVER_PORT=3000
    volumes:
      - ./python-ai-server:/app
      - /etc/ssl/certs:/etc/ssl/certs
      - ./models:/app/models
      - ./data:/app/data
    networks:
      - botcriptofy2-network
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # Database Server (Máquina 3)
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: timescaledb
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=botcriptofy2
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_password
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  redis-cluster:
    image: redis:7.2-alpine
    container_name: redis-cluster
    ports:
      - "6379:6379"
      - "7000:7000"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  # Monitoring Server (Máquina 4)
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - botcriptofy2-network
    restart: unless-stopped

volumes:
  timescaledb_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  botcriptofy2-network:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.1.0/24
```

### **4. Scripts de Deploy**

```bash
#!/bin/bash
# deploy-distributed.sh

echo "🚀 Deploying BotCriptoFy2 Distributed Architecture..."

# Máquina 1: Backend Elysia
echo "📦 Deploying Backend Elysia on Machine 1..."
ssh user@192.168.1.10 << 'EOF'
cd /opt/botcriptofy2
git pull origin main
docker-compose -f docker-compose.distributed.yml up -d elysia-backend
EOF

# Máquina 2: Servidor AI/ML Python
echo "🤖 Deploying AI/ML Python Server on Machine 2..."
ssh user@192.168.1.20 << 'EOF'
cd /opt/botcriptofy2
git pull origin main
docker-compose -f docker-compose.distributed.yml up -d python-ai-server
EOF

# Máquina 3: Database Server
echo "🗄️ Deploying Database Server on Machine 3..."
ssh user@192.168.1.30 << 'EOF'
cd /opt/botcriptofy2
git pull origin main
docker-compose -f docker-compose.distributed.yml up -d timescaledb redis-cluster
EOF

# Máquina 4: Monitoring Server
echo "📊 Deploying Monitoring Server on Machine 4..."
ssh user@192.168.1.40 << 'EOF'
cd /opt/botcriptofy2
git pull origin main
docker-compose -f docker-compose.distributed.yml up -d prometheus grafana
EOF

echo "✅ Deploy completed successfully!"
```

## 🔒 Segurança da Arquitetura Distribuída

### **1. Firewall Rules**
```bash
# Máquina 1: Backend Elysia
ufw allow 3000/tcp  # Elysia API
ufw allow 3001/tcp  # WebSocket
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.20 to any port 3000  # Python Server
ufw allow from 192.168.1.30 to any port 3000  # Database Server

# Máquina 2: Servidor AI/ML Python
ufw allow 8000/tcp  # Python API
ufw allow 8001/tcp  # WebSocket
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.10 to any port 8000  # Elysia Backend
ufw allow from 192.168.1.30 to any port 8000  # Database Server

# Máquina 3: Database Server
ufw allow 5432/tcp  # PostgreSQL
ufw allow 6379/tcp  # Redis
ufw allow 7000/tcp  # Redis Cluster
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.10 to any port 5432  # Elysia Backend
ufw allow from 192.168.1.20 to any port 5432  # Python Server

# Máquina 4: Monitoring Server
ufw allow 9090/tcp  # Prometheus
ufw allow 3001/tcp  # Grafana
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.0/24 to any port 9090  # Internal Network
ufw allow from 192.168.1.0/24 to any port 3001  # Internal Network
```

### **2. SSL/TLS Certificates**
```bash
# Gerar certificados SSL para cada máquina
# Máquina 1: Backend Elysia
openssl req -x509 -newkey rsa:4096 -keyout elysia.key -out elysia.crt -days 365 -nodes -subj "/CN=192.168.1.10"

# Máquina 2: Servidor AI/ML Python
openssl req -x509 -newkey rsa:4096 -keyout python.key -out python.crt -days 365 -nodes -subj "/CN=192.168.1.20"

# Máquina 3: Database Server
openssl req -x509 -newkey rsa:4096 -keyout database.key -out database.crt -days 365 -nodes -subj "/CN=192.168.1.30"

# Máquina 4: Monitoring Server
openssl req -x509 -newkey rsa:4096 -keyout monitoring.key -out monitoring.crt -days 365 -nodes -subj "/CN=192.168.1.40"
```

## 📊 Monitoramento da Arquitetura Distribuída

### **1. Métricas de Performance**
```yaml
# Prometheus Configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'elysia-backend'
    static_configs:
      - targets: ['192.168.1.10:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'python-ai-server'
    static_configs:
      - targets: ['192.168.1.20:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'timescaledb'
    static_configs:
      - targets: ['192.168.1.30:5432']
    scrape_interval: 30s

  - job_name: 'redis-cluster'
    static_configs:
      - targets: ['192.168.1.30:6379']
    scrape_interval: 30s
```

### **2. Dashboards Grafana**
```json
{
  "dashboard": {
    "title": "BotCriptoFy2 Distributed Architecture",
    "panels": [
      {
        "title": "Elysia Backend Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(elysia_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Python AI Server Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(python_ai_predictions_total[5m])",
            "legendFormat": "Predictions/sec"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(timescaledb_queries_total[5m])",
            "legendFormat": "Queries/sec"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Benefícios da Arquitetura Distribuída

### **1. Escalabilidade**
- **Horizontal Scaling**: Cada máquina pode ser escalada independentemente
- **Load Balancing**: Distribuição de carga entre máquinas
- **Resource Optimization**: Recursos otimizados para cada função

### **2. Segurança**
- **Isolation**: Isolamento de componentes críticos
- **Network Segmentation**: Segmentação de rede
- **Access Control**: Controle de acesso granular

### **3. Performance**
- **Dedicated Resources**: Recursos dedicados para cada função
- **Reduced Latency**: Latência reduzida entre componentes
- **Optimized Hardware**: Hardware otimizado para cada função

### **4. Manutenibilidade**
- **Independent Deployment**: Deploy independente de cada máquina
- **Easier Debugging**: Debug mais fácil
- **Modular Updates**: Atualizações modulares

---

**Conclusão**: A arquitetura distribuída com máquinas separadas oferece melhor escalabilidade, segurança e performance para o BotCriptoFy2, permitindo que cada componente seja otimizado para sua função específica.

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO