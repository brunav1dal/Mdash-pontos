/**
 * ==============================================================================
 * FUNÇÕES DE APOIO E PADRONIZAÇÃO
 * ==============================================================================
 */

/**
 * Limpa textos: remove acentos, símbolos e padroniza para CAIXA ALTA.
 * Essencial para que o script encontre o funcionário mesmo se houver erro de digitação.
 */
function limparTexto(t) {
  if (!t) return "";
  return t.toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .replace(/[^a-zA-Z0-9 ]/g, "")    // Remove caracteres especiais
          .trim()
          .toUpperCase()
          .replace(/\s+/g, ' ');           // Remove espaços duplos
}

/**
 * ==============================================================================
 * BLOCO 1: INTERFACE E GATILHOS (EDITAR E ABRIR)
 * ==============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ GESTÃO')
    .addItem('Sincronizar Cadastros Novos', 'sincronizarRetroativoGeral')
    .addItem('Cadastrar Colaborador', 'CadastrarPeloMenu')
    .addSeparator()
    .addItem('Limpar para Novo Ciclo', 'LimparDadosParaNovoCiclo')
    .addToUi();
}

/**
 * Monitora edições manuais nas abas. Se mudar um nome ou valor de extra, 
 * o sincronizador é chamado automaticamente.
 */
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var col = range.getColumn();
  var row = range.getRow();
  
  // Se editar o CADASTRO_FIXO (Nome ou Valor Extra)
  if (sheet.getName() == "CADASTRO_FIXO" && row > 1) {
    if (col == 1) { // Mudou nome
      var v = range.getValue();
      var l = limparTexto(v);
      if (v !== l && l !== "") range.setValue(l);
    }
    if (col == 6) sincronizarRetroativoGeral(); // Mudou valor extra (Gratificação)
  }

  // Se editar o Nome manualmente na BASE_PRESENÇA
  if (sheet.getName() == "BASE_PRESENÇA" && col == 1 && row > 1) {
    sincronizarRetroativoGeral();
  }
}

/**
 * ==============================================================================
 * BLOCO 2: CADASTRO VIA MENU (VALIDAÇÃO DE CÉLULAS MESCLADAS)
 * ==============================================================================
 */

function CadastrarPeloMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaMenu = ss.getSheetByName("MENU");
  var abaCad = ss.getSheetByName("CADASTRO_FIXO");
  
  var nomeTratado = limparTexto(abaMenu.getRange("C3").getValue());
  var funcao = abaMenu.getRange("C5").getValue().toString().toUpperCase().trim();
  var diariaDiurna = abaMenu.getRange("C7").getValue();
  var diariaNoturna = abaMenu.getRange("G7").getValue(); // Captura da célula mesclada
  var tipo = abaMenu.getRange("C9").getValue();
  var extra = abaMenu.getRange("C11").getValue() || 0;
  
  // Validação básica
  if (nomeTratado === "" || diariaNoturna <= 0) {
    SpreadsheetApp.getUi().alert("⚠️ Erro: Preencha o Nome e o Valor Noturno (G7) corretamente.");
    return;
  }
  
  // Adiciona ao final da lista de cadastro
  abaCad.appendRow([nomeTratado, funcao, diariaDiurna, diariaNoturna, tipo, extra]);
  
  // Sincroniza retroativamente caso o funcionário já tivesse presenças sem cadastro
  sincronizarRetroativoGeral();
  
  // Limpa o formulário do menu
  abaMenu.getRangeList(['C3', 'C5', 'C7', 'G7', 'C9', 'C11']).clearContent();
  SpreadsheetApp.getUi().alert("✅ Colaborador '" + nomeTratado + "' cadastrado com sucesso!");
}

/**
 * ==============================================================================
 * BLOCO 3: PROCESSAMENTO DO FORMULÁRIO (COM MEMÓRIA DE VALOR E ID_LINHA)
 * ==============================================================================
 */

