const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração de upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Conexão com o Banco de Dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Criação automática das tabelas no PostgreSQL
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(20),
        telefone VARCHAR(20),
        data_nascimento VARCHAR(20)
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        paciente_id INT REFERENCES pacientes(id) ON DELETE CASCADE,
        data_hora VARCHAR(50) NOT NULL,
        observacoes TEXT,
        tipo_consulta VARCHAR(100),
        valor_pago NUMERIC DEFAULT 0,
        plano_paciente_id INT,
        status VARCHAR(50) DEFAULT 'agendado'
      );

      CREATE TABLE IF NOT EXISTS prontuarios (
        id SERIAL PRIMARY KEY,
        paciente_id INT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
        data_atendimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        queixa_principal TEXT,
        diagnostico_quiropratico TEXT,
        conduta_tratamento TEXT
      );

      CREATE TABLE IF NOT EXISTS documentos (
        id SERIAL PRIMARY KEY,
        paciente_id INT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(255) NOT NULL,
        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS paciente_planos (
        id SERIAL PRIMARY KEY,
        paciente_id INT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
        tipo_plano VARCHAR(100) NOT NULL,
        total_consultas INT NOT NULL,
        consultas_restantes INT NOT NULL,
        valor_total NUMERIC NOT NULL,
        data_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabelas PostgreSQL verificadas/criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err.message);
  }
};

initDb();

// ROTAS DA API

// Pacientes
app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pacientes ORDER BY nome ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pacientes', async (req, res) => {
  const { nome, cpf, telefone, data_nascimento } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pacientes (nome, cpf, telefone, data_nascimento) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, cpf, telefone, data_nascimento]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pacientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
    res.json({ message: 'Paciente removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agendamentos
app.get('/api/agendamentos', async (req, res) => {
  const query = `
    SELECT agendamentos.*, pacientes.nome AS paciente_nome, pacientes.telefone
    FROM agendamentos
    JOIN pacientes ON agendamentos.paciente_id = pacientes.id
    ORDER BY data_hora ASC
  `;
  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agendamentos', async (req, res) => {
  const { paciente_id, data_hora, observacoes, tipo_consulta, valor_pago, plano_paciente_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO agendamentos (paciente_id, data_hora, observacoes, tipo_consulta, valor_pago, plano_paciente_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [paciente_id, data_hora, observacoes, tipo_consulta, valor_pago || 0, plano_paciente_id || null]
    );

    if (plano_paciente_id) {
      await pool.query(
        'UPDATE paciente_planos SET consultas_restantes = consultas_restantes - 1 WHERE id = $1 AND consultas_restantes > 0',
        [plano_paciente_id]
      );
    }

    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/agendamentos/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE agendamentos SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: 'Status atualizado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM agendamentos WHERE id = $1', [id]);
    res.json({ message: 'Agendamento excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prontuários e Histórico
app.get('/api/pacientes/:id/historico', async (req, res) => {
  const { id } = req.params;
  try {
    const prontuarios = await pool.query(
      'SELECT * FROM prontuarios WHERE paciente_id = $1 ORDER BY data_atendimento DESC',
      [id]
    );
    const documentos = await pool.query(
      'SELECT * FROM documentos WHERE paciente_id = $1 ORDER BY data_envio DESC',
      [id]
    );
    res.json({ prontuarios: prontuarios.rows, documentos: documentos.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prontuarios', async (req, res) => {
  const { paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO prontuarios (paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento) VALUES ($1, $2, $3, $4) RETURNING id',
      [paciente_id, queixa_principal, diagnostico_quiropratico, conduta_tratamento]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/prontuarios/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prontuarios WHERE id = $1', [req.params.id]);
    res.json({ message: 'Anotação excluída.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Documentos
app.post('/api/documentos/upload', upload.single('arquivo'), async (req, res) => {
  const { paciente_id, titulo } = req.body;
  const caminho_arquivo = `/uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      'INSERT INTO documentos (paciente_id, titulo, caminho_arquivo) VALUES ($1, $2, $3) RETURNING id',
      [paciente_id, titulo, caminho_arquivo]
    );
    res.json({ id: result.rows[0].id, caminho_arquivo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documentos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Documento excluído.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Planos e Financeiro
app.get('/api/paciente-planos/:paciente_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM paciente_planos WHERE paciente_id = $1 AND consultas_restantes > 0',
      [req.params.paciente_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paciente-planos', async (req, res) => {
  const { paciente_id, tipo_plano, total_consultas, valor_total } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO paciente_planos (paciente_id, tipo_plano, total_consultas, consultas_restantes, valor_total) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [paciente_id, tipo_plano, total_consultas, total_consultas, valor_total]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/financeiro/resumo', async (req, res) => {
  try {
    const rowAg = await pool.query(
      "SELECT SUM(valor_pago) AS total_agendamentos FROM agendamentos WHERE status != 'cancelado'"
    );
    const rowPl = await pool.query('SELECT SUM(valor_total) AS total_planos FROM paciente_planos');

    const total_agendamentos = parseFloat(rowAg.rows[0]?.total_agendamentos || 0);
    const total_planos = parseFloat(rowPl.rows[0]?.total_planos || 0);

    res.json({
      total_agendamentos,
      total_planos,
      faturamento_total: total_agendamentos + total_planos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});