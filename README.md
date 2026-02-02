# 📊 Mdash-Pontos: Inteligência de Dados para Gestão de Obras
> **Foco:** Agilidade na recolha de dados, integridade operacional e decisão financeira estratégica.
[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_svg)](https://mdash-pontos.streamlit.app/)
---

## 🎯 1. O Problema: Operação vs. Gestão
No ambiente dinâmico de obras, identificámos dois desafios críticos:
*   **Fricção na Recolha:** Necessidade de um método simples para o **Mestre de Obras** realizar a chamada diária (Fixos, Terceirizados ou em Teste) sem sistemas complexos.
*   **Atraso e Erros na Decisão:** Dados brutos dificultavam o cálculo de custos com **diárias**, gestão de aumentos salariais e correções de erros de lançamento.

## 💡 2. A Solução: Arquitetura de Performance e Integridade
Este sistema foi desenvolvido com foco em performance, integridade de dados e prevenção de erro humano, aplicando uma estratégia de **distribuição de processamento**:

1.  **Entrada Inteligente:** Google Forms para a chamada diária, permitindo que o Mestre de Obras **edite respostas enviadas** sem corromper a dashboard, graças à atribuição dinâmica de **IDs únicos** para cada resposta.
2.  **Engenharia de Dados no Google Sheets:** Uso de **Google Apps Script (JS)** e gatilhos para pré-processamento, garantindo que o Python receba dados já estruturados e refinados.
3.  **Visualização Ágil:** O Streamlit atua como uma camada de BI veloz, focada exclusivamente na experiência de decisão do gestor.

## ✨ 3. Funcionalidades de Robustez (Diferenciais)
O sistema conta com lógica avançada para garantir a consistência total dos dados:

*   **Sanitização de Dados (Data Cleaning):** No menu de cadastro, o sistema realiza a limpeza automática de strings (Upper/Trim), evitando conflitos de indexação.
*   **Alertas de Conflito:** Notificação imediata caso um funcionário não esteja devidamente cadastrado no sistema.
*   **Gestão de Diárias Históricas:** Permite alterar o valor da diária **sem retroagir** nos dias já contabilizados, preservando a consistência contábil real.
*   **Edição Retroativa Segura:** Uso de identificadores imutáveis que permitem ao Mestre de Obras modificar respostas no Forms sem prejudicar a dashboard.
*   **Manutenção de Ciclos:** Função para **limpar dados e iniciar um novo semestre** de forma segura, mantendo o modelo original da planilha.

## 🛠️ 4. Especificações Técnicas & Engenharia
*   **Lógica de Negócio:** Google Apps Script (JavaScript) para normalização determinística e validação defensiva.
*   **Processamento & UI:** Python, Pandas e Streamlit (focada em UX rápida).
*   **Fonte de Dados:** Google Sheets API com processamento em memória para reduzir latência.
*   **Segurança:** Gestão de credenciais via `.gitignore` e `secrets.toml`.

### Principais técnicas aplicadas:
*   **Normalização determinística** de dados para matching confiável entre múltiplas fontes.
*   **Identificador imutável por registro** para assegurar rastreabilidade e permitir edições seguras.
*   **Preservação de valores históricos** para garantir integridade financeira mesmo após alterações futuras.
*   **Processamento em memória** para reduzir chamadas à API e melhorar a escalabilidade.
*   **Sincronização seletiva** para evitar recomputação desnecessária.
*   **Autocorreção e validação defensiva** para minimizar falhas de entrada do usuário.
*   **Arquitetura modular** baseada em separação de responsabilidades (SoC).

## 🚀 5. Roadmap e Futuras Versões
*   **Evolução Estética:** Migração para interfaces mais personalizadas e estilizadas para elevar a UI/UX.
*   **KPIs Avançados:** Implementação de métricas de produtividade preditiva.
*   **Machine Learning:** Modelos para prever tendências de gastos, riscos de atrasos e padrões de assiduidade.

## 📂 6. Arquitetura do Fluxo
```text
[Mestre de Obras] -> (Forms + ID Imutável) -> [JS Script (Normalização/Triggers)] -> [Python App] -> [Gestor]
