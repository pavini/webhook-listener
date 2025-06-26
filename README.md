# Webhook Listener

Um projeto simples em Node.js para capturar e monitorar webhooks em tempo real, similar ao webhook.site.

## Características

- 📡 Captura webhooks em tempo real
- 🎨 Interface moderna com tema escuro
- 💾 Armazenamento interno com SQLite
- 🔄 Atualizações em tempo real com Socket.io
- 📊 Exibe todos os detalhes da requisição (headers, body, query params)
- 🧹 Limpar histórico de requisições
- 📋 Copiar URL do webhook

## Instalação

```bash
npm install
```

## Uso

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Como usar

1. Acesse `http://localhost:3000` no seu navegador
2. Copie a URL do webhook mostrada na interface
3. Configure suas aplicações para enviar webhooks para esta URL
4. Veja as requisições aparecerem em tempo real na interface

## Endpoints

- `GET /` - Interface web
- `GET /api/requests` - Lista todas as requisições
- `DELETE /api/requests` - Limpa todas as requisições
- `ALL /webhook/*` - Endpoint para receber webhooks

## Exemplo de uso

```bash
# Enviar um webhook de teste
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "timestamp": "2023-01-01T00:00:00Z"}'
```

## Banco de dados

O projeto usa SQLite para armazenar as requisições. O arquivo `webhooks.db` será criado automaticamente no diretório raiz.

## Estrutura dos dados

Cada requisição capturada contém:
- ID único
- Timestamp
- Método HTTP
- URL completa
- Headers
- Body
- Query parameters
- IP do cliente