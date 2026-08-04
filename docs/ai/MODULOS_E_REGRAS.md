# 📖 MÓDULOS E REGRAS DE NEGÓCIO

> **Memória Viva — Referência de negócio para agentes de IA.**
> Este documento mapeia cada módulo do sistema com seus arquivos, tabelas e regras.
>
> ⚠️ **Agente: Preencha com as regras reais extraídas do código em `app/`, `routes/` e `config/`.**

---

## 🗂️ Módulos do Sistema

### Módulo 1 — *(ex: Admin / Painel Administrativo)*

**Descrição:** *(descrever o módulo)*

**Acesso:** `GET /admin/login` → `POST /admin/login`

**Regras de Negócio:**
- *(listar as regras de negócio)*

**Arquivos Principais:**
| Tipo | Caminho |
|------|---------|
| Actions/Controllers | `app/Application/Actions/Admin/` |
| Repositórios | `app/Infrastructure/Persistence/` |
| Rotas | `routes/web/admin.php` |
| Views | `resources/views/admin/` |

**Tabelas do Banco:**
- *(listar as tabelas que este módulo utiliza)*

---

### Módulo 2 — *(ex: Lojista / Store / Merchant)*

**Descrição:** *(descrever o módulo)*

**Regras de Negócio:**
- *(listar as regras de negócio)*

**Arquivos Principais:**
| Tipo | Caminho |
|------|---------|
| Actions/Controllers | |
| Repositórios | |
| Rotas | |

---

### Módulo 3 — *(ex: Cliente / Client / Marketplace)*

**Descrição:** *(descrever o módulo)*

**Regras de Negócio:**
- *(listar as regras de negócio)*

---

### Módulo 4 — *(ex: API v1 / Integrações)*

**Descrição:** *(descrever o módulo)*

**Regras de Negócio:**
- *(listar as regras de negócio)*

---

## 🔑 Regras Transversais (Valem para Todos os Módulos)

1. **Autenticação:** Sessões persistidas na tabela `auth_sessions` com validade por módulo.
2. **Multi-tenancy:** Toda operação de lojista/cliente deve filtrar por `store_id` ou `client_id`.
3. **Soft Delete:** Registros não são apagados fisicamente; usam `deleted_at` quando aplicável.
4. **Auditoria:** Operações críticas geram log via Monolog.
5. **Nomenclatura DB:** Tabelas em `snake_case`, inglês, plural (`stores`, `orders`, `users`).

---

## 📅 Histórico de Atualizações

| Data | Agente | O que foi atualizado |
|------|--------|---------------------|
| *(data)* | Instalador | Criação do template inicial |
