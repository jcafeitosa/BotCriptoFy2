# Arquitetura de 2 Máquinas - BotCriptoFy2

## 🏗️ Visão Geral

O BotCriptoFy2 utiliza uma **arquitetura de 2 máquinas** com o **backend Elysia** e o **servidor AI/ML Python** em **máquinas separadas**, proporcionando melhor escalabilidade, segurança e performance.

## 📊 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA DE 2 MÁQUINAS - BOTCRIPTOFY2             │
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
           │           MÁQUINA 3 (OPCIONAL)          │
           │        DATABASE & MONITORING            │
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
           └─────────────────────────────────────────┘
```

## 🔧 Especificações das Máquinas

### **Máquina 1: Backend Elysia**
```yaml
# Especificações Mínimas
CPU: 16 cores (Intel Xeon ou AMD EPYC)
RAM: 64GB DDR4
Storage: 1TB SSD NVMe
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 32 cores (Intel Xeon ou AMD EPYC)
RAM: 128GB DDR4
Storage: 2TB SSD NVMe
Network: 25Gbps
OS: Ubuntu 22.04 LTS

# Software
- Bun v1.0.0
- Elysia v0.8.0
- Node.js v20.x
- Redis Client
- PostgreSQL Client
- Docker
- Nginx (Load Balancer)
- TimescaleDB (Local)
- Prometheus (Local)
- Grafana (Local)

# Responsabilidades
- Trading Engine
- Bot Management
- Strategy Engine
- Risk Management
- Portfolio Management
- Analytics & Reporting
- Módulos Administrativos
- Better-Auth
- APIs REST
- Database (TimescaleDB)
- Cache (Redis)
- Monitoring (Prometheus/Grafana)
```

### **Máquina 2: Servidor AI/ML Python**
```yaml
# Especificações Mínimas
CPU: 32 cores (Intel Xeon ou AMD EPYC)
RAM: 128GB DDR4
Storage: 2TB SSD NVMe
GPU: NVIDIA RTX 4090 (24GB VRAM)
Network: 10Gbps
OS: Ubuntu 22.04 LTS

# Especificações Recomendadas
CPU: 64 cores (Intel Xeon ou AMD EPYC)
RAM: 256GB DDR4
Storage: 4TB SSD NVMe
GPU: NVIDIA A100 (80GB VRAM) ou H100
Network: 25Gbps
OS: Ubuntu 22.04 LTS

# Software
- Python 3.11+
- CUDA 12.x
- cuDNN 8.x
- TensorFlow 2.x
- PyTorch 2.x
- Backtrader
- CCXT
- WebSocket Nativo
- FastAPI
- Redis Client
- PostgreSQL Client
- Docker
- Jupyter Notebook

# Responsabilidades
- Neural Networks (LSTM, GRU, Transformer)
- Reinforcement Learning (DQN, PPO)
- Evolutionary Strategies (GA, DE)
- Backtrader Integration
- CCXT/WebSocket Integration
- Model Training
- Predictions
- Signal Generation
- Strategy Optimization
- Market Data Processing
- Real-time Analysis
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

## 🚀 Implementação da Arquitetura

### **1. Backend Elysia (Máquina 1)**

