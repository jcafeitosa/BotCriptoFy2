# Deployment & Infrastructure - BotCriptoFy2

## 🏗️ Visão Geral

Este documento descreve as estratégias de deployment e configuração de infraestrutura para o BotCriptoFy2 em diferentes ambientes (desenvolvimento, staging e produção).

## 📋 Estrutura de Deployment

### Ambientes
- **Development**: Ambiente local para desenvolvimento
- **Staging**: Ambiente de testes e validação
- **Production**: Ambiente de produção

### Arquitetura de Infraestrutura
- **Containerização**: Docker + Docker Compose
- **Orquestração**: Kubernetes (produção)
- **Banco de Dados**: TimescaleDB (PostgreSQL)
- **Cache**: Redis Cluster
- **CDN**: CloudFlare
- **Monitoramento**: Prometheus + Grafana
- **Logs**: ELK Stack

## 🐳 Containerização

### 1. Dockerfile Backend

```dockerfile
# backend/Dockerfile
FROM oven/bun:1.0.0-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl

# Configurar timezone
ENV TZ=America/Sao_Paulo

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bun -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json bun.lockb ./

# Instalar dependências
RUN bun install --frozen-lockfile --production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN bun run build

# Criar diretórios necessários
RUN mkdir -p logs storage uploads && \
    chown -R bun:nodejs logs storage uploads

# Mudar para usuário não-root
USER bun

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["bun", "run", "start"]
```

### 2. Dockerfile Frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache \
    ca-certificates \
    tzdata

# Configurar timezone
ENV TZ=America/Sao_Paulo

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Criar diretórios necessários
RUN mkdir -p .next && \
    chown -R nextjs:nodejs .next

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4321/health || exit 1

# Comando de inicialização
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

### 3. Docker Compose para Desenvolvimento

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # TimescaleDB
  timescaledb:
    image: timescale/timescaledb:16.0-pg16
    container_name: botcriptofy2-timescaledb-dev
    environment:
      POSTGRES_DB: botcriptofy2_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_dev_data:/var/lib/postgresql/data
      - ./docker/timescaledb/init-dev.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - botcriptofy2-dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7.2-alpine
    container_name: botcriptofy2-redis-dev
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - botcriptofy2-dev
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: base
    container_name: botcriptofy2-backend-dev
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@timescaledb:5432/botcriptofy2_dev
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_URL=http://localhost:3000
      - BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:4321
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - backend_logs:/app/logs
    depends_on:
      timescaledb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - botcriptofy2-dev
    restart: unless-stopped

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: base
    container_name: botcriptofy2-frontend-dev
    environment:
      - NODE_ENV=development
      - PUBLIC_API_URL=http://localhost:3000
      - PUBLIC_APP_URL=http://localhost:4321
    ports:
      - "4321:4321"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - botcriptofy2-dev
    restart: unless-stopped

  # Ollama
  ollama:
    image: ollama/ollama:latest
    container_name: botcriptofy2-ollama-dev
    environment:
      - OLLAMA_NUM_PARALLEL=2
      - OLLAMA_MAX_LOADED_MODELS=1
    ports:
      - "11434:11434"
    volumes:
      - ollama_dev_data:/root/.ollama
    networks:
      - botcriptofy2-dev
    restart: unless-stopped

  # Nginx (Proxy Reverso)
  nginx:
    image: nginx:alpine
    container_name: botcriptofy2-nginx-dev
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.dev.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - botcriptofy2-dev
    restart: unless-stopped

volumes:
  timescaledb_dev_data:
  redis_dev_data:
  ollama_dev_data:
  backend_logs:

networks:
  botcriptofy2-dev:
    driver: bridge
```

## ☸️ Kubernetes (Produção)

### 1. Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: botcriptofy2
  labels:
    name: botcriptofy2
    environment: production
```

