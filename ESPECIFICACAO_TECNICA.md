# Especificação Técnica - LogAgend (Versão Beta)

## 1. Visão Geral
**Objetivo Técnico:** Sistema de gestão de agendamentos e recepção de cargas.
**Requisitos:** Gestão de capacidade, usuários, relatórios e inteligência artificial.
**Escopo:** Controle de fluxo de recebimento e avaliação de performance de fornecedores.

## 2. Arquitetura
O sistema segue uma arquitetura **Serverless** baseada em:
- **Frontend:** SPA (Single Page Application) em Vanilla JS.
- **Armazenamento:** `localStorage` com persistência em arquivos JSON exportáveis.
- **Fluxo de Dados:** O `store.js` centraliza o estado e sincroniza com o banco de dados local.

## 3. Tecnologias
- **Linguagens:** HTML5, CSS3, JavaScript (ES6+).
- **Frameworks:** Nenhum (Vanilla JS para máxima portabilidade).
- **IA:** Google Gemini API (modelo `gemini-2.0-flash`).
- **Exportação:** Bibloteca `XLSX` para geração de planilhas.

## 4. Estrutura de Dados
- **Schedules:** `id, fornecedor, data, hora_inicio, hora_fim, status, volumes, volumes_recebidos`.
- **Suppliers:** `id, nome_fornecedor, hora_inicio, hora_fim, observacoes`.
- **Holidays:** `id, data, descricao`.
- **Users:** `id, nome, login, senha, grupo`.
- **Groups:** `id, nome, permissoes, permitir_ia`.

## 5. Regras de Negócio
- **Validação de Horário:** `hora_fim > hora_inicio`.
- **Check-in Antecipado:** Fornecedores com atraso acima do limite são avaliados negativamente.
- **No Show Automático:** Agendamentos não realizados no dia são marcados como NOSHOW ao final do período.

## 6. Integrações
- **Gemini API:** Comunicação via HTTPS (Fetch API) para análise de dados.
- **Backup Automático:** Agendador via `setInterval` que gera arquivos JSON baseados na frequência configurada.

## 7. Segurança
- **Controle de Acesso:** Baseado em grupos (ADM, Supervisor, Operador).
- **Autenticação:** Sessão mantida em `sessionStorage`.
- **Criptografia:** Senhas armazenadas localmente (Uso educacional/BETA).

## 8. Deploy
- **Requisitos:** Qualquer navegador moderno (Chrome, Edge, Firefox).
- **Instalação:** Basta extrair o arquivo ZIP e abrir `index.html`.

## 9. Manutenção
- **Backup:** Através da aba Integração (Exportar Base).
- **Atualização:** Substituição dos arquivos `js/` e manter `localStorage`.

## 10. Controle de Versões
- **Versão Beta:** Lançamento inicial com estrutura unificada.
