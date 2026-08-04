---
name: route-sanitizer
description: "Memória Viva — Skill para varredura sistemática de endpoints quebrados, diagnóstico de erros 404 (rota não encontrada) e 500 (exceção não tratada). Ativa quando o agente precisa auditar rotas, Actions inexistentes ou middlewares mal configurados."
---

# 🛣️ Skill: Route Sanitizer — Varredura de Endpoints e Diagnóstico 404/500

## 🎯 Objetivo
Auditar todas as rotas registradas no sistema, verificar se os Controllers/Actions existem,
se os middlewares estão corretos e diagnosticar fontes de erros 404/500.

---

## 📋 Protocolo de Execução

### Passo 1 — Ler Contexto
- `docs/ai/CONTEXTO_ATUAL.md` → mapeamento de rotas por módulo
- `docs/ai/MODULOS_E_REGRAS.md` → regras de negócio por módulo

### Passo 2 — Listar Todas as Rotas
```bash
# Slim 4
php bin/routes.php

# Laravel
php artisan route:list --columns=method,uri,name,action,middleware
```

### Passo 3 — Verificar Actions/Controllers
Para cada rota, confirmar que o arquivo PHP da Action existe:
```bash
# Padrão do projeto
find app/Application/Actions -name "*.php" | sort
# ou no Windows:
Get-ChildItem app\Application\Actions -Recurse -Filter "*.php" | Select-Object Name
```

### Passo 4 — Verificar Middlewares por Módulo

| Módulo | Prefixo | Middleware Obrigatório |
|--------|---------|----------------------|
| Admin | `/admin` | `AdminAuthMiddleware` |
| Lojista | `/store` | `StoreAuthMiddleware` |
| Entregador | `/driver` | `DriverAuthMiddleware` |
| Cliente | `/client` | `ClientAuthMiddleware` |
| API v1 | `/api/v1` | `ApiKeyMiddleware` ou `JwtMiddleware` |

### Passo 5 — Analisar Logs de Erros
```bash
# Linux/Mac
tail -100 storage/logs/app.log | grep -E "ERROR|CRITICAL|404|500"

# Windows PowerShell
Get-Content storage\logs\app.log -Tail 100 | Select-String "ERROR|CRITICAL|404|500"
```

### Passo 6 — Testar Endpoints Críticos
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/health/ready
curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/login
curl -s -o /dev/null -w "%{http_code}" http://localhost/store/login
```

### Passo 7 — Registrar no Handoff
No `docs/ai/HANDOFF_ATUAL.md`, registrar:
- Total de rotas auditadas
- Erros encontrados (rota, tipo HTTP, causa raiz)
- Correções aplicadas ou pendências

---

## 🔍 Diagnóstico Rápido

| Erro | Causa Provável | Correção |
|------|---------------|----------|
| `404` em rota existente | Namespace errado no DI Container | Verificar `config/container.php` |
| `500` em Action | `strict_types` + tipo incorreto | Verificar assinatura do `__invoke()` |
| `403` inesperado | Middleware bloqueando | Verificar sessão em `auth_sessions` |
| Action não injetada | Falta de binding no DI | Registrar em `config/container.php` |
| Route group sem auth | Grupo sem `->addMiddleware()` | Adicionar middleware ao grupo |

---

## 🔑 Referências
- Rotas: `routes/web/` e `routes/api/v1/`
- Container DI: `config/container.php`
- Middlewares: `app/Infrastructure/Middleware/`
- Logs: `storage/logs/app.log`
