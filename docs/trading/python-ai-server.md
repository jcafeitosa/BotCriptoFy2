# Servidor Python AI/ML - BotCriptoFy2

## 🤖 Visão Geral

O **Servidor Python AI/ML** é uma máquina dedicada que executa todas as operações de **Inteligência Artificial**, **Machine Learning**, **Aprendizado por Reforço** e **Estratégias Evolutivas** para o BotCriptoFy2.

## 🏗️ Arquitetura do Servidor

### Componentes Principais
- **FastAPI Server**: API REST para comunicação com Elysia
- **Neural Networks Engine**: Redes neurais (LSTM, GRU, Transformer)
- **Reinforcement Learning Engine**: Aprendizado por reforço (DQN, PPO)
- **Evolutionary Strategies Engine**: Estratégias evolutivas (GA, DE)
- **Backtrader Integration**: Integração com Backtrader
- **CCXT/WebSocket Integration**: Integração com exchanges
- **Redis Communication**: Comunicação com Redis Cluster
- **Model Management**: Gerenciamento de modelos AI/ML

## 📊 Estrutura do Projeto

```
python-ai-server/
├── main.py                    # Servidor FastAPI principal
├── requirements.txt           # Dependências Python
├── Dockerfile                # Container Docker
├── docker-compose.yml        # Orquestração local
├── config/
│   ├── __init__.py
│   ├── settings.py           # Configurações
│   └── redis_config.py       # Configuração Redis
├── models/
│   ├── __init__.py
│   ├── neural_networks.py    # Redes neurais
│   ├── reinforcement.py      # Aprendizado por reforço
│   ├── evolutionary.py       # Estratégias evolutivas
│   └── ensemble.py           # Modelos ensemble
├── services/
│   ├── __init__.py
│   ├── model_service.py      # Serviço de modelos
│   ├── prediction_service.py # Serviço de predições
│   ├── training_service.py   # Serviço de treinamento
│   └── optimization_service.py # Serviço de otimização
├── integrations/
│   ├── __init__.py
│   ├── ccxt_integration.py   # Integração CCXT
│   ├── websocket_integration.py  # Integração WebSocket
│   ├── backtrader_integration.py # Integração Backtrader
│   └── redis_integration.py  # Integração Redis
├── utils/
│   ├── __init__.py
│   ├── data_processor.py     # Processamento de dados
│   ├── feature_engineering.py # Engenharia de features
│   ├── metrics.py            # Métricas de performance
│   └── logger.py             # Sistema de logs
├── data/
│   ├── raw/                  # Dados brutos
│   ├── processed/            # Dados processados
│   └── models/               # Modelos salvos
├── notebooks/
│   ├── model_development.ipynb
│   ├── strategy_optimization.ipynb
│   └── performance_analysis.ipynb
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_services.py
    └── test_integrations.py
```

## 🔧 Implementação

### 1. Servidor FastAPI Principal

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
from integrations.ccxws_integration import CCXWSIntegration
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
    
    ccxws_integration = CCXWSIntegration(settings.websocket_config)
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
            # Obter dados de mercado via CCXWS
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

### 2. Configurações

