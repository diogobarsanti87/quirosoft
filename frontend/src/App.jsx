import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { UserPlus, Users, Calendar as CalendarIcon, Phone, Clock, FileText, Upload, File, Trash2, DollarSign, Package, AlertCircle } from 'lucide-react';
import logoImg from './assets/logo.png';

const API_URL = 'https://quirosoft-backend.onrender.com/api';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

function App() {
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('pacientes');
  const [pacientes, setPacientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  
  // Forms e Seleções
  const [formPaciente, setFormPaciente] = useState({ nome: '', telefone: '', cpf: '', data_nascimento: '', endereco: '', profissao: '', observacoes: '' });
  const [formAgendamento, setFormAgendamento] = useState({ paciente_id: '', data_hora: '', tipo_consulta: 'Ajuste', valor_pago: '', observacoes: '' });
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState('');
  const [historico, setHistorico] = useState({ prontuarios: [], documentos: [] });
  const [formProntuario, setFormProntuario] = useState({ queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: '' });
  const [arquivoUpload, setArquivoUpload] = useState(null);

  useEffect(() => {
    fetchPacientes();
    fetchAgendamentos();
  }, []);

  const fetchPacientes = async () => {
    try {
      const res = await axios.get(`${API_URL}/pacientes`);
      setPacientes(res.data);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const res = await axios.get(`${API_URL}/agendamentos`);
      setAgendamentos(res.data);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    }
  };

  const handleSalvarPaciente = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/pacientes`, formPaciente);
      alert('Paciente cadastrado com sucesso!');
      setFormPaciente({ nome: '', telefone: '', cpf: '', data_nascimento: '', endereco: '', profissao: '', observacoes: '' });
      fetchPacientes();
    } catch (err) {
      alert('Erro ao salvar paciente.');
    }
  };

  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/agendamentos`, formAgendamento);
      alert('Agendamento realizado!');
      setFormAgendamento({ paciente_id: '', data_hora: '', tipo_consulta: 'Ajuste', valor_pago: '', observacoes: '' });
      fetchAgendamentos();
    } catch (err) {
      alert('Erro ao realizar agendamento.');
    }
  };

  const atualizarStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/agendamentos/${id}/status`, { status });
      fetchAgendamentos();
    } catch (err) {
      alert('Erro ao atualizar status.');
    }
  };

  const handleDeletarAgendamento = async (id) => {
    if (window.confirm('Deseja excluir este agendamento?')) {
      try {
        await axios.delete(`${API_URL}/agendamentos/${id}`);
        fetchAgendamentos();
      } catch (err) {
        alert('Erro ao excluir agendamento.');
      }
    }
  };

  const fetchHistoricoPaciente = async (id) => {
    setPacienteSelecionadoId(id);
    if (!id) {
      setHistorico({ prontuarios: [], documentos: [] });
      return;
    }
    try {
      const resPront = await axios.get(`${API_URL}/prontuarios/paciente/${id}`);
      const resDocs = await axios.get(`${API_URL}/documentos/paciente/${id}`);
      setHistorico({ prontuarios: resPront.data, documentos: resDocs.data });
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const handleSalvarProntuario = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId) return alert('Selecione um paciente!');
    try {
      await axios.post(`${API_URL}/prontuarios`, { paciente_id: pacienteSelecionadoId, ...formProntuario });
      setFormProntuario({ queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: '' });
      fetchHistoricoPaciente(pacienteSelecionadoId);
    } catch (err) {
      alert('Erro ao salvar anotação.');
    }
  };

  const handleDeletarDocumento = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await axios.delete(`${API_URL}/documentos/${id}`);
        fetchHistoricoPaciente(pacienteSelecionadoId);
      } catch (err) {
        alert('Erro ao excluir documento.');
      }
    }
  };

  const handleUploadDocumento = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId || !arquivoUpload) return alert('Selecione o paciente e o arquivo!');
    const formData = new FormData();
    formData.append('arquivo', arquivoUpload);
    formData.append('paciente_id', pacienteSelecionadoId);
    try {
      await axios.post(`${API_URL}/documentos/upload`, formData);
      setArquivoUpload(null);
      fetchHistoricoPaciente(pacienteSelecionadoId);
    } catch (err) {
      alert('Erro ao enviar documento.');
    }
  };

  const events = agendamentos.map((a) => ({
    id: a.id,
    title: `${a.paciente_nome} (${a.tipo_consulta})`,
    start: new Date(a.data_hora ? a.data_hora.replace(' ', 'T') : new Date()),
    end: new Date(new Date(a.data_hora ? a.data_hora.replace(' ', 'T') : new Date()).getTime() + 30 * 60000),
  }));

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <img src={logoImg} alt="Logo" style={{ height: '50px' }} />
        <h1>Sistema Quirosoft</h1>
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setAbaAtiva('pacientes')} style={{ padding: '10px', cursor: 'pointer', fontWeight: abaAtiva === 'pacientes' ? 'bold' : 'normal' }}>
          <UserPlus size={16} /> Pacientes
        </button>
        <button onClick={() => setAbaAtiva('agendamentos')} style={{ padding: '10px', cursor: 'pointer', fontWeight: abaAtiva === 'agendamentos' ? 'bold' : 'normal' }}>
          <CalendarIcon size={16} /> Novo Agendamento
        </button>
        <button onClick={() => setAbaAtiva('calendario')} style={{ padding: '10px', cursor: 'pointer', fontWeight: abaAtiva === 'calendario' ? 'bold' : 'normal' }}>
          <Clock size={16} /> Calendário
        </button>
        <button onClick={() => setAbaAtiva('status')} style={{ padding: '10px', cursor: 'pointer', fontWeight: abaAtiva === 'status' ? 'bold' : 'normal' }}>
          <AlertCircle size={16} /> Status Consultas
        </button>
        <button onClick={() => setAbaAtiva('historico')} style={{ padding: '10px', cursor: 'pointer', fontWeight: abaAtiva === 'historico' ? 'bold' : 'normal' }}>
          <FileText size={16} /> Prontuário / Histórico
        </button>
      </nav>

      {abaAtiva === 'pacientes' && (
        <div>
          <h2><UserPlus size={20} /> Cadastrar Paciente</h2>
          <form onSubmit={handleSalvarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <input placeholder="Nome Completo" value={formPaciente.nome} onChange={(e) => setFormPaciente({ ...formPaciente, nome: e.target.value })} required />
            <input placeholder="Telefone" value={formPaciente.telefone} onChange={(e) => setFormPaciente({ ...formPaciente, telefone: e.target.value })} />
            <input placeholder="CPF" value={formPaciente.cpf} onChange={(e) => setFormPaciente({ ...formPaciente, cpf: e.target.value })} />
            <input type="date" value={formPaciente.data_nascimento} onChange={(e) => setFormPaciente({ ...formPaciente, data_nascimento: e.target.value })} />
            <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>Salvar Paciente</button>
          </form>

          <h2 style={{ marginTop: '30px' }}><Users size={20} /> Pacientes Cadastrados</h2>
          <ul>
            {pacientes.map((p) => (
              <li key={p.id}>{p.nome} - {p.telefone}</li>
            ))}
          </ul>
        </div>
      )}

      {abaAtiva === 'agendamentos' && (
        <div>
          <h2><CalendarIcon size={20} /> Novo Agendamento</h2>
          <form onSubmit={handleSalvarAgendamento} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <select value={formAgendamento.paciente_id} onChange={(e) => setFormAgendamento({ ...formAgendamento, paciente_id: e.target.value })} required>
              <option value="">Selecione o Paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <input type="datetime-local" value={formAgendamento.data_hora} onChange={(e) => setFormAgendamento({ ...formAgendamento, data_hora: e.target.value })} required />
            <select value={formAgendamento.tipo_consulta} onChange={(e) => setFormAgendamento({ ...formAgendamento, tipo_consulta: e.target.value })}>
              <option value="Ajuste">Ajuste</option>
              <option value="Avaliação">Avaliação</option>
              <option value="Retorno">Retorno</option>
            </select>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>Agendar</button>
          </form>
        </div>
      )}

      {abaAtiva === 'calendario' && (
        <div style={{ height: '500px' }}>
          <h2><Clock size={20} /> Agenda de Consultas</h2>
          <BigCalendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" style={{ height: '100%' }} />
        </div>
      )}

      {abaAtiva === 'status' && (
        <div>
          <h2><Clock size={20} /> Gerenciar Status das Consultas</h2>

          <button 
            onClick={() => setMostrarPassados(!mostrarPassados)}
            style={{
              marginBottom: '15px',
              padding: '8px 14px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {mostrarPassados ? '🙈 Ocultar consultas anteriores' : '👁️ Ver consultas anteriores'}
          </button>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {agendamentos
              .filter((a) => {
                if (mostrarPassados) return true;
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataConsulta = new Date(a.data_hora ? a.data_hora.replace(' ', 'T') : new Date());
                return dataConsulta >= hoje;
              })
              .map((a) => (
                <li key={a.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{a.paciente_nome}</strong> - <small>{a.telefone}</small><br />
                    <span style={{ fontWeight: 'bold', color: '#007bff' }}>Tipo: {a.tipo_consulta || 'N/A'}</span><br />
                    <span><Clock size={14} /> {new Date(a.data_hora ? a.data_hora.replace(' ', 'T') : new Date()).toLocaleString('pt-BR')}</span> <br />
                    <span style={{ fontWeight: 'bold', color: a.status === 'realizado' ? 'green' : a.status === 'cancelado' ? 'red' : 'orange' }}>Status: {a.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => atualizarStatus(a.id, 'realizado')} style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>✔ Realizada</button>
                    <button onClick={() => atualizarStatus(a.id, 'cancelado')} style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>⊗ Cancelar</button>
                    <button onClick={() => handleDeletarAgendamento(a.id)} style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>🗑 Excluir</button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div>
          <h2><FileText size={20} /> Histórico do Paciente</h2>
          <select value={pacienteSelecionadoId} onChange={(e) => fetchHistoricoPaciente(e.target.value)} style={{ marginBottom: '20px', padding: '8px' }}>
            <option value="">Selecione um Paciente...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          {pacienteSelecionadoId && (
            <div>
              <h3>Nova Anotação de Prontuário</h3>
              <form onSubmit={handleSalvarProntuario} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                <textarea placeholder="Queixa Principal" value={formProntuario.queixa_principal} onChange={(e) => setFormProntuario({ ...formProntuario, queixa_principal: e.target.value })} />
                <textarea placeholder="Diagnóstico Quiroprático" value={formProntuario.diagnostico_quiropratico} onChange={(e) => setFormProntuario({ ...formProntuario, diagnostico_quiropratico: e.target.value })} />
                <textarea placeholder="Conduta/Tratamento" value={formProntuario.conduta_tratamento} onChange={(e) => setFormProntuario({ ...formProntuario, conduta_tratamento: e.target.value })} />
                <button type="submit" style={{ padding: '8px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', cursor: 'pointer' }}>Salvar Prontuário</button>
              </form>

              <h3 style={{ marginTop: '20px' }}>Upload de Exames / Documentos</h3>
              <form onSubmit={handleUploadDocumento} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="file" onChange={(e) => setArquivoUpload(e.target.files[0])} />
                <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', cursor: 'pointer' }}>Enviar Arquivo</button>
              </form>

              <h3 style={{ marginTop: '30px' }}>Anotações Anteriores</h3>
              {historico.prontuarios.map((pr) => (
                <div key={pr.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                  <small>{new Date(pr.created_at).toLocaleString('pt-BR')}</small>
                  <p><strong>Queixa:</strong> {pr.queixa_principal}</p>
                  <p><strong>Diagnóstico:</strong> {pr.diagnostico_quiropratico}</p>
                  <p><strong>Conduta:</strong> {pr.conduta_tratamento}</p>
                </div>
              ))}

              <h3 style={{ marginTop: '20px' }}>Documentos Anexados</h3>
              {historico.documentos.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                  <a href={`${API_URL}/documentos/download/${doc.id}`} target="_blank" rel="noopener noreferrer">{doc.nome_original}</a>
                  <button onClick={() => handleDeletarDocumento(doc.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Excluir</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;