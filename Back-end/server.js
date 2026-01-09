// backend/server.js - VERSÃO DISTRIBUÍDA COM RODÍZIO CORRETO
const express = require('express');
const { create } = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// ================= CONFIGURAÇÕES =================
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// =================  ALTERE AQUI!  =================
// COLOQUE OS 3 NÚMEROS DOS ATENDENTES
const ATENDENTES = [
  { nome: 'Gabi', whatsapp: '556195359962' },   // WhatsApp X
  { nome: 'Mãe',  whatsapp: '556184679962' },  // WhatsApp Y  
  { nome: 'Lucas', whatsapp:'556191020702' }  // WhatsApp Z
];

// Contador para rodízio - GLOBAL
let contadorAtendentes = 0;

// ================= FUNÇÃO DE RODÍZIO =================
function getProximoAtendente() {
  const atendente = ATENDENTES[contadorAtendentes];
  console.log(`\n🔄 RODÍZIO: Contador atual: ${contadorAtendentes}`);
  console.log(`🔄 RODÍZIO: Atendente selecionado: ${atendente.nome}`);
  
  // Atualiza para o próximo (circular)
  contadorAtendentes = (contadorAtendentes + 1) % ATENDENTES.length;
  console.log(`🔄 RODÍZIO: Próximo atendente será: ${ATENDENTES[contadorAtendentes].nome}\n`);
  
  return atendente;
}

// ================= VARIÁVEIS =================
let whatsappClient = null;