```python
# python-ai-server/config/settings.py
import os
from typing import List, Dict, Any
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Servidor
    host: str = "0.0.0.0"
    port: int = 8000
    ssl_cert_path: str = os.getenv("SSL_CERT_PATH", "/etc/ssl/certs/python.crt")
    ssl_key_path: str = os.getenv("SSL_KEY_PATH", "/etc/ssl/certs/python.key")
    
    # CORS
    allowed_origins: List[str] = [
        "https://192.168.1.10",  # Backend Elysia
        "https://192.168.1.30",  # Database Server
    ]
    
    # Redis
    redis_config: Dict[str, Any] = {
        "host": "192.168.1.30",
        "port": 6379,
        "db": 0,
        "ssl": True,
        "ssl_cert_reqs": "required"
    }
    
    # Exchanges
    exchanges_config: Dict[str, Any] = {
        "binance": {
            "apiKey": os.getenv("BINANCE_API_KEY"),
            "secret": os.getenv("BINANCE_SECRET"),
            "sandbox": True
        },
        "coinbase": {
            "apiKey": os.getenv("COINBASE_API_KEY"),
            "secret": os.getenv("COINBASE_SECRET"),
            "sandbox": True
        }
    }
    
    # WebSocket
    websocket_config: Dict[str, Any] = {
        "binance": {
            "url": "wss://stream.binance.com:9443/ws/btcusdt@ticker"
        },
        "coinbase": {
            "url": "wss://ws-feed.exchange.coinbase.com"
        }
    }
    
    # Modelos AI/ML
    model_config: Dict[str, Any] = {
        "default_sequence_length": 60,
        "default_features": 10,
        "default_hidden_units": 50,
        "default_learning_rate": 0.001,
        "default_epochs": 100,
        "default_batch_size": 32
    }
    
    # Backtrader
    backtrader_config: Dict[str, Any] = {
        "initial_cash": 10000,
        "commission": 0.001,
        "slippage": 0.001
    }
    
    # Logs
    log_level: str = "INFO"
    log_file: str = "logs/ai-server.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

### 3. Serviço de Modelos

```python
# python-ai-server/services/model_service.py
import asyncio
import logging
from typing import Dict, List, Optional
import json
import uuid
from datetime import datetime

