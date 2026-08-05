# 🐘 DIRETRIZES DE TECNOLOGIA: PHP

> **Escopo:** Diretrizes de desenvolvimento, sintaxe, arquitetura e boas práticas para projetos PHP (Slim 4, Laravel, Symfony, Custom).

---

## ⚡ 1. PADRÕES E SINTAXE OBRIGATÓRIOS

1. **Strict Types:**
   - Todo arquivo PHP DEVE iniciar com `declare(strict_types=1);` logo após a tag `<?php`.

2. **Versão e PSRs:**
   - PHP 8.2+ (utilizar Constructor Property Promotion, Enums, Match Expressions, Readonly Properties e Named Arguments).
   - Respeitar PSR-12 para estilo de código e PSR-4 para Autoloading via Composer.

3. **Tipagem Estrita de Retorno e Parâmetros:**
   - Todas as funções e métodos DEVEM declarar explicitamente os tipos de parâmetros e o tipo de retorno (ex: `public function findById(int $id): ?UserEntity`).

---

## 🏗️ 2. PADRÕES DE ARQUITETURA POR FRAMEWORK

### PHP — Slim 4 Architecture:
- **Single Action Controllers (Invokable):** Uma classe por rota HTTP, implementando o método `__invoke(Request $request, Response $response, array $args): Response`.
- **Injeção de Dependência via PSR-11 (PHP-DI):** Declarar dependências exclusivamente via construtor. Proibido chamar o container diretamente (`$container->get()`).
- **Middleware Pipeline:** Tratamento de autenticação, validação de sessão e tratamento de erros via Middlewares PSR-15.

### PHP — Laravel Architecture:
- **Form Requests:** Toda validação de formulário/API DEVE ser extraída para classes `FormRequest`.
- **Eloquent Best Practices:** NUNCA executar queries no Controller. Usar Repositories ou Query Scopes no Model.
- **Policies & Gates:** Autorização de acesso centralizada em Policies.

---

## 🧪 3. ANÁLISE ESTÁTICA E TESTES
- **PHPStan / Psalm:** Código deve passar no nível 7+ do PHPStan sem erros.
- **PHPUnit:** Testes unitários para Domain/Services e testes de integração para Actions/Repositories.