### 2. ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: botcriptofy2-config
  namespace: botcriptofy2
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_URL: "https://api.botcriptofy2.com"
  FRONTEND_URL: "https://app.botcriptofy2.com"
  LOG_LEVEL: "info"
  CACHE_TTL: "3600"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "100"
```

### 3. Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: botcriptofy2-secrets
  namespace: botcriptofy2
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  REDIS_URL: <base64-encoded>
  BETTER_AUTH_SECRET: <base64-encoded>
  STRIPE_SECRET_KEY: <base64-encoded>
  TELEGRAM_BOT_TOKEN: <base64-encoded>
  OLLAMA_API_KEY: <base64-encoded>
```

### 4. Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: botcriptofy2-backend
  namespace: botcriptofy2
  labels:
    app: botcriptofy2-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: botcriptofy2-backend
  template:
    metadata:
      labels:
        app: botcriptofy2-backend
    spec:
      containers:
      - name: backend
        image: botcriptofy2/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: botcriptofy2-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: botcriptofy2-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: botcriptofy2-secrets
              key: REDIS_URL
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### 5. Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: botcriptofy2-frontend
  namespace: botcriptofy2
  labels:
    app: botcriptofy2-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: botcriptofy2-frontend
  template:
    metadata:
      labels:
        app: botcriptofy2-frontend
    spec:
      containers:
      - name: frontend
        image: botcriptofy2/frontend:latest
        ports:
        - containerPort: 4321
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: botcriptofy2-config
              key: NODE_ENV
        - name: PUBLIC_API_URL
          valueFrom:
            configMapKeyRef:
              name: botcriptofy2-config
              key: API_URL
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4321
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4321
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 6. Services

```yaml
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: botcriptofy2-backend-service
  namespace: botcriptofy2
spec:
  selector:
    app: botcriptofy2-backend
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
  type: ClusterIP

---
apiVersion: v1
kind: Service
metadata:
  name: botcriptofy2-frontend-service
  namespace: botcriptofy2
spec:
  selector:
    app: botcriptofy2-frontend
  ports:
  - port: 4321
    targetPort: 4321
    protocol: TCP
  type: ClusterIP
```

### 7. Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: botcriptofy2-ingress
  namespace: botcriptofy2
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.botcriptofy2.com
    - app.botcriptofy2.com
    secretName: botcriptofy2-tls
  rules:
  - host: api.botcriptofy2.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: botcriptofy2-backend-service
            port:
              number: 3000
  - host: app.botcriptofy2.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: botcriptofy2-frontend-service
            port:
              number: 4321
```

## 🗄️ Banco de Dados (Produção)

### 1. TimescaleDB Cloud

```yaml
# k8s/timescaledb-cloud.yaml
apiVersion: v1
kind: Secret
metadata:
  name: timescaledb-cloud-secret
  namespace: botcriptofy2
type: Opaque
stringData:
  connection-string: "postgresql://user:password@host:port/database?sslmode=require"
```

### 2. Redis Cluster

```yaml
# k8s/redis-cluster.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: botcriptofy2
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    maxmemory 1gb
    maxmemory-policy allkeys-lru

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: botcriptofy2
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
        - containerPort: 16379
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
      volumes:
      - name: redis-config
        configMap:
          name: redis-cluster-config
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## 📊 Monitoramento

### 1. Prometheus

```yaml
# k8s/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: botcriptofy2
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
    - job_name: 'botcriptofy2-backend'
      static_configs:
      - targets: ['botcriptofy2-backend-service:3000']
      metrics_path: '/metrics'
      scrape_interval: 5s
    
    - job_name: 'botcriptofy2-frontend'
      static_configs:
      - targets: ['botcriptofy2-frontend-service:4321']
      metrics_path: '/metrics'
      scrape_interval: 5s

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: botcriptofy2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
```

### 2. Grafana

