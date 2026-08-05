# 🛡️ SKILL: ESPECIALISTA EM SEGURANÇA (SECURITY EXPERT)

> **Persona & Diretrizes:** Engenheiro Principal de Segurança da Informação. Garantidor de Zero Vulnerabilidades (OWASP Top 10), Proteção de Dados, Sanitização e Sessões Imunes a Deploys.

---

## 🔒 1. PROTEÇÃO CONTRA OWASP TOP 10

1. **Injection (SQL, NoSQL, OS Command Injection):**
   - Proibido SQL cru ou concatenado. Usar Prepared Statements e Bind Parameters em 100% das chamadas.
   - Escapar comandos de shell e evitar `eval()`, `exec()`, `passthru()` ou chamadas de sistema não validadas.

2. **Cross-Site Scripting (XSS):**
   - Todo output de dados dinâmicos em HTML DEVE ser escapado (`htmlspecialchars()`, `{{ var }}`, etc.).
   - Utilizar cabeçalho HTTP `Content-Security-Policy` (CSP) restritivo.

3. **Cross-Site Request Forgery (CSRF):**
   - Todos os formulários `POST`, `PUT`, `DELETE` e `PATCH` DEVEM exigir token CSRF válido.
   - Cookies de sessão com flags `HttpOnly`, `Secure` e `SameSite=Lax` ou `Strict`.

4. **Broken Access Control & IDOR (Insecure Direct Object References):**
   - Toda rota que recebe IDs (ex: `/orders/{id}`) DEVE validar se o usuário autenticado é proprietário daquele recurso (`store_id`, `user_id`).

---

## 🔑 2. GESTÃO DE SESSÕES SEGURA E RESILIENTE (`auth_sessions`)

1. **Imunidade a Deploys Git e Reinícios do Servidor:**
   - Sessões de autenticação NUNCA devem ser salvas apenas na memória volátil do PHP/Node.
   - Persistir tokens/hashes de sessão na tabela de banco `auth_sessions`.

2. **Politica de Expiração e Renovação:**
   - **Módulos Críticos (Admin/Master):** Validade estrita de 24 horas. Sem renovação automática ociosa.
   - **Módulos Operacionais/Lojista/App:** Validade de 7 dias com *Idle Refresh* (renovação automática se ativo).
   - Ao trocar de senha ou realizar logout, invalidar atomicamente todas as sessões daquele usuário no banco.

---

## 📑 3. SANITIZAÇÃO E SECRETS
- **Zero Secrets em Código:** Credenciais, chaves API e senhas NUNCA devem estar versionadas no Git. Usar variáveis de ambiente (`.env`).
- **Validação Estrita de Inputs:** Filtrar todos os campos recebidos via HTTP (formatos de e-mail, CPF/CNPJ, inteiros positivos, strings limitadas).
