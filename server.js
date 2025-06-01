const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Armazenamento em memória dos números sorteados
let numerosSorteados = new Set();
let ultimoNumero = null;

// Rota principal - Quadro do Bingo
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'quadro.html'));
});

// Rota para inserir números sorteados
app.get('/sortear', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'sortear.html'));
});

// API para obter números sorteados
app.get('/api/numeros-sorteados', (req, res) => {
  res.json({
    numerosSorteados: Array.from(numerosSorteados),
    ultimoNumero: ultimoNumero,
    total: numerosSorteados.size
  });
});

// API para adicionar número sorteado
app.post('/api/sortear-numero', (req, res) => {
  const { numero } = req.body;
  const num = parseInt(numero);
  
  if (isNaN(num) || num < 1 || num > 75) {
    return res.status(400).json({ 
      erro: 'Número deve estar entre 1 e 75' 
    });
  }
  
  if (numerosSorteados.has(num)) {
    return res.status(400).json({ 
      erro: 'Número já foi sorteado' 
    });
  }
  
  numerosSorteados.add(num);
  ultimoNumero = num;
  
  // Emitir para todos os clientes conectados
  io.emit('numero-sorteado', {
    numero: num,
    numerosSorteados: Array.from(numerosSorteados),
    total: numerosSorteados.size
  });
  
  res.json({ 
    sucesso: true, 
    numero: num,
    total: numerosSorteados.size
  });
});

// API para resetar o jogo
app.post('/api/reset', (req, res) => {
  numerosSorteados.clear();
  ultimoNumero = null;
  
  io.emit('jogo-resetado');
  
  res.json({ sucesso: true });
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar estado atual para o novo cliente
  socket.emit('estado-inicial', {
    numerosSorteados: Array.from(numerosSorteados),
    ultimoNumero: ultimoNumero,
    total: numerosSorteados.size
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`Sortear números: http://localhost:${PORT}/sortear`);
});