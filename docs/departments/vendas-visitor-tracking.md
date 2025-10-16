# Sistema de Monitoramento de Visitantes - Módulo de Vendas

## 🎯 Visão Geral

O Sistema de Monitoramento de Visitantes é uma funcionalidade avançada do módulo de Vendas que permite rastrear e analisar todos os acessos às páginas públicas da plataforma, coletando dados detalhados sobre visitantes, dispositivos, localização e comportamento.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Visitor Tracker**: Rastreamento em tempo real
- **Geolocation Service**: Serviço de geolocalização
- **Device Detection**: Detecção de dispositivos
- **Analytics Engine**: Motor de análise
- **Real-time Dashboard**: Dashboard em tempo real

### Integração com Better-Auth
- **Session Management**: Gestão de sessões
- **User Attribution**: Atribuição de visitantes a usuários
- **Privacy Compliance**: Conformidade com privacidade
- **Data Retention**: Retenção de dados

## 📊 Dados Coletados

### 1. Dados de Identificação
- **Session ID**: Identificador único da sessão
- **Visitor ID**: Identificador único do visitante (opcional)
- **IP Address**: Endereço IP (v4 e v6)
- **User Agent**: String completa do navegador

### 2. Dados de Geolocalização
- **País**: Código e nome do país
- **Região/Estado**: Região ou estado
- **Cidade**: Nome da cidade
- **Coordenadas**: Latitude e longitude
- **Timezone**: Fuso horário
- **ASN**: Autonomous System Number
- **ISP**: Provedor de internet
- **Organização**: Organização do IP

### 3. Dados do Dispositivo
- **Tipo de Dispositivo**: Desktop, mobile, tablet
- **Marca e Modelo**: Marca e modelo do dispositivo
- **Navegador**: Nome, versão e engine
- **Sistema Operacional**: OS, versão e arquitetura
- **Resolução de Tela**: Largura x altura
- **Orientação**: Portrait ou landscape
- **Profundidade de Cor**: Bits por pixel
- **Pixel Ratio**: Densidade de pixels

### 4. Dados de Rede
- **Tipo de Conexão**: WiFi, 4G, 5G, cabo
- **Velocidade Estimada**: Velocidade de conexão
- **Proxy/VPN**: Detecção de proxy ou VPN
- **Tor Network**: Detecção de rede Tor

### 5. Dados de Comportamento
- **Página Atual**: URL e título da página
- **Página de Referência**: URL de origem
- **Tempo na Página**: Tempo em segundos
- **Viewport**: Dimensões da janela
- **Idioma**: Idioma preferido
- **Bounce Rate**: Taxa de rejeição
- **Exit Page**: Página de saída

### 6. Dados de Marketing
- **Fonte de Tráfego**: Orgânico, social, ads, referral, direto
- **Meio de Tráfego**: Google, Facebook, Instagram, etc.
- **Campanha**: Nome da campanha
- **UTM Parameters**: UTM source, medium, campaign, term, content
- **Google Click ID**: GCLID
- **Facebook Click ID**: FBCLID

## 🔧 APIs do Sistema

### 1. Tracking APIs

#### POST /api/vendas/tracking/visitor
Registrar visita de um visitante

```typescript
interface TrackVisitorRequest {
  sessionId: string;
  visitorId?: string;
  pageUrl: string;
  pageTitle?: string;
  referrerUrl?: string;
  trafficSource: 'organic' | 'social' | 'ads' | 'referral' | 'direct';
  trafficMedium?: string;
  trafficCampaign?: string;
  userAgent: string;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  acceptLanguage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  metadata?: Record<string, any>;
}

interface TrackVisitorResponse {
  id: string;
  status: 'success' | 'error';
  message: string;
  visitorId?: string;
  sessionId: string;
}
```

#### GET /api/vendas/tracking/visitors
Listar visitantes com filtros

```typescript
interface ListVisitorsRequest {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  country?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  trafficSource?: string;
  browserName?: string;
  osName?: string;
  isProxy?: boolean;
  isVpn?: boolean;
  isTor?: boolean;
}

interface ListVisitorsResponse {
  visitors: VisitorTrackingResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### GET /api/vendas/tracking/visitors/{id}
Obter detalhes de um visitante

```typescript
interface GetVisitorResponse {
  visitor: VisitorTrackingResponse;
  session: VisitorSessionResponse;
  analytics: VisitorAnalytics;
  relatedVisits: VisitorTrackingResponse[];
}
```

### 2. Session APIs

#### GET /api/vendas/tracking/sessions
Listar sessões de visitantes

```typescript
interface ListSessionsRequest {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  country?: string;
  deviceType?: string;
  trafficSource?: string;
  isConverted?: boolean;
  minDuration?: number;
  maxDuration?: number;
}

