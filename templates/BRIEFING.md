# BRIEFING — Modelo de Tarefa (5 elementos obrigatórios)

Toda tarefa deve ser entregue ao agente neste formato. Se faltar algum item, o agente DEVE perguntar antes de codar.

```
## Briefing
- **Objetivo:** <resultado final esperado em 1 frase>
- **Restrições/Ambiente:** <tecnologias, versões, o que NÃO pode ser alterado>
- **Formato:** <estrutura exata da entrega: arquivos, assinaturas, schema>
- **Exemplo:** <amostra do resultado esperado>
- **Critério de Pronto (DoD):** <instrução testável que define conclusão, ex: "testes X verdes + lint sem erro">
```

### Exemplo real
```
## Briefing — Endpoint de listagem de lojas
- Objetivo: GET /stores retorna lojas ativas paginadas em JSON.
- Restrições: PHP 8.2, Slim 4, usar StoreRepository existente, não alterar auth_sessions.
- Formato: app/Actions/Store/ListStoresAction.php com __invoke(Request,Response):Response; resposta {data,meta}.
- Exemplo: {"data":[{"id":1,"name":"X"}],"meta":{"page":1,"total":42}}
- DoD: php -l OK em todos os arquivos + PHPUnit StoreTest verde + rota não quebra login.
```
