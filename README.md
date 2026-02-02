# 📊 Mdash-Pontos: Inteligência de Dados para Gestão de Obras

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=Streamlit&logoColor=white)
![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
---

### 🌐 Acesse a Aplicação
[![Acesse o Dashboard](https://img.shields.io/badge/CLIQUE_AQUI_PARA_ABRIR_O_DASHBOARD-000000?style=for-the-badge&logo=streamlit&logoColor=white)](https://mdash-pontos.streamlit.app/)

---
> **Foco:** Agilidade na recolha de dados, integridade operacional e decisão financeira estratégica.

---

## 🚀 1. Status do Projeto e Tecnologia
Nesta **versão inicial (MVP)**, o **Streamlit** foi a tecnologia escolhida para a interface a fim de facilitar a construção ágil do Dashboard e garantir que a camada de dados fosse entregue com rapidez aos gestores. 

* **Evolução Visual:** Em versões posteriores, utilizaremos ferramentas complementares de Front-end para tornar a interface ainda mais estilizada e personalizada de acordo com a identidade visual da empresa.

## 🎯 2. O Problema: Operação vs. Gestão
No ambiente dinâmico de obras, identificámos dois desafios críticos:
* **Fricção na Recolha:** Necessidade de um método simples para o **Mestre de Obras** realizar a chamada diária sem sistemas complexos.
* **Atraso e Erros na Decisão:** Dados brutos dificultavam o cálculo de custos com diárias e correções de erros de lançamento.

## 💡 3. A Solução: Arquitetura de Performance
Este sistema aplica uma estratégia de **distribuição de processamento**:

1.  **Entrada Inteligente:** Google Forms com atribuição dinâmica de **IDs únicos**, permitindo edições seguras.
2.  **Engenharia de Dados:** Uso de **Google Apps Script (JS)** para pré-processamento antes do envio para o Python.
3.  **Visualização Ágil:** Camada de BI em Streamlit focada em UX rápida para tomada de decisão.

## ✨ 4. Diferenciais de Robustez
* **Sanitização Automática:** Limpeza de strings (Upper/Trim) para evitar erros de indexação.
* **Gestão de Diárias Históricas:** Mudanças salariais não retroagem, preservando a verdade contábil do passado.
* **Edição Retroativa Segura:** Uso de identificadores imutáveis para rastreabilidade.

## 🤖 5. Roadmap e Futuras Versões
O projeto prevê uma jornada de amadurecimento tecnológico:
* **Novos KPIs:** Implementação de métricas de performance preditiva e custo por etapa de obra.
* **Machine Learning:** Modelos treinados para prever tendências de gastos mensais e detecção de anomalias na assiduidade.

## 🛠️ 6. Especificações Técnicas
* **Lógica:** Google Apps Script (JavaScript).
* **Processamento & UI:** Python, Pandas e Streamlit.
* **Fonte de Dados:** Google Sheets API.

---

## 📂 7. Arquitetura do Fluxo
```text
[Mestre de Obras] -> (Forms + ID Imutável) -> [JS Script (Normalização)] -> [Python App] -> [Gestor]