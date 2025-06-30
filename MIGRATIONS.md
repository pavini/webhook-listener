# Database Migrations

Este projeto utiliza um sistema de migrações de banco de dados para manter a consistência do esquema entre diferentes ambientes e evitar perda de dados durante deploys.

## Como Funciona

- As migrações são executadas automaticamente quando o servidor inicia
- O banco de dados rastreia quais migrações já foram executadas
- Apenas migrações pendentes são executadas
- Os dados existentes são preservados

## Scripts Disponíveis

```bash
# Executar todas as migrações pendentes
npm run migrate:up

# Verificar status das migrações
npm run migrate:status

# Ver comandos disponíveis
npm run migrate

# Resetar histórico de migrações (USE COM CUIDADO)
npm run migrate:reset
```

## Para Deployments

### Desenvolvimento
As migrações são executadas automaticamente quando você inicia o servidor com `npm start` ou `npm run dev`.

### Produção
1. **Backup do banco**: Sempre faça backup do arquivo `data/webhooks.db` antes do deploy
2. **Deploy do código**: Faça o deploy normalmente
3. **Migrações automáticas**: As migrações são executadas automaticamente no startup
4. **Verificação**: Use `npm run migrate:status` para confirmar que tudo está correto

## Estrutura dos Arquivos

- `migrations.js` - Sistema de migrações e definições
- `migrate.js` - CLI para gerenciar migrações
- `server.js` - Executa migrações no startup
- `.gitignore` - Exclui arquivos de banco do Git

## Arquivos Ignorados pelo Git

Os seguintes arquivos **NÃO** são versionados:
- `webhooks.db` (desenvolvimento)
- `data/webhooks.db` (produção)
- `*.db`
- `*.sqlite*`

Isso garante que os dados dos usuários em produção não sejam sobrescritos durante deploys.

## Criando Novas Migrações

1. Execute `npm run migrate create nome_da_migracao`
2. Adicione a nova migração ao array em `migrations.js`
3. Teste localmente
4. Commit e deploy

Exemplo de nova migração:
```javascript
{
    version: 4,
    name: 'add_new_feature_table',
    up: `
        CREATE TABLE IF NOT EXISTS new_feature (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_new_feature_created_at ON new_feature(created_at);
    `
}
```

## Troubleshooting

### Migração Falhou
1. Verifique os logs de erro
2. Faça backup do banco
3. Execute `npm run migrate:status` para ver o estado
4. Corrija o problema na migração
5. Execute `npm run migrate:up` novamente

### Reset de Migrações (Emergência)
```bash
# ATENÇÃO: Use apenas em casos extremos
npm run migrate:reset
npm run migrate:up
```

### Verificar Estado do Banco
```bash
npm run migrate:status
```

### Erro de Permissão (SQLITE_READONLY)
Se você encontrar o erro `SQLITE_READONLY`, verifique:

1. **Permissões do diretório**:
   ```bash
   # Docker/Produção
   chmod 755 /app/data
   chown -R webhookuser:nodejs /app/data
   
   # Desenvolvimento
   chmod 755 ./data
   ```

2. **Volume do Docker**:
   ```yaml
   # docker-compose.yml
   volumes:
     - ./data:/app/data
   ```

3. **Verificar se o diretório existe**:
   ```bash
   mkdir -p ./data  # desenvolvimento
   mkdir -p /app/data  # produção
   ```

## Boas Práticas

1. ✅ **Sempre teste migrações localmente primeiro**
2. ✅ **Faça backup antes de deploys em produção**
3. ✅ **Use apenas comandos SQL seguros (CREATE IF NOT EXISTS, ALTER TABLE ADD COLUMN)**
4. ✅ **Nunca drope tabelas ou colunas existentes**
5. ✅ **Mantenha migrações pequenas e focadas**
6. ❌ **Nunca edite migrações já executadas em produção**
7. ❌ **Nunca comite arquivos de banco (.db)**

## Exemplo de Deploy Seguro

```bash
# 1. Backup (em produção)
cp data/webhooks.db data/webhooks.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. Deploy do código
git pull origin main

# 3. Instalar dependências (se necessário)
npm install

# 4. Verificar migrações (opcional)
npm run migrate:status

# 5. Iniciar servidor (migrações executam automaticamente)
npm start
```

As migrações garantem que o banco evolua de forma segura sem perder dados dos usuários!