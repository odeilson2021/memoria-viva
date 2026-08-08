# Diretrizes condicionais — PHP

> Confirme a versão em `composer.json`/runtime, o framework e as ferramentas antes de aplicar uma regra.

## Preservação

- Respeite PSR/configurações e a arquitetura já usada; não imponha Slim, Laravel, Symfony, Repository ou DI onde não existem.
- Adote recursos de linguagem compatíveis com a versão real, não com uma versão presumida.
- Tipos, `strict_types` e análise estática devem seguir o baseline e o escopo da mudança; não transforme correção localizada em migração global.

## Framework comprovado

- **Slim:** preserve pipeline PSR-7/PSR-15, container e forma de registrar handlers existentes.
- **Laravel:** preserve container, requests/policies, Eloquent/query layer e convenções da versão instalada.
- **Symfony:** preserve services, bundles e componentes confirmados no projeto.

## Verificação

Use scripts do Composer e ferramentas instaladas. `php -l`, análise e testes devem registrar resultados reais; migration/deploy exige ambiente e autorização adequados.
