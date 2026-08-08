# Diretrizes condicionais — frontend e UI

> Confirme framework, browser targets, design tokens e componentes antes de aplicar uma recomendação.

- Preserve semântica e padrões interativos existentes; escolha `button`, link ou controle conforme a ação real.
- Extraia componentes quando houver reutilização/complexidade comprovada, não por tamanho arbitrário.
- Use o sistema de tokens vigente. Se ele não existir, criar um é decisão separada, não correção automática.
- Garanta foco, teclado, labels, alternativas textuais e contraste nas superfícies alteradas.
- Lazy loading, minificação e divisão de bundle dependem do recurso, build e medição reais; não aplique mecanicamente.
- Valide estados e breakpoints afetados e registre o que foi ou não conferido.