from models.neural_networks import LSTMPricePredictor, GRUVolatilityPredictor, TransformerTrendPredictor
from models.reinforcement import DQNAgent, PPOAgent
from models.evolutionary import GeneticAlgorithm, DifferentialEvolution
from integrations.redis_integration import RedisIntegration

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self, redis_integration: RedisIntegration):
        self.redis = redis_integration
        self.models = {}
        self.model_types = {
            'lstm': LSTMPricePredictor,
            'gru': GRUVolatilityPredictor,
            'transformer': TransformerTrendPredictor,
            'dqn': DQNAgent,
            'ppo': PPOAgent,
            'genetic_algorithm': GeneticAlgorithm,
            'differential_evolution': DifferentialEvolution
        }
    
    async def create_model(self, model_data: Dict) -> Dict:
        """Criar novo modelo AI"""
        try:
            model_id = str(uuid.uuid4())
            model_type = model_data['model_type']
            algorithm = model_data['algorithm']
            
            # Criar instância do modelo
            if algorithm in self.model_types:
                model_class = self.model_types[algorithm]
                model_instance = model_class(**model_data['configuration'])
                
                # Salvar modelo
                model_info = {
                    'id': model_id,
                    'name': model_data['name'],
                    'model_type': model_type,
                    'algorithm': algorithm,
                    'configuration': model_data['configuration'],
                    'hyperparameters': model_data['hyperparameters'],
                    'status': 'created',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # Salvar no Redis
                await self.redis.set(f"model:{model_id}", json.dumps(model_info))
                
                # Armazenar instância em memória
                self.models[model_id] = {
                    'instance': model_instance,
                    'info': model_info
                }
                
                logger.info(f"Modelo {model_id} criado com sucesso")
                return model_info
            else:
                raise ValueError(f"Algoritmo {algorithm} não suportado")
                
        except Exception as e:
            logger.error(f"Erro ao criar modelo: {e}")
            raise
    
    async def get_model(self, model_id: str) -> Optional[Dict]:
        """Obter modelo por ID"""
        try:
            model_data = await self.redis.get(f"model:{model_id}")
            if model_data:
                return json.loads(model_data)
            return None
        except Exception as e:
            logger.error(f"Erro ao obter modelo {model_id}: {e}")
            return None
    
    async def list_models(self) -> List[Dict]:
        """Listar todos os modelos"""
        try:
            model_keys = await self.redis.keys("model:*")
            models = []
            
            for key in model_keys:
                model_data = await self.redis.get(key)
                if model_data:
                    models.append(json.loads(model_data))
            
            return models
        except Exception as e:
            logger.error(f"Erro ao listar modelos: {e}")
            return []
    
    async def get_active_models(self) -> List[Dict]:
        """Obter modelos ativos"""
        try:
            models = await self.list_models()
            return [model for model in models if model['status'] == 'active']
        except Exception as e:
            logger.error(f"Erro ao obter modelos ativos: {e}")
            return []
    
    async def update_model_status(self, model_id: str, status: str) -> bool:
        """Atualizar status do modelo"""
        try:
            model_data = await self.get_model(model_id)
            if model_data:
                model_data['status'] = status
                model_data['updated_at'] = datetime.now().isoformat()
                
                await self.redis.set(f"model:{model_id}", json.dumps(model_data))
                
                # Atualizar instância em memória
                if model_id in self.models:
                    self.models[model_id]['info'] = model_data
                
                logger.info(f"Status do modelo {model_id} atualizado para {status}")
                return True
            return False
        except Exception as e:
            logger.error(f"Erro ao atualizar status do modelo {model_id}: {e}")
            return False
    
    async def delete_model(self, model_id: str) -> bool:
        """Deletar modelo"""
        try:
            # Remover do Redis
            await self.redis.delete(f"model:{model_id}")
            
            # Remover da memória
            if model_id in self.models:
                del self.models[model_id]
            
            logger.info(f"Modelo {model_id} deletado com sucesso")
            return True
        except Exception as e:
            logger.error(f"Erro ao deletar modelo {model_id}: {e}")
            return False
    
    async def get_model_status(self, model_id: str) -> Dict:
        """Obter status detalhado do modelo"""
        try:
            model_data = await self.get_model(model_id)
            if model_data:
                return {
                    'id': model_data['id'],
                    'name': model_data['name'],
                    'status': model_data['status'],
                    'created_at': model_data['created_at'],
                    'updated_at': model_data['updated_at'],
                    'is_loaded': model_id in self.models
                }
            return None
        except Exception as e:
            logger.error(f"Erro ao obter status do modelo {model_id}: {e}")
            return None
```

### 4. Dockerfile

```dockerfile
# python-ai-server/Dockerfile
FROM nvidia/cuda:12.1-devel-ubuntu22.04

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-pip \
    python3.11-dev \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd -m -s /bin/bash aiuser

# Definir diretório de trabalho
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip3.11 install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs data/models data/raw data/processed notebooks

# Definir permissões
RUN chown -R aiuser:aiuser /app

# Mudar para usuário não-root
USER aiuser

# Expor porta
EXPOSE 8000

# Comando de inicialização
CMD ["python3.11", "main.py"]
```

### 5. Requirements

```txt
# python-ai-server/requirements.txt
# FastAPI e servidor
fastapi==0.104.1
uvicorn[ssl]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6

# Machine Learning
tensorflow==2.15.0
torch==2.1.0
torchvision==0.16.0
torchaudio==0.16.0
scikit-learn==1.3.2
numpy==1.24.3
pandas==2.1.4

# Trading
backtrader==1.9.78.123
ccxt==4.1.77
websockets==12.0

# Redis
redis==5.0.1
redis-py-cluster==2.1.3

# Banco de dados
psycopg2-binary==2.9.9
sqlalchemy==2.0.23

# Processamento de dados
ta==0.10.2
yfinance==0.2.28
requests==2.31.0
aiohttp==3.9.1

# Jupyter
jupyter==1.0.0
ipykernel==6.27.1

# Logging e monitoramento
structlog==23.2.0
prometheus-client==0.19.0

# Utilitários
python-dotenv==1.0.0
pydantic-settings==2.1.0
```

### 6. Docker Compose

```yaml
# python-ai-server/docker-compose.yml
version: '3.8'

services:
  python-ai-server:
    build: .
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
      - SSL_CERT_PATH=/etc/ssl/certs/python.crt
      - SSL_KEY_PATH=/etc/ssl/certs/python.key
      - BINANCE_API_KEY=${BINANCE_API_KEY}
      - BINANCE_SECRET=${BINANCE_SECRET}
      - COINBASE_API_KEY=${COINBASE_API_KEY}
      - COINBASE_SECRET=${COINBASE_SECRET}
    volumes:
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

networks:
  botcriptofy2-network:
    external: true
```

## 🚀 Deploy e Configuração

### 1. Script de Deploy

```bash
#!/bin/bash
# deploy-python-ai-server.sh

echo "🤖 Deploying Python AI/ML Server..."

# Configurar variáveis
SERVER_HOST="192.168.1.20"
SERVER_USER="aiuser"
APP_DIR="/opt/botcriptofy2/python-ai-server"

# Conectar ao servidor
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/botcriptofy2/python-ai-server

# Parar container existente
docker-compose down

# Atualizar código
git pull origin main

# Rebuild container
docker-compose build --no-cache

# Iniciar container
docker-compose up -d

# Verificar status
docker-compose ps
docker-compose logs -f --tail=100
EOF

echo "✅ Python AI/ML Server deployed successfully!"
```

### 2. Script de Monitoramento

```bash
#!/bin/bash
# monitor-python-ai-server.sh

echo "📊 Monitoring Python AI/ML Server..."

# Verificar status do container
docker-compose ps

# Verificar logs
docker-compose logs --tail=50

# Verificar uso de GPU
nvidia-smi

# Verificar uso de CPU e memória
docker stats python-ai-server

# Verificar conectividade
curl -k https://192.168.1.20:8000/health
```

## 📊 Métricas e Monitoramento

### 1. Health Check

```python
# python-ai-server/health_check.py
import asyncio
import aiohttp
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class HealthChecker:
    def __init__(self, redis_integration, ccxt_integration, ccxws_integration):
        self.redis = redis_integration
        self.ccxt = ccxt_integration
        self.ccxws = ccxws_integration
    
    async def check_health(self) -> Dict[str, Any]:
        """Verificar saúde do servidor"""
        health_status = {
            "status": "healthy",
            "timestamp": asyncio.get_event_loop().time(),
            "services": {}
        }
        
        # Verificar Redis
        try:
            redis_healthy = await self.redis.is_connected()
            health_status["services"]["redis"] = {
                "status": "healthy" if redis_healthy else "unhealthy",
                "response_time": await self.redis.ping()
            }
        except Exception as e:
            health_status["services"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Verificar CCXT
        try:
            ccxt_healthy = self.ccxt.is_initialized()
            health_status["services"]["ccxt"] = {
                "status": "healthy" if ccxt_healthy else "unhealthy",
                "exchanges": list(self.ccxt.exchanges.keys())
            }
        except Exception as e:
            health_status["services"]["ccxt"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Verificar CCXWS
        try:
            ccxws_healthy = self.ccxws.is_connected()
            health_status["services"]["ccxws"] = {
                "status": "healthy" if ccxws_healthy else "unhealthy",
                "connections": len(self.ccxws.connections)
            }
        except Exception as e:
            health_status["services"]["ccxws"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Determinar status geral
        all_healthy = all(
            service["status"] == "healthy" 
            for service in health_status["services"].values()
        )
        
        if not all_healthy:
            health_status["status"] = "unhealthy"
        
        return health_status
```

### 2. Métricas Prometheus

```python
# python-ai-server/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Métricas de requisições
REQUEST_COUNT = Counter(
    'python_ai_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'python_ai_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

# Métricas de modelos
MODEL_PREDICTIONS = Counter(
    'python_ai_model_predictions_total',
    'Total number of model predictions',
    ['model_id', 'model_type', 'algorithm']
)

MODEL_TRAINING_DURATION = Histogram(
    'python_ai_model_training_duration_seconds',
    'Model training duration in seconds',
    ['model_id', 'model_type', 'algorithm']
)

# Métricas de performance
ACTIVE_MODELS = Gauge(
    'python_ai_active_models',
    'Number of active models'
)

PREDICTION_ACCURACY = Gauge(
    'python_ai_prediction_accuracy',
    'Prediction accuracy',
    ['model_id', 'symbol']
)

# Métricas de sistema
GPU_MEMORY_USAGE = Gauge(
    'python_ai_gpu_memory_usage_bytes',
    'GPU memory usage in bytes'
)

CPU_USAGE = Gauge(
    'python_ai_cpu_usage_percent',
    'CPU usage percentage'
)

def start_metrics_server(port: int = 9090):
    """Iniciar servidor de métricas"""
    start_http_server(port)
    logger.info(f"Metrics server started on port {port}")
```

---

**Conclusão**: O Servidor Python AI/ML é uma máquina dedicada que executa todas as operações de IA e ML do BotCriptoFy2, proporcionando alta performance e escalabilidade para o sistema de trading inteligente.

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO