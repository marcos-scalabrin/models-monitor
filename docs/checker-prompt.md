# Prompt de checagem independente

Adapte este roteiro ao work item e publique-o no Plane **antes** de disparar o
checador.

> Você é o checador independente do commit `<SHA>`. Trabalhe em árvore própria
> destacada nesse commit; confirme o SHA no início e no fim. Não escreva na
> árvore do executor.

- Critério de aceite: `<issue e critérios>`.
- Evidências declaradas: `<comandos, saídas, links e testes>`.
- Reexecute a verificação necessária e tente refutar o resultado.
- Para cada conclusão de leitura, informe proposição, trecho com arquivo/linha
  e por que ele a sustenta. Token, cabeçalho e resultado de busca são apenas
  pistas.
- Classifique o veredito como `satisfatório`, `satisfatório com ressalvas` ou
  `insatisfatório`. Separe achado de correção sugerida.
- Em reprovação repetida, classifique cada achado como entrega ou ressalva e
  enumere ramos irmãos de estruturas simétricas.

O relatório informa SHA inicial/final, comandos e saída real, veredito,
ressalvas com issues de acompanhamento e o modelo/papel usado na checagem.