// ================= FUNÇÃO WHATSAPP =================
async function iniciarWhatsApp() {
  try {
    console.log('🔧 Iniciando conexão com WhatsApp...');
    
    whatsappClient = await create({
      session: 'medsenior-brasilia',
      catchQR: (base64Qr, asciiQR) => {
        console.log('\n══════════════════════════════════════');
        console.log('📱 QR CODE PARA WHATSAPP:');
        console.log('══════════════════════════════════════');
        console.log(asciiQR);
        console.log('══════════════════════════════════════');
        console.log('1. Abra WhatsApp no CELULAR');
        console.log('2. Toque em ⋮ (três pontos)');
        console.log('3. Vá em "Aparelhos conectados"');
        console.log('4. Clique em "Conectar um aparelho"');
        console.log('5. Aponte a câmera para o QR acima');
        console.log('══════════════════════════════════════\n');
      },
      statusFind: (statusSession) => {
        console.log('📱 Status WhatsApp:', statusSession);
        if (statusSession === 'inChat') {
          console.log('✅ WHATSAPP CONECTADO COM SUCESSO!');
        }
      },
      headless: true,
      useChrome: true,
      logQR: true,
      autoClose: false,
      killProcessOnBrowserClose: true,
      browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    console.log('✅ WhatsApp inicializado!');
    console.log('📱 Atendentes configurados:', ATENDENTES.map(a => a.nome));
    console.log(`🔄 Sistema de rodízio ativo. Próximo atendente: ${ATENDENTES[contadorAtendentes].nome}`);
    return whatsappClient;
    
  } catch (error) {
    console.error('❌ Erro ao conectar WhatsApp:', error.message);
    return null;
  }
}

// ================= FUNÇÃO ENVIAR MENSAGEM =================
async function enviarMensagemWhatsApp(numero, mensagem) {
  if (!whatsappClient) {
    console.log('⚠️ WhatsApp não conectado. Tentando conectar...');
    whatsappClient = await iniciarWhatsApp();
    if (!whatsappClient) {
      return { success: false, error: 'WhatsApp não disponível' };
    }
  }
  
  try {
    // Limpa o número
    let numeroLimpo = numero.toString().replace(/\D/g, '');
    
    console.log(`🔍 Enviando para: ${numeroLimpo}`);
    
    // Garante que tem "55" no início
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }
    
    // Tenta primeiro formato mais comum
    const numeroFormatado1 = `${numeroLimpo}@c.us`;
    
    console.log(`📱 Formatando: ${numeroFormatado1}`);
    
    try {
      await whatsappClient.sendText(numeroFormatado1, mensagem);
      console.log('✅ Mensagem enviada com sucesso!');
      return { success: true };
    } catch (error1) {
      console.log(`🔄 Tentando formato alternativo... (Erro: ${error1.message})`);
      
      // Tenta formato alternativo
      const numeroFormatado2 = `${numeroLimpo}@s.whatsapp.net`;
      await whatsappClient.sendText(numeroFormatado2, mensagem);
      console.log('✅ Enviado com formato alternativo!');
      return { success: true };
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
    
    // Se falhar, tenta sem o 55 (para números já completos)
    try {
      console.log('🔄 Tentando sem o 55...');
      let numeroSem55 = numero.toString().replace(/\D/g, '');
      if (numeroSem55.startsWith('55')) {
        numeroSem55 = numeroSem55.substring(2);
      }
      
      const numeroFinal = `${numeroSem55}@c.us`;
      await whatsappClient.sendText(numeroFinal, mensagem);
      console.log('✅ Enviado sem o 55!');
      return { success: true };
    } catch (errorFinal) {
      console.error('❌ Falha total:', errorFinal.message);
      return { success: false, error: errorFinal.message };
    }
  }
}

// ================= ROTAS =================

// Rota GET: Página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; padding: 30px; text-align: center;">
        <h1>🚀 Backend MedSênior Brasília - DISTRIBUÍDO</h1>
        <p><strong>Status:</strong> Online ✅</p>
        <p><strong>WhatsApp:</strong> ${whatsappClient ? 'Conectado ✅' : 'Desconectado ❌'}</p>
        <p><strong>Atendentes configurados:</strong></p>
        <ul style="display: inline-block; text-align: left;">
          ${ATENDENTES.map(atendente => 
            `<li>${atendente.nome}: ${atendente.whatsapp}</li>`
          ).join('')}
        </ul>
        <p><strong>Sistema:</strong> Distribuição alternada entre os 3 números</p>
        <p><strong>Contador de rodízio:</strong> ${contadorAtendentes}</p>
        <p><strong>Próximo atendente:</strong> ${ATENDENTES[contadorAtendentes].nome}</p>
        <p><strong>Endpoints:</strong></p>
        <ul style="display: inline-block; text-align: left;">
          <li>GET <a href="/status">/status</a> - Verificar status</li>
          <li>GET <a href="/teste">/teste</a> - Teste automático</li>
          <li>POST /enviar-lead - Enviar lead para WhatsApp</li>
          <li>GET <a href="/leads">/leads</a> - Ver leads salvos</li>
        </ul>
        <p style="margin-top: 30px; color: #666;">
          Sistema automático funcionando!<br>
          <small>Pronto para receber leads do formulário</small>
        </p>
      </body>
    </html>
  `);
});

// Rota GET: Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    whatsappConnected: !!whatsappClient,
    atendentes: ATENDENTES,
    contadorRodizio: contadorAtendentes,
    proximoAtendente: ATENDENTES[contadorAtendentes],
    timestamp: new Date().toISOString(),
    mensagem: 'Backend distribuído funcionando!'
  });
});

// Rota GET: Teste automático para os 3 atendentes
app.get('/teste', async (req, res) => {
  try {
    console.log('🧪 Teste automático para os 3 atendentes...');
    
    const resultados = [];
    
    for (const atendente of ATENDENTES) {
      const mensagemTeste = `✅ *TESTE DO SISTEMA MEDSÊNIOR*

Olá ${atendente.nome}! Este é um teste do sistema automático.

📋 *Sistema:* Backend MedSênior Brasília
📞 *Destino:* ${atendente.whatsapp}
⏰ *Data/Hora:* ${new Date().toLocaleString('pt-BR')}

🔗 *Status:* Tudo funcionando perfeitamente!

Pronto para receber leads do formulário online.`;

      console.log(`📤 Teste para ${atendente.nome} (${atendente.whatsapp})...`);
      const resultado = await enviarMensagemWhatsApp(atendente.whatsapp, mensagemTeste);
      
      resultados.push({
        atendente: atendente.nome,
        whatsapp: atendente.whatsapp,
        success: resultado.success,
        error: resultado.error
      });
      
      // Pequena pausa entre envios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({
      success: true,
      message: 'Teste enviado para todos os atendentes!',
      resultados: resultados,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rota GET: Ver leads salvos
app.get('/leads', (req, res) => {
  try {
    if (fs.existsSync('leads.json')) {
      const leads = JSON.parse(fs.readFileSync('leads.json', 'utf8'));
      res.json({
        success: true,
        total: leads.length,
        leads: leads
      });
    } else {
      res.json({
        success: true,
        total: 0,
        leads: [],
        message: 'Nenhum lead salvo ainda'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ⭐⭐ ROTA PRINCIPAL: Receber leads - COM RODÍZIO CORRETO
app.post('/enviar-lead', async (req, res) => {
  try {
    const dados = req.body;
    console.log('\n📨 ========== NOVO LEAD RECEBIDO ==========');
    console.log('📊 Dados do lead:', {
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
      origem: dados.origem || 'Landpage Brasília'
    });
    
    // Validar dados mínimos
    if (!dados.nome || !dados.telefone) {
      return res.status(400).json({
        success: false,
        error: 'Nome e telefone são obrigatórios'
      });
    }
    
    // ⭐⭐ SISTEMA DE RODÍZIO - BACKEND CONTROLA TUDO ⭐⭐
    const atendente = getProximoAtendente();
    console.log(`🔄 ATENDENTE SELECIONADO (RODÍZIO): ${atendente.nome} (${atendente.whatsapp})`);
    
    // Formatar mensagem para WhatsApp
    const mensagemWhatsApp = `
📋 *NOVO LEAD MEDSÊNIOR - BRASÍLIA*

👤 *Cliente:* ${dados.nome}
📞 *Telefone do Cliente:* ${dados.telefone}
📧 *Email:* ${dados.email || 'Não informado'}
🎂 *Idade:* ${dados.idade || 'Não informada'}
🔢 *CPF:* ${dados.cpf || 'Não informado'}

📍 *Endereço:* ${dados.endereco || 'Não informado'}
🏙️ *Cidade:* Brasília/DF

💼 *Estado Civil:* ${dados.estadoCivil || 'Não informado'}
🏥 *Atendimento em:* ${dados.estadoAtendimento || 'Não informado'}

📝 *Observações:* ${dados.observacoes || 'Nenhuma observação'}

👨‍⚕️ *Atendente designado:* ${atendente.nome}
⏰ *Recebido em:* ${new Date().toLocaleString('pt-BR')}

🌐 *Origem:* ${dados.origem || 'Formulário Online'}
🔗 *Enviado automaticamente para você*
    `.trim();
    
    // Salvar localmente (backup)
    const leadsFile = 'leads.json';
    let leads = [];
    
    if (fs.existsSync(leadsFile)) {
      leads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
    }
    
    const leadCompleto = {
      ...dados,
      id: Date.now(),
      dataRecebimento: new Date().toISOString(),
      atendenteDesignado: atendente.nome,
      whatsappDestino: atendente.whatsapp,
      contadorRodizio: contadorAtendentes - 1 // Contador já foi incrementado
    };
    
    leads.push(leadCompleto);
    fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
    console.log('💾 Lead salvo em leads.json');
    
    // Enviar para WhatsApp
    console.log(`📤 Enviando para WhatsApp de ${atendente.nome}...`);
    const resultadoWhatsApp = await enviarMensagemWhatsApp(atendente.whatsapp, mensagemWhatsApp);
    
    // Atualizar status no arquivo
    if (resultadoWhatsApp.success) {
      leadCompleto.enviadoComSucesso = true;
      leadCompleto.dataEnvioWhatsApp = new Date().toISOString();
      fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
    }
    
    // Responder ao frontend
    const resposta = {
      success: true,
      message: 'Lead recebido e processado!',
      leadId: leadCompleto.id,
      whatsappEnviado: resultadoWhatsApp.success,
      atendenteDesignado: atendente.nome,
      whatsappDestino: atendente.whatsapp,
      proximoAtendente: ATENDENTES[contadorAtendentes].nome, // Próximo da fila
      contadorRodizio: contadorAtendentes,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Lead processado com sucesso!');
    console.log('📊 Resumo:', {
      id: leadCompleto.id,
      atendente: atendente.nome,
      enviado: resultadoWhatsApp.success,
      proximo: ATENDENTES[contadorAtendentes].nome
    });
    console.log('========================================\n');
    
    res.json(resposta);
    
  } catch (error) {
    console.error('❌ Erro no servidor:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      detalhes: error.message
    });
  }
});

// ================= INICIAR SERVIDOR =================
app.listen(PORT, async () => {
  console.log('══════════════════════════════════════');
  console.log('🚀 BACKEND MEDSÊNIOR BRASÍLIA');
  console.log('📡 Servidor iniciado na porta', PORT);
  console.log('🌐 Acesse: http://localhost:' + PORT);
  console.log('📱 Atendentes configurados:');
  ATENDENTES.forEach((atendente, index) => {
    console.log(`   ${index + 1}. ${atendente.nome}: ${atendente.whatsapp}`);
  });
  console.log(`🔄 Sistema de rodízio ativo`);
  console.log(`🔄 Próximo atendente: ${ATENDENTES[contadorAtendentes].nome}`);
  console.log('══════════════════════════════════════\n');
  
  console.log('🔌 Iniciando conexão com WhatsApp...');
  console.log('⏳ Aguarde o QR Code aparecer...\n');
  
  // Iniciar WhatsApp
  setTimeout(async () => {
    const cliente = await iniciarWhatsApp();
    
    if (cliente) {
      // Teste automático após 3 segundos
      setTimeout(async () => {
        console.log('\n🧪 Executando teste automático para o primeiro atendente...');
        const primeiroAtendente = ATENDENTES[0];
        const mensagemTeste = `✅ Sistema MedSênior iniciado! Pronto para receber leads. Atendente: ${primeiroAtendente.nome}`;
        const resultado = await enviarMensagemWhatsApp(primeiroAtendente.whatsapp, mensagemTeste);
        console.log('Teste automático:', resultado.success ? '✅ Sucesso' : '❌ Falha');
      }, 3000);
    }
  }, 2000);
});

console.log('✅ server.js carregado com sucesso!');