```typescript
// backend/src/config/two-machine.config.ts
export const twoMachineConfig = {
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
      { host: '192.168.1.20', port: 7000 }
    ],
    options: {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    }
  },
  
  // Configuração do banco de dados (Local)
  database: {
    host: 'localhost',
    port: 5432,
    database: 'botcriptofy2',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: false
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
    this.baseUrl = `https://${twoMachineConfig.pythonServer.host}:${twoMachineConfig.pythonServer.port}`;
    this.httpClient = new HttpClient({
      baseURL: this.baseUrl,
      timeout: twoMachineConfig.pythonServer.timeout,
      retries: twoMachineConfig.pythonServer.retries,
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
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.ssl import SSLRedirectMiddleware
import uvicorn
import redis
import ssl
from pydantic import BaseModel

from config.settings import Settings
from services.model_service import ModelService
from services.prediction_service import PredictionService
from services.training_service import TrainingService
from services.optimization_service import OptimizationService
from integrations.redis_integration import RedisIntegration
from integrations.ccxt_integration import CCXTIntegration
from integrations.websocket_integration import WebSocketIntegration
from integrations.backtrader_integration import BacktraderIntegration

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ai-server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configurações
settings = Settings()

# Instâncias dos serviços
model_service = None
prediction_service = None
training_service = None
optimization_service = None
redis_integration = None
ccxt_integration = None
ccxws_integration = None
backtrader_integration = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciar ciclo de vida da aplicação"""
    global model_service, prediction_service, training_service, optimization_service
    global redis_integration, ccxt_integration, ccxws_integration, backtrader_integration
    
    # Inicializar serviços
    logger.info("Inicializando serviços...")
    
    redis_integration = RedisIntegration(settings.redis_config)
    await redis_integration.connect()
    
    ccxt_integration = CCXTIntegration(settings.exchanges_config)
    await ccxt_integration.initialize()
    
    websocket_integration = WebSocketIntegration(settings.websocket_config)
    await ccxws_integration.initialize()
    
    backtrader_integration = BacktraderIntegration()
    
    model_service = ModelService(redis_integration)
    prediction_service = PredictionService(model_service, redis_integration)
    training_service = TrainingService(model_service, redis_integration)
    optimization_service = OptimizationService(backtrader_integration, redis_integration)
    
    # Iniciar loops de processamento
    asyncio.create_task(market_data_loop())
    asyncio.create_task(ai_prediction_loop())
    asyncio.create_task(signal_generation_loop())
    asyncio.create_task(redis_communication_loop())
    
    logger.info("Serviços inicializados com sucesso")
    
    yield
    
    # Cleanup
    logger.info("Finalizando serviços...")
    await redis_integration.disconnect()
    await ccxws_integration.disconnect()
    logger.info("Serviços finalizados")

# Aplicação FastAPI
app = FastAPI(
    title="BotCriptoFy2 AI/ML Server",
    description="Servidor de IA e Machine Learning para trading",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(SSLRedirectMiddleware)

# Modelos Pydantic
class CreateModelRequest(BaseModel):
    name: str
    model_type: str  # neural_network, reinforcement_learning, evolutionary, ensemble
    algorithm: str   # lstm, gru, transformer, dqn, ppo, genetic_algorithm
    configuration: Dict
    hyperparameters: Dict

class TrainingRequest(BaseModel):
    model_id: str
    start_date: str
    end_date: str
    symbol: str
    timeframe: str
    training_data: Dict

class PredictionRequest(BaseModel):
    model_id: str
    symbol: str
    current_data: Dict

class SignalRequest(BaseModel):
    model_id: str
    symbol: str
    current_data: Dict

class OptimizationRequest(BaseModel):
    strategy_id: str
    parameters: List[Dict]
    ranges: List[Dict]
    objective: str
    start_date: str
    end_date: str

# Endpoints da API
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "services": {
            "redis": await redis_integration.is_connected(),
            "ccxt": ccxt_integration.is_initialized(),
            "ccxws": ccxws_integration.is_connected()
        }
    }

@app.post("/api/ai/models")
async def create_model(request: CreateModelRequest):
    """Criar novo modelo AI"""
    try:
        model = await model_service.create_model(request.dict())
        return {"success": True, "model_id": model.id, "message": "Modelo criado com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao criar modelo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/models/{model_id}/train")
async def train_model(model_id: str, request: TrainingRequest, background_tasks: BackgroundTasks):
    """Treinar modelo AI"""
    try:
        training_id = await training_service.start_training(model_id, request.dict())
        return {"success": True, "training_id": training_id, "message": "Treinamento iniciado"}
    except Exception as e:
        logger.error(f"Erro ao treinar modelo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/models/{model_id}/predict")
async def get_prediction(model_id: str, symbol: str):
    """Obter predição do modelo"""
    try:
        prediction = await prediction_service.get_prediction(model_id, symbol)
        return {"success": True, "prediction": prediction}
    except Exception as e:
        logger.error(f"Erro ao obter predição: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/models/{model_id}/signal")
async def generate_signal(model_id: str, request: SignalRequest):
    """Gerar sinal de trading"""
    try:
        signal = await prediction_service.generate_signal(model_id, request.dict())
        return {"success": True, "signal": signal}
    except Exception as e:
        logger.error(f"Erro ao gerar sinal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backtrader/strategies/{strategy_id}/optimize")
async def optimize_strategy(strategy_id: str, request: OptimizationRequest):
    """Otimizar estratégia"""
    try:
        result = await optimization_service.optimize_strategy(strategy_id, request.dict())
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Erro ao otimizar estratégia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/models")
async def list_models():
    """Listar modelos disponíveis"""
    try:
        models = await model_service.list_models()
        return {"success": True, "models": models}
    except Exception as e:
        logger.error(f"Erro ao listar modelos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/models/{model_id}/status")
async def get_model_status(model_id: str):
    """Obter status do modelo"""
    try:
        status = await model_service.get_model_status(model_id)
        return {"success": True, "status": status}
    except Exception as e:
        logger.error(f"Erro ao obter status do modelo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Loops de processamento
async def market_data_loop():
    """Loop principal de dados de mercado"""
    while True:
        try:
            # Obter dados de mercado via WebSocket
            market_data = await ccxws_integration.get_market_data()
            
            # Processar dados
            processed_data = await process_market_data(market_data)
            
            # Enviar para Redis
            await redis_integration.publish('python:market_data', processed_data)
            
            await asyncio.sleep(1)  # Atualizar a cada segundo
        except Exception as e:
            logger.error(f"Erro no loop de dados de mercado: {e}")
            await asyncio.sleep(5)

async def ai_prediction_loop():
    """Loop principal de predições AI"""
    while True:
        try:
            # Obter modelos ativos
            active_models = await model_service.get_active_models()
            
            for model in active_models:
                # Obter dados recentes
                recent_data = await get_recent_data(model.symbol)
                
                # Fazer predição
                prediction = await prediction_service.make_prediction(model.id, recent_data)
                
                # Salvar predição
                await prediction_service.save_prediction(model.id, prediction)
                
                # Enviar para Redis
                await redis_integration.publish('python:ai_prediction', {
                    'model_id': model.id,
                    'prediction': prediction
                })
            
            await asyncio.sleep(60)  # Predições a cada minuto
        except Exception as e:
            logger.error(f"Erro no loop de predições AI: {e}")
            await asyncio.sleep(10)

async def signal_generation_loop():
    """Loop principal de geração de sinais"""
    while True:
        try:
            # Obter predições recentes
            predictions = await prediction_service.get_recent_predictions()
            
            # Gerar sinais baseados nas predições
            signals = await prediction_service.generate_signals(predictions)
            
            # Enviar sinais para Redis
            for signal in signals:
                await redis_integration.publish('python:trading_signal', signal)
            
            await asyncio.sleep(30)  # Sinais a cada 30 segundos
        except Exception as e:
            logger.error(f"Erro no loop de geração de sinais: {e}")
            await asyncio.sleep(5)

async def redis_communication_loop():
    """Loop de comunicação com Redis"""
    while True:
        try:
            # Verificar comandos do Elysia
            commands = await redis_integration.get_commands()
            
            for command in commands:
                await process_command(command)
            
            await asyncio.sleep(0.1)  # Verificar a cada 100ms
        except Exception as e:
            logger.error(f"Erro no loop de comunicação Redis: {e}")
            await asyncio.sleep(1)

async def process_market_data(data: Dict) -> Dict:
    """Processar dados de mercado"""
    # Implementar processamento de dados
    return data

async def get_recent_data(symbol: str) -> Dict:
    """Obter dados recentes para predição"""
    # Implementar obtenção de dados recentes
    return {}

async def process_command(command: Dict):
    """Processar comando do Elysia"""
    # Implementar processamento de comandos
    pass

if __name__ == "__main__":
    # Configuração SSL
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(
        settings.ssl_cert_path,
        settings.ssl_key_path
    )
    
    # Executar servidor
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        ssl_context=ssl_context,
        log_level="info",
        access_log=True
    )
```

### **3. Docker Compose para Deploy**

```yaml
# docker-compose.two-machine.yml
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
      - REDIS_CLUSTER_NODES=192.168.1.10:7000,192.168.1.20:7000
      - DATABASE_HOST=localhost
      - DATABASE_PORT=5432
      - PYTHON_SERVER_HOST=192.168.1.20
      - PYTHON_SERVER_PORT=8000
    volumes:
      - ./backend:/app
      - /etc/ssl/certs:/etc/ssl/certs
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  # TimescaleDB (Máquina 1)
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

  # Redis Cluster (Máquina 1)
  redis-cluster-1:
    image: redis:7.2-alpine
    container_name: redis-cluster-1
    ports:
      - "6379:6379"
      - "7000:7000"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_data_1:/data
    networks:
      - botcriptofy2-network
    restart: unless-stopped

  # Prometheus (Máquina 1)
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

  # Grafana (Máquina 1)
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

  # Servidor AI/ML Python (Máquina 2)
  python-ai-server:
    build: ./python-ai-server
    container_name: python-ai-server
    ports:
      - "8000:8000"
      - "8001:8001"  # WebSocket
    environment:
      - PYTHON_ENV=production
      - REDIS_CLUSTER_NODES=192.168.1.10:7000,192.168.1.20:7000
      - ELYSIA_SERVER_HOST=192.168.1.10
      - ELYSIA_SERVER_PORT=3000
      - SSL_CERT_PATH=/etc/ssl/certs/python.crt
      - SSL_KEY_PATH=/etc/ssl/certs/python.key
      - BINANCE_API_KEY=${BINANCE_API_KEY}
      - BINANCE_SECRET=${BINANCE_SECRET}
      - COINBASE_API_KEY=${COINBASE_API_KEY}
      - COINBASE_SECRET=${COINBASE_SECRET}
    volumes:
      - ./python-ai-server:/app
      - ./logs:/app/logs
      - ./data:/app/data
      - ./models:/app/models
      - /etc/ssl/certs:/etc/ssl/certs
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
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis Cluster (Máquina 2)
  redis-cluster-2:
    image: redis:7.2-alpine
    container_name: redis-cluster-2
    ports:
      - "6380:6379"
      - "7001:7000"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_data_2:/data
    networks:
      - botcriptofy2-network
    restart: unless-stopped

volumes:
  timescaledb_data:
  redis_data_1:
  redis_data_2:
  prometheus_data:
  grafana_data:

networks:
  botcriptofy2-network:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.1.0/24
```

## 🔒 Segurança da Arquitetura

### **1. Firewall Rules**
```bash
# Máquina 1: Backend Elysia
ufw allow 3000/tcp  # Elysia API
ufw allow 3001/tcp  # WebSocket
ufw allow 5432/tcp  # TimescaleDB
ufw allow 6379/tcp  # Redis
ufw allow 9090/tcp  # Prometheus
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.20 to any port 3000  # Python Server
ufw allow from 192.168.1.20 to any port 6379  # Redis Cluster

# Máquina 2: Servidor AI/ML Python
ufw allow 8000/tcp  # Python API
ufw allow 8001/tcp  # WebSocket
ufw allow 6380/tcp  # Redis
ufw allow 22/tcp    # SSH
ufw allow from 192.168.1.10 to any port 8000  # Elysia Backend
ufw allow from 192.168.1.10 to any port 6380  # Redis Cluster
```

### **2. SSL/TLS Certificates**
```bash
# Gerar certificados SSL para cada máquina
# Máquina 1: Backend Elysia
openssl req -x509 -newkey rsa:4096 -keyout elysia.key -out elysia.crt -days 365 -nodes -subj "/CN=192.168.1.10"

# Máquina 2: Servidor AI/ML Python
openssl req -x509 -newkey rsa:4096 -keyout python.key -out python.crt -days 365 -nodes -subj "/CN=192.168.1.20"
```

## 📊 Monitoramento da Arquitetura

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
      - targets: ['192.168.1.10:5432']
    scrape_interval: 30s

  - job_name: 'redis-cluster'
    static_configs:
      - targets: ['192.168.1.10:6379', '192.168.1.20:6380']
    scrape_interval: 30s
```

## 🚀 Scripts de Deploy

### **1. Deploy Backend Elysia (Máquina 1)**
```bash
#!/bin/bash
# deploy-backend.sh

echo "🚀 Deploying Backend Elysia on Machine 1..."

# Configurar variáveis
SERVER_HOST="192.168.1.10"
SERVER_USER="elysiauser"
APP_DIR="/opt/botcriptofy2"

# Conectar ao servidor
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/botcriptofy2

# Parar containers existentes
docker-compose -f docker-compose.two-machine.yml down

# Atualizar código
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.two-machine.yml build --no-cache elysia-backend timescaledb redis-cluster-1 prometheus grafana

# Iniciar containers
docker-compose -f docker-compose.two-machine.yml up -d elysia-backend timescaledb redis-cluster-1 prometheus grafana

# Verificar status
docker-compose -f docker-compose.two-machine.yml ps
docker-compose -f docker-compose.two-machine.yml logs -f --tail=100
EOF

echo "✅ Backend Elysia deployed successfully!"
```

### **2. Deploy Servidor AI/ML Python (Máquina 2)**
```bash
#!/bin/bash
# deploy-python-ai.sh

echo "🤖 Deploying Python AI/ML Server on Machine 2..."

# Configurar variáveis
SERVER_HOST="192.168.1.20"
SERVER_USER="aiuser"
APP_DIR="/opt/botcriptofy2"

# Conectar ao servidor
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/botcriptofy2

# Parar containers existentes
docker-compose -f docker-compose.two-machine.yml down

# Atualizar código
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.two-machine.yml build --no-cache python-ai-server redis-cluster-2

# Iniciar containers
docker-compose -f docker-compose.two-machine.yml up -d python-ai-server redis-cluster-2

# Verificar status
docker-compose -f docker-compose.two-machine.yml ps
docker-compose -f docker-compose.two-machine.yml logs -f --tail=100
EOF

echo "✅ Python AI/ML Server deployed successfully!"
```

## 🎯 Benefícios da Arquitetura de 2 Máquinas

### **1. Simplicidade**
- **Menos Complexidade**: Apenas 2 máquinas para gerenciar
- **Fácil Manutenção**: Manutenção mais simples
- **Custo Reduzido**: Menor custo de infraestrutura

### **2. Performance**
- **Recursos Dedicados**: Cada máquina otimizada para sua função
- **GPU Dedicada**: GPU dedicada para AI/ML
- **Cache Local**: Cache local em cada máquina

### **3. Escalabilidade**
- **Escalabilidade Horizontal**: Cada máquina pode ser escalada independentemente
- **Load Balancing**: Distribuição de carga entre máquinas
- **Resource Optimization**: Recursos otimizados para cada função

### **4. Segurança**
- **Isolation**: Isolamento de componentes críticos
- **Network Segmentation**: Segmentação de rede
- **Access Control**: Controle de acesso granular

---

**Conclusão**: A arquitetura de 2 máquinas oferece um equilíbrio perfeito entre simplicidade, performance e escalabilidade para o BotCriptoFy2, permitindo que cada máquina seja otimizada para sua função específica.

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO