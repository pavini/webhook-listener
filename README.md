# Webhook Listener

Sistema avançado de captura e monitoramento de webhooks em tempo real, desenvolvido em Node.js com arquitetura moderna e interface responsiva.

## Arquitetura Técnica

### Stack Tecnológico
- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Database**: SQLite com schema otimizado
- **Real-time**: Socket.io para comunicação bidirecional
- **Styling**: CSS moderno com tema escuro nativo

### Características Avançadas

- 📡 **Captura Universal**: Suporte a todos os métodos HTTP (GET, POST, PUT, DELETE, PATCH, etc.)
- 🎨 **Interface Moderna**: Design responsivo com tema escuro e UX otimizada
- 💾 **Persistência Local**: SQLite com índices otimizados para performance
- 🔄 **Real-time Updates**: Socket.io para atualizações instantâneas sem polling
- 📊 **Análise Completa**: Captura headers, body, query params, e metadados da requisição
- 🧹 **Gerenciamento de Estado**: Limpeza eficiente do histórico com transações atômicas
- 📋 **API RESTful**: Endpoints padronizados para integração externa
- 🔒 **Segurança**: Sanitização de dados e validação de entrada

## Requisitos do Sistema

```bash
Node.js >= 14.0.0
npm >= 6.0.0
```

## Instalação e Configuração

```bash
# Clone o repositório
git clone <repository-url>
cd webhook-listener

# Instalar dependências
npm install

# Configurar variáveis de ambiente (opcional)
cp .env.example .env
```

## Execução

```bash
# Desenvolvimento com hot reload
npm run dev

# Produção
npm start

# Debug mode
DEBUG=webhook-listener:* npm run dev
```

**Servidor disponível em**: `http://localhost:3000`

## Arquitetura da API

### Endpoints Principais

| Método | Endpoint | Descrição | Parâmetros |
|--------|----------|-----------|------------|
| `GET` | `/` | Interface web principal | - |
| `GET` | `/api/requests` | Lista requisições capturadas | `?limit=N&offset=N` |
| `DELETE` | `/api/requests` | Remove todas as requisições | - |
| `DELETE` | `/api/requests/:id` | Remove requisição específica | `id` (path param) |
| `ALL` | `/webhook/*` | Endpoint universal de captura | Aceita qualquer path |

### Estrutura de Response

```json
{
  "id": "uuid-v4",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "method": "POST",
  "url": "/webhook/payment/success",
  "headers": {
    "content-type": "application/json",
    "user-agent": "PaymentGateway/1.0"
  },
  "body": "{\"transaction_id\": \"tx_123\"}",
  "query": "?status=success",
  "ip": "192.168.1.100",
  "userAgent": "PaymentGateway/1.0"
}
```

## Casos de Uso Técnicos

### Desenvolvimento de Integrações
```bash
# Webhook de pagamento
curl -X POST http://localhost:3000/webhook/payment/callback \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=abc123" \
  -d '{
    "event": "payment.completed",
    "transaction_id": "tx_12345",
    "amount": 99.99,
    "currency": "USD"
  }'
```

### Testing de APIs
```bash
# Webhook com query parameters
curl -X POST "http://localhost:3000/webhook/api/v1/notify?client_id=123&version=2.0" \
  -H "Authorization: Bearer token123" \
  -d '{"status": "processed"}'
```

### Debugging de Integrações
```bash
# Captura de headers customizados
curl -X PATCH http://localhost:3000/webhook/update \
  -H "X-Custom-Header: debug-mode" \
  -H "X-Request-ID: req_789" \
  -d '{"action": "update_status"}'
```

## Configuração de Banco de Dados

### Schema SQLite
```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  headers TEXT,
  body TEXT,
  query TEXT,
  ip TEXT,
  userAgent TEXT
);

CREATE INDEX idx_timestamp ON requests(timestamp);
CREATE INDEX idx_method ON requests(method);
```

### Performance
- **Índices otimizados** para consultas por timestamp e método
- **Transações atômicas** para operações de limpeza
- **Connection pooling** para múltiplas requisições simultâneas

## Monitoramento e Logs

```bash
# Logs estruturados em desenvolvimento
DEBUG=webhook-listener:* npm run dev

# Logs de produção
NODE_ENV=production npm start 2>&1 | tee webhook-listener.log
```

## Estrutura do Projeto

```
webhook-listener/
├── server.js              # Servidor principal
├── public/                # Assets estáticos
├── screenshots/           # Documentação visual
├── webhooks.db           # Banco SQLite (auto-gerado)
└── package.json          # Dependencies e scripts
```

## Integração e Deploy

### Docker (Opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Variáveis de Ambiente
```bash
PORT=3000                 # Porta do servidor
DB_PATH=./webhooks.db     # Caminho do banco SQLite
NODE_ENV=production       # Ambiente de execução
```