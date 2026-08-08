# SKILL: security-expert

Segurança — OWASP, sanitização, sessões resilientes. Ative para auth, validação, exposição de dados e secrets.

## OWASP Top 10
- Injection: prepared statements + bind params em 100% das queries; escapar shell, proibir `eval()`/`exec()` não validados.
- XSS: escapar todo output dinâmico em HTML; CSP restritivo.
- CSRF: token CSRF em POST/PUT/DELETE/PATCH; cookie sessão `HttpOnly`+`Secure`+`SameSite`.
- Broken Access Control/IDOR: rota com `{id}` valida se o usuário é dono do recurso (`store_id`/`user_id`).

## Sessões (`auth_sessions`)
- Persistir token/hash em `auth_sessions`; nunca só em memória volátil.
- Admin/Master: 24h, sem idle refresh. Operacional/Lojista/App: 7d com idle refresh. Troca de senha/logout invalida atomicamente.

## Secrets & input
- Zero secrets no Git; usar `.env`.
- Validar estritamente inputs (e‑mail, CPF/CNPJ, int positivo, strings limitadas).

## Verificação
Teste cenários de acesso cruzado (IDOR) e envio de payload malformado antes de concluir.