interface ListSessionsResponse {
  sessions: VisitorSessionResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### GET /api/vendas/tracking/sessions/{sessionId}
Obter detalhes de uma sessão

```typescript
interface GetSessionResponse {
  session: VisitorSessionResponse;
  visits: VisitorTrackingResponse[];
  analytics: SessionAnalytics;
  journey: JourneyStep[];
}
```

### 3. Analytics APIs

#### GET /api/vendas/tracking/analytics/overview
Visão geral das métricas

```typescript
interface OverviewAnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  totalVisitors: number;
  uniqueVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  realTimeVisitors: number;
  trends: {
    visitors: TrendData[];
    sessions: TrendData[];
    pageViews: TrendData[];
  };
}
```

#### GET /api/vendas/tracking/analytics/traffic-sources
Análise de fontes de tráfego

```typescript
interface TrafficSourcesResponse {
  sources: TrafficSourceAnalytics[];
  mediums: TrafficMediumAnalytics[];
  campaigns: TrafficCampaignAnalytics[];
  summary: {
    organic: number;
    social: number;
    ads: number;
    referral: number;
    direct: number;
  };
}
```

#### GET /api/vendas/tracking/analytics/geographic
Análise geográfica

```typescript
interface GeographicAnalyticsResponse {
  countries: CountryAnalytics[];
  regions: RegionAnalytics[];
  cities: CityAnalytics[];
  timezones: TimezoneAnalytics[];
  summary: {
    topCountry: string;
    topRegion: string;
    topCity: string;
    totalCountries: number;
    totalRegions: number;
    totalCities: number;
  };
}
```

#### GET /api/vendas/tracking/analytics/devices
Análise de dispositivos

```typescript
interface DeviceAnalyticsResponse {
  deviceTypes: DeviceTypeAnalytics[];
  browsers: BrowserAnalytics[];
  operatingSystems: OperatingSystemAnalytics[];
  screenResolutions: ScreenResolutionAnalytics[];
  summary: {
    desktopPercentage: number;
    mobilePercentage: number;
    tabletPercentage: number;
    topBrowser: string;
    topOS: string;
  };
}
```

#### GET /api/vendas/tracking/analytics/pages
Análise de páginas

```typescript
interface PageAnalyticsResponse {
  topPages: PageAnalytics[];
  entryPages: EntryPageAnalytics[];
  exitPages: ExitPageAnalytics[];
  bouncePages: BouncePageAnalytics[];
  summary: {
    totalPages: number;
    averageTimeOnPage: number;
    averageBounceRate: number;
    topPage: string;
  };
}
```

### 4. Real-time APIs

#### GET /api/vendas/tracking/real-time
Dados em tempo real

```typescript
interface RealTimeResponse {
  activeVisitors: number;
  activeSessions: number;
  currentPageViews: number;
  topPages: RealTimePageAnalytics[];
  topCountries: RealTimeCountryAnalytics[];
  topDevices: RealTimeDeviceAnalytics[];
  recentVisits: RecentVisit[];
}
```

#### WebSocket /ws/vendas/tracking/real-time
Conexão WebSocket para dados em tempo real

```typescript
interface RealTimeEvent {
  type: 'visitor' | 'session' | 'page_view' | 'conversion';
  data: any;
  timestamp: string;
}
```

## 🤖 Agente de Monitoramento

### Capacidades Específicas

#### visitor_tracking
- Rastreamento em tempo real
- Coleta de dados detalhados
- Detecção de dispositivos
- Análise de comportamento

#### geographic_analysis
- Análise geográfica
- Segmentação por localização
- Análise de fusos horários
- Identificação de padrões regionais

#### device_analysis
- Análise de dispositivos
- Detecção de navegadores
- Análise de sistemas operacionais
- Otimização por dispositivo

#### traffic_analysis
- Análise de fontes de tráfego
- Segmentação de campanhas
- Análise de UTM parameters
- Otimização de canais

#### behavior_analysis
- Análise de comportamento
- Jornada do usuário
- Análise de páginas
- Identificação de padrões

### Comandos Específicos

```bash
/track_visitor - Rastrear visitante específico
/analyze_geographic - Analisar dados geográficos
/analyze_devices - Analisar dispositivos
/analyze_traffic_sources - Analisar fontes de tráfego
/analyze_behavior - Analisar comportamento
/generate_visitor_report - Gerar relatório de visitantes
/optimize_tracking - Otimizar rastreamento
/update_analytics - Atualizar análises
/monitor_real_time - Monitorar em tempo real
/export_visitor_data - Exportar dados de visitantes
```

## 📊 Dashboard de Monitoramento

### Métricas em Tempo Real
- **Visitantes Ativos**: Número atual de visitantes
- **Sessões Ativas**: Número atual de sessões
- **Páginas Visualizadas**: Páginas visualizadas agora
- **Países Ativos**: Países com visitantes ativos

### Métricas Históricas
- **Visitantes Únicos**: Por período
- **Sessões Totais**: Por período
- **Páginas Visualizadas**: Por período
- **Tempo Médio de Sessão**: Por período
- **Taxa de Rejeição**: Por período
- **Taxa de Conversão**: Por período

### Gráficos Interativos
- **Mapa de Calor Geográfico**: Visitantes por país/região
- **Gráfico de Dispositivos**: Distribuição por tipo
- **Gráfico de Navegadores**: Distribuição por navegador
- **Gráfico de Fontes**: Distribuição por fonte de tráfego
- **Gráfico Temporal**: Visitantes ao longo do tempo
- **Gráfico de Páginas**: Páginas mais visitadas

### Alertas Inteligentes
- **Picos de Tráfego**: Alertas de aumento súbito
- **Queda de Tráfego**: Alertas de queda significativa
- **Alta Taxa de Rejeição**: Alertas de páginas com alta rejeição
- **Tráfego Suspeito**: Alertas de tráfego anômalo
- **Conversões Baixas**: Alertas de baixa conversão

## 🔒 Privacidade e Conformidade

### LGPD/GDPR Compliance
- **Anonimização de IPs**: Opção de anonimizar IPs
- **Consentimento**: Gestão de consentimento
- **Retenção de Dados**: Políticas de retenção
- **Direito ao Esquecimento**: Exclusão de dados

### Configurações de Privacidade
```typescript
interface PrivacySettings {
  ipAnonymization: boolean;
  dataRetentionDays: number;
  cookieConsent: boolean;
  gdprCompliance: boolean;
  dataSharing: boolean;
  analyticsOptOut: boolean;
}
```

## 🚀 Implementação

### 1. Script de Rastreamento (Frontend)

```javascript
// visitor-tracking.js
class VisitorTracker {
  constructor(config) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.visitorId = this.getVisitorId();
  }

  trackPageView(pageData) {
    const trackingData = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      pageUrl: pageData.url,
      pageTitle: pageData.title,
      referrerUrl: document.referrer,
      trafficSource: this.detectTrafficSource(),
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      acceptLanguage: navigator.languages.join(','),
      ...this.getUTMParameters(),
      ...this.getAdditionalData()
    };

    this.sendTrackingData(trackingData);
  }

  detectTrafficSource() {
    const referrer = document.referrer;
    const utmSource = this.getUTMParameter('utm_source');
    
    if (utmSource) return 'ads';
    if (referrer.includes('google')) return 'organic';
    if (referrer.includes('facebook')) return 'social';
    if (referrer.includes('instagram')) return 'social';
    if (referrer.includes('twitter')) return 'social';
    if (referrer.includes('linkedin')) return 'social';
    if (referrer) return 'referral';
    return 'direct';
  }

  getUTMParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content'),
      gclid: params.get('gclid'),
      fbclid: params.get('fbclid')
    };
  }

  sendTrackingData(data) {
    fetch('/api/vendas/tracking/visitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  }
}

// Inicialização
const tracker = new VisitorTracker({
  apiEndpoint: '/api/vendas/tracking',
  enableGeolocation: true,
  enableDeviceDetection: true
});

// Rastrear visualização de página
tracker.trackPageView({
  url: window.location.href,
  title: document.title
});
```

### 2. Serviço de Geolocalização (Backend)

```typescript
// geo-location.service.ts
export class GeoLocationService {
  constructor(private geoipApiKey: string) {}

  async getLocationData(ipAddress: string): Promise<LocationData> {
    try {
      const response = await fetch(`https://api.geoip.com/v1/${ipAddress}`, {
        headers: {
          'Authorization': `Bearer ${this.geoipApiKey}`
        }
      });
      
      const data = await response.json();
      
      return {
        country: data.country_code,
        countryName: data.country_name,
        region: data.region_name,
        city: data.city_name,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.time_zone,
        asn: data.asn,
        asnName: data.asn_name,
        isp: data.isp,
        organization: data.organization
      };
    } catch (error) {
      console.error('Error getting location data:', error);
      return this.getDefaultLocationData();
    }
  }

  private getDefaultLocationData(): LocationData {
    return {
      country: 'UNKNOWN',
      countryName: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      asn: 'Unknown',
      asnName: 'Unknown',
      isp: 'Unknown',
      organization: 'Unknown'
    };
  }
}
```

### 3. Detecção de Dispositivos (Backend)

```typescript
// device-detection.service.ts
export class DeviceDetectionService {
  parseUserAgent(userAgent: string): DeviceData {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      browserName: result.browser.name,
      browserVersion: result.browser.version,
      browserEngine: result.engine.name,
      osName: result.os.name,
      osVersion: result.os.version,
      osArchitecture: result.cpu.architecture,
      deviceType: this.detectDeviceType(result),
      deviceBrand: result.device.vendor,
      deviceModel: result.device.model
    };
  }

  private detectDeviceType(result: any): string {
    if (result.device.type === 'mobile') return 'mobile';
    if (result.device.type === 'tablet') return 'tablet';
    return 'desktop';
  }
}
```

## 📈 Monitoramento e Alertas

### Métricas de Performance
- **Response Time**: < 100ms para tracking
- **Throughput**: 1000+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas Configuráveis
- **Alto Volume**: > 1000 visitantes/hora
- **Baixo Volume**: < 100 visitantes/hora
- **Alta Taxa de Rejeição**: > 80%
- **Tráfego Suspeito**: Padrões anômalos
- **Falhas de Tracking**: Erros de coleta

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO