# Documentação Operacional - LogAgend (Versão Beta)

## 1. Objetivo do Processo
O LogAgend tem como objetivo centralizar e otimizar o agendamento de recebimentos de cargas, garantindo que a capacidade operacional do armazém seja respeitada e que haja uma comunicação clara com os fornecedores.

## 2. Quando Usar
- Sempre que houver necessidade de agendar uma nova entrega.
- Para consultar a agenda do dia e preparar a equipe de recebimento.
- Para avaliar a performance de pontualidade dos fornecedores (No Show).

## 3. Passo a Passo

### Realizar um Agendamento
1. Acesse a aba **Movimentações > Agenda**.
2. Clique no botão **Novo Agendamento**.
3. Preencha os dados: Fornecedor, Tipo de Recebimento, Data, Horário e Quantidade de Volumes.
4. O sistema validará automaticamente se há capacidade disponível e se o fornecedor respeita o horário permitido.

### Registrar Recebimento (Check-in)
1. Na tela de **Agenda**, localize o agendamento do momento.
2. Clique no botão de Recebimento (ícone de check).
3. Informe a quantidade de volumes recebidos e o horário real.

### Monitorar No Shows
1. Caso um fornecedor não apareça, o sistema marcará automaticamente como **No Show**.
2. Para visualizar e gerenciar, acesse **Configurações > No Show**.
3. É possível retirar um No Show mediante justificativa técnica.

## 4. Responsáveis
- **Administradores:** Configuração de limites e gestão de usuários.
- **Supervisores:** Monitoramento de Dashboards e liberação de No Shows.
- **Operadores:** Lançamento de agendamentos e registros de recebimento.

## 5. Entradas e Saídas
- **Entradas:** Dados do fornecedor, tipo de carga, volumes estimados.
- **Saídas:** Calendário consolidado, Relatórios em Excel, KPIs de Performance.

## 6. Pontos de Atenção / Erros Comuns
- **Buffer Operacional:** O sistema impede agendamentos muito próximos para evitar gargalos.
- **Capacidade Excedida:** Se a capacidade do dia estiver cheia, o sistema sugerirá outra data.
- **Horário Final < Inicial:** Bloqueio preventivo implementado para evitar inconsistências.

## 7. Controle de Versões
- **Versão Beta (Atual):** Primeira versão estável com integração de IA, gestão de No Show e filtros avançados.
