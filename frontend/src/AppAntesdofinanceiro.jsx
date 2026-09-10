import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { UserPlus, Users, Calendar as CalendarIcon, Phone, Clock, CheckCircle, XCircle, FileText, Upload, File, Trash2 } from 'lucide-react';
import logoImg from './assets/logo.png';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

function App() {
  const [abaAtiva, setAbaAtiva] = useState('prontuario');
  const [pacientes, setPacientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);

  // Estados de Prontuário
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState('');
  const [historico, setHistorico] = useState({ prontuarios: [], documentos: [] });
  const [formProntuario, setFormProntuario] = useState({
    queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: ''
  });
  const [formDoc, setFormDoc] = useState({ titulo: '', arquivo: null });

  // Form de Paciente e Agendamento
  const [formPaciente, setFormPaciente] = useState({ nome: '', cpf: '', telefone: '', data_nascimento: '' });
  const [formAgendamento, setFormAgendamento] = useState({ paciente_id: '', data_hora: '', observacoes: '' });

  const API_URL = 'http://localhost:3001/api';

  const fetchPacientes = async () => {
    try {
      const res = await axios.get(`${API_URL}/pacientes`);
      setPacientes(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAgendamentos = async () => {
    try {
      const res = await axios.get(`${API_URL}/agendamentos`);
      setAgendamentos(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchHistoricoPaciente = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`${API_URL}/pacientes/${id}/historico`);
      setHistorico(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPacientes();
    fetchAgendamentos();
  }, []);

  useEffect(() => {
    if (pacienteSelecionadoId) {
      fetchHistoricoPaciente(pacienteSelecionadoId);
    }
  }, [pacienteSelecionadoId]);

  const handleSalvarPaciente = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/pacientes`, formPaciente);
    setFormPaciente({ nome: '', cpf: '', telefone: '', data_nascimento: '' });
    fetchPacientes();
  };

  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();
    await axios.post(`${API_URL}/agendamentos`, formAgendamento);
    setFormAgendamento({ paciente_id: '', data_hora: '', observacoes: '' });
    fetchAgendamentos();
  };

  const atualizarStatus = async (id, status) => {
    await axios.patch(`${API_URL}/agendamentos/${id}/status`, { status });
    fetchAgendamentos();
  };

  const handleDeletarPaciente = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja excluir o paciente ${nome} e todo o seu histórico?`)) {
      try {
        await axios.delete(`${API_URL}/pacientes/${id}`);
        if (pacienteSelecionadoId === String(id)) {
          setPacienteSelecionadoId('');
          setHistorico({ prontuarios: [], documentos: [] });
        }
        fetchPacientes();
        fetchAgendamentos();
      } catch (err) {
        console.error('Erro ao excluir paciente:', err);
      }
    }
  };

  const handleDeletarProntuario = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta anotação do prontuário?')) {
      try {
        await axios.delete(`${API_URL}/prontuarios/${id}`);
        fetchHistoricoPaciente(pacienteSelecionadoId);
      } catch (err) {
        console.error('Erro ao excluir anotação:', err);
      }
    }
  };

  const handleDeletarDocumento = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este documento/exame?')) {
      try {
        await axios.delete(`${API_URL}/documentos/${id}`);
        fetchHistoricoPaciente(pacienteSelecionadoId);
      } catch (err) {
        console.error('Erro ao excluir documento:', err);
      }
    }
  };

  const handleSalvarProntuario = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId) return alert('Selecione um paciente!');
    await axios.post(`${API_URL}/prontuarios`, {
      paciente_id: pacienteSelecionadoId,
      ...formProntuario
    });
    setFormProntuario({ queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: '' });
    fetchHistoricoPaciente(pacienteSelecionadoId);
  };

  const handleUploadDocumento = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId || !formDoc.arquivo) return alert('Selecione o paciente e o arquivo!');
    
    const formData = new FormData();
    formData.append('paciente_id', pacienteSelecionadoId);
    formData.append('titulo', formDoc.titulo);
    formData.append('arquivo', formDoc.arquivo);

    await axios.post(`${API_URL}/documentos/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    setFormDoc({ titulo: '', arquivo: null });
    fetchHistoricoPaciente(pacienteSelecionadoId);
  };

  const calcularIdadeDetalhada = (dataNascimento) => {
    if (!dataNascimento) return 'Idade não informada';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento + 'T00:00:00');

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
      anos--;
      meses += 12;
    }
    if (hoje.getDate() < nascimento.getDate() && meses > 0) {
      meses--;
    }

    const textoAnos = anos === 1 ? '1 ano' : `${anos} anos`;
    const textoMeses = meses === 1 ? '1 mês' : `${meses} meses`;

    return `${textoAnos} e ${textoMeses}`;
  };

  const eventos = agendamentos.map((a) => ({
    id: a.id,
    title: `${a.paciente_nome} (${a.observacoes || 'Consulta'})`,
    start: new Date(a.data_hora),
    end: new Date(new Date(a.data_hora).getTime() + 60 * 60 * 1000),
    status: a.status
  }));

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* LOGO DA CLINICA */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
          <img src={logoImg} alt="Logo Quirosoft" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* MENU NAVEGAÇÃO */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setAbaAtiva('pacientes')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: abaAtiva === 'pacientes' ? '#007bff' : '#e0e0e0', color: abaAtiva === 'pacientes' ? 'white' : 'black' }}>
          <Users size={16} /> Pacientes
        </button>
        <button onClick={() => setAbaAtiva('agendamentos')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: abaAtiva === 'agendamentos' ? '#007bff' : '#e0e0e0', color: abaAtiva === 'agendamentos' ? 'white' : 'black' }}>
          <CalendarIcon size={16} /> Agendamentos
        </button>
        <button onClick={() => setAbaAtiva('prontuario')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: 'none', backgroundColor: abaAtiva === 'prontuario' ? '#007bff' : '#e0e0e0', color: abaAtiva === 'prontuario' ? 'white' : 'black' }}>
          <FileText size={16} /> Prontuário & Exames
        </button>
      </div>

      {/* ABA PACIENTES */}
      {abaAtiva === 'pacientes' && (
        <div>
          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h2><UserPlus size={20} /> Cadastrar Paciente</h2>
            <form onSubmit={handleSalvarPaciente} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
              <input type="text" placeholder="Nome Completo" value={formPaciente.nome} onChange={(e) => setFormPaciente({ ...formPaciente, nome: e.target.value })} required style={{ padding: '8px' }} />
              <input type="text" placeholder="CPF" value={formPaciente.cpf} onChange={(e) => setFormPaciente({ ...formPaciente, cpf: e.target.value })} style={{ padding: '8px' }} />
              <input type="text" placeholder="Telefone" value={formPaciente.telefone} onChange={(e) => setFormPaciente({ ...formPaciente, telefone: e.target.value })} style={{ padding: '8px' }} />
              <input type="date" value={formPaciente.data_nascimento} onChange={(e) => setFormPaciente({ ...formPaciente, data_nascimento: e.target.value })} style={{ padding: '8px' }} />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar Paciente</button>
            </form>
          </div>

          <h2><Users size={20} /> Lista de Pacientes</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pacientes.map((p) => (
              <li key={p.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.nome}</strong> <br />
                  <small>
                    <Phone size={14} /> {p.telefone || 'Sem telefone'} | CPF: {p.cpf || 'N/A'}
                  </small>
                  <br />
                  <small style={{ color: '#555' }}>
                    📅 Nasc.: {p.data_nascimento ? new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} ({calcularIdadeDetalhada(p.data_nascimento)})
                  </small>
                </div>
                <button
                  onClick={() => handleDeletarPaciente(p.id, p.nome)}
                  style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Trash2 size={16} /> Excluir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ABA AGENDAMENTOS */}
      {abaAtiva === 'agendamentos' && (
        <div>
          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h2><CalendarIcon size={20} /> Agendar Consulta</h2>
            <form onSubmit={handleSalvarAgendamento} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
              <select value={formAgendamento.paciente_id} onChange={(e) => setFormAgendamento({ ...formAgendamento, paciente_id: e.target.value })} required style={{ padding: '8px' }}>
                <option value="">Selecione um Paciente...</option>
                {pacientes.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </select>
              <input type="datetime-local" value={formAgendamento.data_hora} onChange={(e) => setFormAgendamento({ ...formAgendamento, data_hora: e.target.value })} required style={{ padding: '8px' }} />
              <input type="text" placeholder="Observações" value={formAgendamento.observacoes} onChange={(e) => setFormAgendamento({ ...formAgendamento, observacoes: e.target.value })} style={{ gridColumn: 'span 2', padding: '8px' }} />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirmar Agendamento</button>
            </form>
          </div>

          <div style={{ height: '600px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '30px' }}>
            <BigCalendar localizer={localizer} events={eventos} defaultView="week" views={['month', 'week', 'day']} min={new Date(2026, 0, 1, 8, 0)} max={new Date(2026, 0, 1, 22, 0)} culture="pt-BR" />
          </div>

          <h2><Clock size={20} /> Gerenciar Status das Consultas</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {agendamentos.map((a) => (
              <li key={a.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.paciente_nome}</strong> - <small>{a.telefone}</small><br />
                  <span>
                    <Clock size={14} /> {
                      new Date(a.data_hora).toLocaleString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                  </span> <br />
                  <small style={{ color: '#666' }}>Obs: {a.observacoes || 'Nenhuma'}</small> <br />
                  <span style={{ fontWeight: 'bold', color: a.status === 'realizado' ? 'green' : a.status === 'cancelado' ? 'red' : 'orange' }}>
                    Status: {a.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => atualizarStatus(a.id, 'realizado')} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                    <CheckCircle size={14} /> Realizada
                  </button>
                  <button onClick={() => atualizarStatus(a.id, 'cancelado')} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                    <XCircle size={14} /> Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ABA PRONTUÁRIO E EXAMES */}
      {abaAtiva === 'prontuario' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Selecione o Paciente:</label>
            <select
              value={pacienteSelecionadoId}
              onChange={(e) => setPacienteSelecionadoId(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px' }}
            >
              <option value="">-- Escolha um Paciente para Ver o Histórico --</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {pacienteSelecionadoId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Form de Evolução de Prontuário */}
              <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h3><FileText size={18} /> Nova Anotação / Evolução</h3>
                <form onSubmit={handleSalvarProntuario} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    placeholder="Queixa Principal / Motivo da Consulta"
                    value={formProntuario.queixa_principal}
                    onChange={(e) => setFormProntuario({ ...formProntuario, queixa_principal: e.target.value })}
                    rows={3} style={{ padding: '8px' }} required
                  />
                  <textarea
                    placeholder="Diagnóstico Quiroprático / Testes Positivos"
                    value={formProntuario.diagnostico_quiropratico}
                    onChange={(e) => setFormProntuario({ ...formProntuario, diagnostico_quiropratico: e.target.value })}
                    rows={3} style={{ padding: '8px' }}
                  />
                  <textarea
                    placeholder="Conduta / Ajustes Realizados"
                    value={formProntuario.conduta_tratamento}
                    onChange={(e) => setFormProntuario({ ...formProntuario, conduta_tratamento: e.target.value })}
                    rows={3} style={{ padding: '8px' }}
                  />
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Salvar Evolução
                  </button>
                </form>
              </div>

              {/* Form de Upload de Exames */}
              <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h3><Upload size={18} /> Anexar Exames ou Documentos</h3>
                <form onSubmit={handleUploadDocumento} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text" placeholder="Título (ex: Raio-X Coluna Cervical)"
                    value={formDoc.titulo}
                    onChange={(e) => setFormDoc({ ...formDoc, titulo: e.target.value })}
                    required style={{ padding: '8px' }}
                  />
                  <input
                    type="file"
                    onChange={(e) => setFormDoc({ ...formDoc, arquivo: e.target.files[0] })}
                    required style={{ padding: '8px' }}
                  />
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Enviar Arquivo
                  </button>
                </form>
              </div>

              {/* HISTÓRICO DE ANOTAÇÕES */}
              <div style={{ gridColumn: 'span 2', marginTop: '20px' }}>
                <h2>Histórico Clínico do Paciente</h2>
                
                <h3>Anotações / Evoluções</h3>
                {historico.prontuarios.length === 0 ? <p>Nenhuma anotação registrada.</p> : (
                  historico.prontuarios.map((pront) => (
                    <div key={pront.id} style={{ border: '1px solid #ddd', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <small style={{ color: '#666' }}>Data: {new Date(pront.data_atendimento).toLocaleString('pt-BR')}</small>
                        <p style={{ margin: '5px 0' }}><strong>Queixa:</strong> {pront.queixa_principal}</p>
                        <p style={{ margin: '5px 0' }}><strong>Diagnóstico:</strong> {pront.diagnostico_quiropratico || 'Não especificado'}</p>
                        <p style={{ margin: '5px 0' }}><strong>Ajustes / Conduta:</strong> {pront.conduta_tratamento || 'Não especificado'}</p>
                      </div>
                      <button
                        onClick={() => handleDeletarProntuario(pront.id)}
                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  ))
                )}

                <h3 style={{ marginTop: '30px' }}>Exames e Anexos</h3>
                {historico.documentos.length === 0 ? <p>Nenhum documento anexado.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {historico.documentos.map((doc) => (
                      <li key={doc.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <File size={16} /> <strong>{doc.titulo}</strong>
                          <br /><small style={{ color: '#666' }}>Enviado em: {new Date(doc.data_envio).toLocaleDateString('pt-BR')}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <a href={`http://localhost:3001${doc.caminho_arquivo}`} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontWeight: 'bold' }}>
                            Visualizar / Download
                          </a>
                          <button
                            onClick={() => handleDeletarDocumento(doc.id)}
                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default App;