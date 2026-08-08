<!-- MEMORIA_VIVA:MANAGED_REFERENCE -->

# SKILL: security-expert

Ative para autenticação, autorização, validação, secrets, exposição de dados e superfícies de ataque.

## Modelo de ameaça proporcional

- Identifique ativo, fronteira de confiança, ator, entrada e impacto antes de alterar o fluxo.
- Confirme o mecanismo existente de sessão/token, papéis, tenants e expiração. Não invente `auth_sessions`, prazos ou perfis.
- Verifique autorização no servidor para o recurso e ação reais; não confunda autenticação com autorização.

## Controles

- Parametrize queries/comandos, encode saída no contexto correto e valide entrada nos limites do sistema.
- Aplique CSRF, CSP, cookies e headers conforme o tipo de cliente e arquitetura confirmados.
- Não grave secrets em Git, logs, URLs versionáveis ou relatórios. Prefira credenciais de menor privilégio e rotação possível.

## Verificação

Teste casos permitidos e negados, acesso cruzado quando aplicável, payloads malformados e ausência de vazamento. Não alegue segurança total; registre escopo e limitações da análise.