function aoEnviarFormulario(e) {
  Utilities.sleep(2000); // Aguarda o Google registrar os dados na aba de respostas
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaBase = ss.getSheetByName("BASE_PRESENÇA");
  var abaCad  = ss.getSheetByName("CADASTRO_FIXO");
  var abaResp = ss.getSheetByName("Respostas do formulário 1");

  // O ID é o número da linha na aba de respostas (Imutável mesmo se editar o texto)
  var linhaID = e.range ? e.range.getRow() : abaResp.getLastRow();
  var registro = abaResp.getRange(linhaID, 1, 1, abaResp.getLastColumn()).getValues()[0];
  
  // Mapeamento das colunas do Google Forms
  var obra = registro[1], dataRef = registro[2], p = registro[3], jativa = registro[4] || "", a = registro[5], turno = registro[6] || "Diurno";

  /**
   * MEMÓRIA DE VALOR: 
   * Se for uma EDIÇÃO, capturamos os valores financeiros que já estavam na base antes de deletar.
   * Isso evita que edições de datas passadas mudem o valor caso você tenha alterado o cadastro hoje.
   */
  var memoriaValores = {}; 
  var dadosBaseExistentes = abaBase.getDataRange().getValues();
  
  for (var i = dadosBaseExistentes.length - 1; i >= 1; i--) {
    if (dadosBaseExistentes[i][9] == linhaID) { // Encontrou o ID da linha editada
      var nomeKey = limparTexto(dadosBaseExistentes[i][0]);
      
      // Se o funcionário já tinha uma função cadastrada, salvamos o valor histórico
      if (dadosBaseExistentes[i][7] !== "NÃO CADASTRADO") {
        memoriaValores[nomeKey] = {
          valorHistorico: (dadosBaseExistentes[i][5] > 0) ? dadosBaseExistentes[i][5] : dadosBaseExistentes[i][6],
          func: dadosBaseExistentes[i][7]
        };
      }
      // Deleta a linha antiga da Base para dar lugar à nova (substituição total)
      abaBase.deleteRow(i + 1);
    }
  }

  // Carrega os dados de cadastro atuais para novos funcionários
  var dadosCad = abaCad.getLastRow() > 1 ? abaCad.getRange("A2:F" + abaCad.getLastRow()).getValues() : [];

  /**
   * Função interna para processar listas de nomes (Presentes e Ausentes)
   */
  var processar = function(listaStr, status) {
    if (!listaStr) return;
    listaStr.split(",").forEach(function(n) {
      var nomeLimpo = limparTexto(n);
      if (nomeLimpo === "") return;
      
      var custo = 0, econ = 0, func = "NÃO CADASTRADO";
      
      // 1ª OPÇÃO: Usar a Memória (Caso seja uma EDIÇÃO de resposta antiga)
      if (memoriaValores[nomeLimpo]) {
        func = memoriaValores[nomeLimpo].func;
        var vMem = memoriaValores[nomeLimpo].valorHistorico;
        custo = (status === "Presente") ? vMem : 0;
        econ = (status === "Ausente") ? vMem : 0;
      } 
      // 2ª OPÇÃO: Usar o Cadastro Atual (Caso seja um ENVIO NOVO)
      else {
        for (var k=0; k<dadosCad.length; k++) {
          if (limparTexto(dadosCad[k][0]) === nomeLimpo) {
            func = dadosCad[k][1];
            var v = (turno === "Noturno") ? dadosCad[k][3] : dadosCad[k][2];
            var ex = dadosCad[k][5] || 0;
            custo = (status === "Presente") ? (v + ex) : 0;
            econ = (status === "Ausente") ? v : 0;
            break;
          }
        }
      }
      
      /**
       * GRAVAÇÃO FINAL NA BASE_PRESENÇA (10 Colunas para a QUERY):
       * A:Nome | B:Data | C:Obra | D:Status | E:Justificativa | F:Custo | G:Economia | H:Função | I:Turno | J:ID_Linha
       */
      abaBase.appendRow([nomeLimpo, dataRef, obra, status, jativa, custo, econ, func, turno, linhaID]);
    });
  };
  
  processar(p, "Presente");
  processar(a, "Ausente");
}

/**
 * ==============================================================================
 * BLOCO 4: SINCRONIZADOR RETROATIVO (ATUALIZADO PARA 10 COLUNAS)
 * ==============================================================================
 */

function sincronizarRetroativoGeral() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaCad = ss.getSheetByName("CADASTRO_FIXO");
  var abaBase = ss.getSheetByName("BASE_PRESENÇA");
  
  if (abaCad.getLastRow() < 2 || abaBase.getLastRow() < 2) return;

  var dadosCad = abaCad.getRange("A2:F" + abaCad.getLastRow()).getValues();
  // Lemos até a coluna J (índice 9) para garantir integridade com a QUERY
  var dadosBase = abaBase.getRange("A2:J" + abaBase.getLastRow()).getValues(); 
  var contador = 0;

  for (var i = 0; i < dadosBase.length; i++) {
    var funcAtual = dadosBase[i][7]; // Coluna H
    
    // Só sincroniza se ainda estiver marcado como "NÃO CADASTRADO"
    if (funcAtual === "NÃO CADASTRADO" || funcAtual === "" || funcAtual === "NAO CADASTRADO") {
      var nomeBase = limparTexto(dadosBase[i][0]);
      
      for (var j = 0; j < dadosCad.length; j++) {
        if (nomeBase === limparTexto(dadosCad[j][0])) {
          
          var status = dadosBase[i][3]; // Coluna D
          var turno = dadosBase[i][8];  // Coluna I (Crucial para o valor correto)
          
          var vBase = (turno === "Noturno") ? dadosCad[j][3] : dadosCad[j][2];
          var eBase = dadosCad[j][5] || 0;

          // Atualiza as colunas financeiras e a função (F, G, H)
          abaBase.getRange(i + 2, 6).setValue(status === "Presente" ? (vBase + eBase) : 0); 
          abaBase.getRange(i + 2, 7).setValue(status === "Ausente" ? vBase : 0);  
          abaBase.getRange(i + 2, 8).setValue(dadosCad[j][1]); 
          
          contador++;
          break;
        }
      }
    }
  }
  
  if (contador > 0) {
    SpreadsheetApp.getUi().alert("✅ Sincronização Concluída!\n" + contador + " registros vinculados.");
  }
}

/**
 * ==============================================================================
 * BLOCO 5: LIMPEZA TOTAL (PRESERVANDO CADASTROS)
 * ==============================================================================
 */

function LimparDadosParaNovoCiclo() {
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert('🚨 LIMPEZA TOTAL', 
    'Isso apagará a BASE DE PRESENÇA e as RESPOSTAS DO FORMULÁRIO.\nO Cadastro Fixo será preservado.\n\nDeseja continuar?', 
    ui.ButtonSet.YES_NO);
  
  if (resposta == ui.Button.YES) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var abaBase = ss.getSheetByName("BASE_PRESENÇA");
    var abaResp = ss.getSheetByName("Respostas do formulário 1");
    
    // Limpa a Base de Presença (Mantendo cabeçalho)
    if (abaBase && abaBase.getLastRow() > 1) {
      abaBase.deleteRows(2, abaBase.getLastRow() - 1);
    }
    
    // Limpa as Respostas Originais do Forms (Mantendo cabeçalho)
    if (abaResp && abaResp.getLastRow() > 1) {
      abaResp.deleteRows(2, abaResp.getLastRow() - 1);
    }
    
    ui.alert("✅ Limpeza concluída! Pronto para um novo ciclo.");
  }
}