const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração de upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Conexão com o Banco de Dados SQLite
const db = new sqlite3.Database('./banco.db', (err) => {
  if (err) console.error('Erro ao conectar ao banco de dados:', err.message);
  else console.log('Banco de dados SQLite conectado com sucesso.');
});

// Ativa chaves estrangeiras e cria tabelas
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT,
      telefone TEXT,
      data_nascimento TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER,
      data_hora TEXT NOT NULL,
      observacoes TEXT,
      tipo_consulta TEXT,
      valor_pago REAL DEFAULT 0,
      plano_paciente_id INTEGER,
      status TEXT DEFAULT 'agendado',
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prontuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data_atendimento DATETIME DEFAULT CURRENT_TIMESTAMP,
      queixa_principal TEXT,
      diagnostico_quiropratico TEXT,
      conduta_tratamento TEXT,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      caminho_arquivo TEXT NOT NULL,
      data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS paciente_planos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      tipo_plano TEXT NOT NULL,
      total_consultas INTEGER NOT NULL,
      consultas_restantes INTEGER NOT NULL,
      valor_total REAL NOT NULL,
      data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
    )
  `);
});

// ROTAS DA API

// Pacientes
app.get('/api/pacientes', (req, res) => {
  db.all('SELECT * FROM pacientes ORDER BY nome ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/pacientes', (req, res) => {
  const { nome, cpf, telefone, data_nascimento } = req.body;
  db.run(
    'INSERT INTO pacientes (nome, cpf, telefone, data_nascimento) VALUES (?, ?, ?, ?)',
    [nome, cpf, telefone, data_nascimento],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, nome, cpf, telefone, data_nascimento });
    }
  );
});

// Rota de Deleção Corrigida
app.delete('/api/pacientes/:id', (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run('DELETE FROM agendamentos WHERE paciente_id = ?', [id]);
    db.run('DELETE FROM prontuarios WHERE paciente_id = ?', [id]);
    db.run('DELETE FROM documentos WHERE paciente_id = ?', [id]);
    db.run('DELETE FROM paciente_planos WHERE paciente_id = ?', [id]);
    db.run('DELETE FROM pacientes WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Erro ao deletar paciente:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Paciente removido com sucesso.' });
    });
  });
});

// Agendamentos
app.get('/api/agendamentos', (req, res) => {
  const query = `
    SELECT agendamentos.*, pacientes.nome AS paciente_nome, pacientes.telefone
    FROM agendamentos
    JOIN pacientes ON agendamentos.paciente_id = pacientes.id
    ORDER BY data_hora ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/agendamentos', (req, res) => {
  const { paciente_id, data_hora, observacoes, tipo_consulta, valor_pago, plano_paciente_id } = req.body;

  db.run(
    'INSERT INTO agendamentos (paciente_id, data_hora, observacoes, tipo_consulta, valor_pago, plano_paciente_id) VALUES (?, ?, ?, ?, ?, ?)',
    [paciente_id, data_hora, observacoes, tipo_consulta, valor_pago || 0, plano_paciente_id || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      if (plano_paciente_id) {
        db.run('UPDATE paciente_planos SET consultas_restantes = consultas_restantes - 1 WHERE id = ? AND consultas_restantes > 0', [plano_paciente_id]);
      }

      res.json({ id: this.lastID });
    }
  );
});

app.patch('/api/agendamentos/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run('UPDATE agendamentos SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status atualizado.' });
  });
});

// Excluir Agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM agendamentos WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Erro ao excluir agendamento:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Agendamento excluído com sucesso.' });
  });
});

// Prontuários e Histórico
app.get('/api/pacientes/:id/historico', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM prontuarios WHERE paciente_id = ? ORDER BY data_atendimento DESC', [id], (err, prontuarios) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT * FROM documentos WHERE paciente_id = ? ORDER BY data_envio DESC', [id], (err, documentos) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ prontuarios: prontuarios || [], documentos: documentos || [] });
    });
  });
});

app.post('/api/prontuarios', (req, res) => {
  const { paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento } = req.body;
  db.run(
    'INSERT INTO prontuarios (paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento) VALUES (?, ?, ?, ?)',
    [paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/api/prontuarios/:id', (req, res) => {
  db.run('DELETE FROM prontuarios WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Anotação excluída.' });
  });
});

// Documentos
app.post('/api/documentos/upload', upload.single('arquivo'), (req, res) => {
  const { paciente_id, titulo } = req.body;
  const caminho_arquivo = `/uploads/${req.file.filename}`;
  db.run(
    'INSERT INTO documentos (paciente_id, titulo, caminho_arquivo) VALUES (?, ?, ?)',
    [paciente_id, titulo, caminho_arquivo],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, caminho_arquivo });
    }
  );
});

app.delete('/api/documentos/:id', (req, res) => {
  db.run('DELETE FROM documentos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Documento excluído.' });
  });
});

// Planos e Financeiro
app.get('/api/paciente-planos/:paciente_id', (req, res) => {
  db.all('SELECT * FROM paciente_planos WHERE paciente_id = ? AND consultas_restantes > 0', [req.params.paciente_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/paciente-planos', (req, res) => {
  const { paciente_id, tipo_plano, total_consultas, valor_total } = req.body;
  db.run(
    'INSERT INTO paciente_planos (paciente_id, tipo_plano, total_consultas, consultas_restantes, valor_total) VALUES (?, ?, ?, ?, ?)',
    [paciente_id, tipo_plano, total_consultas, total_consultas, valor_total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/financeiro/resumo', (req, res) => {
  db.get('SELECT SUM(valor_pago) AS total_agendamentos FROM agendamentos WHERE status != "cancelado"', [], (err, rowAg) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT SUM(valor_total) AS total_planos FROM paciente_planos', [], (err, rowPl) => {
      if (err) return res.status(500).json({ error: err.message });
      const total_agendamentos = rowAg?.total_agendamentos || 0;
      const total_planos = rowPl?.total_planos || 0;
      res.json({
        total_agendamentos,
        total_planos,
        faturamento_total: total_agendamentos + total_planos
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});