```yaml
# k8s/grafana.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: botcriptofy2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secrets
              key: admin-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-storage
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Run tests
      run: bun test
    
    - name: Run linting
      run: bun run lint
    
    - name: Run type checking
      run: bun run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Build and push frontend image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/
        kubectl rollout restart deployment/botcriptofy2-backend
        kubectl rollout restart deployment/botcriptofy2-frontend
        kubectl rollout status deployment/botcriptofy2-backend
        kubectl rollout status deployment/botcriptofy2-frontend
```

### 2. Scripts de Deploy

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy do BotCriptoFy2..."

# Verificar se estamos na branch main
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Deploy apenas permitido na branch main"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Há mudanças não commitadas"
    exit 1
fi

# Fazer pull das últimas mudanças
echo "📥 Fazendo pull das últimas mudanças..."
git pull origin main

# Executar testes
echo "🧪 Executando testes..."
bun test

# Build das imagens
echo "🔨 Fazendo build das imagens..."
docker-compose -f docker-compose.prod.yml build

# Push das imagens
echo "📤 Fazendo push das imagens..."
docker-compose -f docker-compose.prod.yml push

# Deploy no Kubernetes
echo "☸️ Fazendo deploy no Kubernetes..."
kubectl apply -f k8s/

# Aguardar rollout
echo "⏳ Aguardando rollout..."
kubectl rollout status deployment/botcriptofy2-backend -n botcriptofy2
kubectl rollout status deployment/botcriptofy2-frontend -n botcriptofy2

# Verificar saúde dos serviços
echo "🏥 Verificando saúde dos serviços..."
kubectl get pods -n botcriptofy2
kubectl get services -n botcriptofy2
kubectl get ingress -n botcriptofy2

echo "✅ Deploy concluído com sucesso!"
```

## 🔒 Segurança

### 1. Network Policies

```yaml
# k8s/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: botcriptofy2-network-policy
  namespace: botcriptofy2
spec:
  podSelector:
    matchLabels:
      app: botcriptofy2-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: botcriptofy2
    - podSelector:
        matchLabels:
          app: botcriptofy2-frontend
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: botcriptofy2
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
```

### 2. Pod Security Policies

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: botcriptofy2-psp
  namespace: botcriptofy2
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 📋 Checklist de Deploy

### ✅ Pré-Deploy
- [ ] Testes passando
- [ ] Build das imagens
- [ ] Push das imagens
- [ ] Backup do banco de dados
- [ ] Notificação da equipe

### ✅ Deploy
- [ ] Aplicar configurações
- [ ] Deploy dos serviços
- [ ] Verificar rollout
- [ ] Testar endpoints
- [ ] Verificar logs

### ✅ Pós-Deploy
- [ ] Monitoramento ativo
- [ ] Verificar métricas
- [ ] Testar funcionalidades
- [ ] Documentar mudanças
- [ ] Notificar conclusão

## 🚨 Rollback

### Script de Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

echo "🔄 Iniciando rollback do BotCriptoFy2..."

# Obter versão anterior
PREVIOUS_VERSION=$(kubectl get deployment botcriptofy2-backend -n botcriptofy2 -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
CURRENT_VERSION=$((PREVIOUS_VERSION - 1))

echo "📦 Fazendo rollback para versão $CURRENT_VERSION..."

# Rollback do backend
kubectl rollout undo deployment/botcriptofy2-backend -n botcriptofy2 --to-revision=$CURRENT_VERSION

# Rollback do frontend
kubectl rollout undo deployment/botcriptofy2-frontend -n botcriptofy2 --to-revision=$CURRENT_VERSION

# Aguardar rollout
kubectl rollout status deployment/botcriptofy2-backend -n botcriptofy2
kubectl rollout status deployment/botcriptofy2-frontend -n botcriptofy2

echo "✅ Rollback concluído!"
```

## 📞 Suporte

Para problemas de deployment:
1. Verificar logs: `kubectl logs -f deployment/botcriptofy2-backend -n botcriptofy2`
2. Verificar status: `kubectl get pods -n botcriptofy2`
3. Verificar eventos: `kubectl get events -n botcriptofy2`
4. Contatar equipe de DevOps

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO