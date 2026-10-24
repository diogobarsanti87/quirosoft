import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { UserPlus, Users, Calendar as CalendarIcon, Phone, Clock, FileText, Upload, File, Trash2, DollarSign, Package, AlertCircle } from 'lucide-react';
import logoImg from './assets/logo.png';



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
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());

  // Estados de Prontuário
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState('');
  const [historico, setHistorico] = useState({ prontuarios: [], documentos: [] });
  const [formProntuario, setFormProntuario] = useState({ queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: '' });
  const [formDoc, setFormDoc] = useState({ titulo: '', arquivo: null });

  // Estados Financeiros e Planos
  const [planosPaciente, setPlanosPaciente] = useState([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState({ total_agendamentos: 0, total_planos: 0, faturamento_total: 0 });
  const [formPlano, setFormPlano] = useState({ paciente_id: '', tipo_plano: 'Pacote 10 Sessões', total_consultas: 10, valor_total: '' });

  // Formulários
  const [formPaciente, setFormPaciente] = useState({ nome: '', cpf: '', telefone: '', data_nascimento: '' });
  const [formAgendamento, setFormAgendamento] = useState({
    paciente_id: '', data_hora: '', observacoes: '', tipo_consulta: 'Consulta Avulsa', valor_pago: '', plano_paciente_id: ''
  });

  const API_URL = 'http://localhost:3001/api';

  const fetchPacientes = async () => {
    try {
      setErroCarregamento(false);
      const res = await axios.get(`${API_URL}/pacientes`);
      if (Array.isArray(res.data)) {
        setPacientes(res.data);
      } else {
        setPacientes([]);
      }
    } catch (err) { 
      console.error('Erro ao buscar pacientes:', err); 
      setErroCarregamento(true);
      setPacientes([]);
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const res = await axios.get(`${API_URL}/agendamentos`);
      if (Array.isArray(res.data)) {
        setAgendamentos(res.data);
      } else {
        setAgendamentos([]);
      }
    } catch (err) { 
      console.error('Erro ao buscar agendamentos:', err); 
      setAgendamentos([]);
    }
  };

  const fetchHistoricoPaciente = async (id) => {
    if (!id) {
      setHistorico({ prontuarios: [], documentos: [] });
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/pacientes/${id}/historico`);
      setHistorico({
        prontuarios: Array.isArray(res.data?.prontuarios) ? res.data.prontuarios : [],
        documentos: Array.isArray(res.data?.documentos) ? res.data.documentos : []
      });
    } catch (err) { 
      console.error('Erro ao buscar histórico:', err);
      setHistorico({ prontuarios: [], documentos: [] });
    }
  };

  const fetchPlanosDoPaciente = async (id) => {
    if (!id) return;
    try {
      const res = await axios.get(`${API_URL}/paciente-planos/${id}`);
      setPlanosPaciente(Array.isArray(res.data) ? res.data : []);
    } catch (err) { 
      console.error('Erro ao buscar planos:', err);
      setPlanosPaciente([]);
    }
  };

  const fetchResumoFinanceiro = async () => {
    try {
      const res = await axios.get(`${API_URL}/financeiro/resumo`);
      setResumoFinanceiro(res.data || { total_agendamentos: 0, total_planos: 0, faturamento_total: 0 });
    } catch (err) { console.error('Erro ao buscar resumo financeiro:', err); }
  };

  const handleDeletarAgendamento = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta consulta?')) {
      try {
        await axios.delete(`${API_URL}/agendamentos/${id}`);
        await fetchAgendamentos();
        await fetchResumoFinanceiro();
      } catch (err) {
        console.error('Erro ao excluir agendamento:', err);
        alert('Erro ao excluir a consulta. Verifique o console ou a conexão com o servidor.');
      }
    }
  };

  const atualizarStatus = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/agendamentos/${id}/status`, { status });
      await fetchAgendamentos();
      await fetchResumoFinanceiro();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPacientes();
    fetchAgendamentos();
    fetchResumoFinanceiro();
  }, []);

  useEffect(() => {
    if (pacienteSelecionadoId) {
      fetchHistoricoPaciente(pacienteSelecionadoId);
      fetchPlanosDoPaciente(pacienteSelecionadoId);
    } else {
      setHistorico({ prontuarios: [], documentos: [] });
    }
  }, [pacienteSelecionadoId]);

  const handleSalvarPaciente = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/pacientes`, formPaciente);
      setFormPaciente({ nome: '', cpf: '', telefone: '', data_nascimento: '' });
      fetchPacientes();
    } catch (err) {
      alert('Erro ao salvar paciente.');
    }
  };

  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();
    try {
      const valorTratado = String(formAgendamento.valor_pago || '0').replace(',', '.');

      const dadosParaEnviar = {
        paciente_id: Number(formAgendamento.paciente_id),
        data_hora: formAgendamento.data_hora,
        observacoes: formAgendamento.observacoes || '',
        tipo_consulta: formAgendamento.tipo_consulta || 'Consulta Avulsa',
        valor_pago: isNaN(parseFloat(valorTratado)) ? 0 : parseFloat(valorTratado),
        plano_paciente_id: formAgendamento.plano_paciente_id ? Number(formAgendamento.plano_paciente_id) : null
      };

      await axios.post(`${API_URL}/agendamentos`, dadosParaEnviar);

      setFormAgendamento({
        paciente_id: '',
        data_hora: '',
        observacoes: '',
        tipo_consulta: 'Consulta Avulsa',
        valor_pago: '',
        plano_paciente_id: ''
      });

      await fetchAgendamentos();
      await fetchResumoFinanceiro();

    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Erro ao salvar agendamento. Verifique os campos preenchidos.');
    }
  };

  const handleSalvarPlano = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/paciente-planos`, formPlano);
      alert('Plano de Cuidado registrado com sucesso!');
      setFormPlano({ paciente_id: '', tipo_plano: 'Pacote 10 Sessões', total_consultas: 10, valor_total: '' });
      fetchResumoFinanceiro();
      if (formPlano.paciente_id) fetchPlanosDoPaciente(formPlano.paciente_id);
    } catch (err) {
      alert('Erro ao registrar plano.');
    }
  };

  const handleDeletarPaciente = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja excluir o paciente ${nome} e todo o seu histórico?`)) {
      try {
        await axios.delete(`${API_URL}/pacientes/${id}`);
        if (pacienteSelecionadoId === String(id)) {
          setPacienteSelecionadoId('');
          setHistorico({ prontuarios: [], documentos: [] });
        }
        await fetchPacientes();
        await fetchAgendamentos();
        await fetchResumoFinanceiro();
      } catch (err) { 
        console.error('Erro ao excluir paciente:', err);
        alert('Não foi possível excluir o paciente.');
      }
    }
  };

  const handleDeletarProntuario = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta anotação?')) {
      await axios.delete(`${API_URL}/prontuarios/${id}`);
      fetchHistoricoPaciente(pacienteSelecionadoId);
    }
  };

  const handleDeletarDocumento = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      await axios.delete(`${API_URL}/documentos/${id}`);
      fetchHistoricoPaciente(pacienteSelecionadoId);
    }
  };

  const handleSalvarProntuario = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId) return alert('Selecione um paciente!');
    try {
      await axios.post(`${API_URL}/prontuarios`, { paciente_id: pacienteSelecionadoId, ...formProntuario });
      setFormProntuario({ queixa_principal: '', diagnostico_quiropratico: '', conduta_tratamento: '' });
      fetchHistoricoPaciente(pacienteSelecionadoId);
    } catch (err) { alert('Erro ao salvar anotação.'); }
  };

  const handleUploadDocumento = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionadoId || !formDoc.arquivo) return alert('Selecione o paciente e o arquivo!');
    try {
      const formData = new FormData();
      formData.append('paciente_id', pacienteSelecionadoId);
      formData.append('titulo', formDoc.titulo);
      formData.append('arquivo', formDoc.arquivo);
      await axios.post(`${API_URL}/documentos/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormDoc({ titulo: '', arquivo: null });
      fetchHistoricoPaciente(pacienteSelecionadoId);
    } catch (err) { alert('Erro no envio do documento.'); }
  };

  const calcularIdadeDetalhada = (dataNascimento) => {
    if (!dataNascimento) return 'Idade não informada';
    
    const dataLimpa = dataNascimento.split('T')[0];
    const partes = dataLimpa.split('-');
    if (partes.length !== 3) return 'Data inválida';

    const [ano, mes, dia] = partes.map(Number);
    const nascimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    if (isNaN(nascimento.getTime())) return 'Data inválida';

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();

    if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
      anos--;
      meses += 12;
    }

    if (hoje.getDate() < nascimento.getDate() && meses > 0) {
      meses--;
    }

    return `${anos === 1 ? '1 ano' : `${anos} anos`} e ${meses === 1 ? '1 mês' : `${meses} meses`}`;
  };

  const formatarData = (dataNascimento) => {
    if (!dataNascimento) return 'Não informada';
    const dataLimpa = dataNascimento.split('T')[0];
    const partes = dataLimpa.split('-');
    if (partes.length !== 3) return 'Não informada';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const eventos = agendamentos.map((a) => {
    const dataString = a.data_hora ? a.data_hora.replace(' ', 'T') : new Date();
    const inicio = new Date(dataString);
    
    const tipo = (a.tipo_consulta || '').trim();
    
    let duracaoEmMinutos = 15;
    if (tipo === 'Avaliação' || tipo === 'Avaliacao') {
      duracaoEmMinutos = 45;
    }

    const fim = new Date(inicio.getTime() + duracaoEmMinutos * 60 * 1000);

    return {
      id: a.id,
      title: `${a.paciente_nome} (${tipo || 'Consulta'})`,
      start: inicio,
      end: fim,
      status: a.status
    };
  });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
    

      {/* ALERTA DE ERRO DE CONEXÃO COM O BACKEND */}
      {erroCarregamento && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>Não foi possível conectar ao servidor (http://localhost:3001). Verifique se o terminal do Backend/Node.js está em execução.</span>
        </div>
      )}

      {/* MENU NAVEGAÇÃO */}
     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
  {/* Logo da Clínica */}
  <img 
    src={logoImg} 
    alt="Logo" 
    style={{ height: '40px', width: 'auto', marginRight: '10px' }} 
  />

  <button 
    onClick={() => setAbaAtiva('pacientes')} 
    style={{ 
      padding: '10px 20px', 
      cursor: 'pointer', 
      borderRadius: '5px', 
      border: 'none', 
      backgroundColor: abaAtiva === 'pacientes' ? '#007bff' : '#e0e0e0', 
      color: abaAtiva === 'pacientes' ? 'white' : 'black' 
    }}
  >
    Pacientes
  </button>

  <button 
    onClick={() => setAbaAtiva('agendamentos')} 
    style={{ 
      padding: '10px 20px', 
      cursor: 'pointer', 
      borderRadius: '5px', 
      border: 'none', 
      backgroundColor: abaAtiva === 'agendamentos' ? '#007bff' : '#e0e0e0', 
      color: abaAtiva === 'agendamentos' ? 'white' : 'black' 
    }}
  >
    Agendamentos
  </button>

  <button 
    onClick={() => setAbaAtiva('prontuario')} 
    style={{ 
      padding: '10px 20px', 
      cursor: 'pointer', 
      borderRadius: '5px', 
      border: 'none', 
      backgroundColor: abaAtiva === 'prontuario' ? '#007bff' : '#e0e0e0', 
      color: abaAtiva === 'prontuario' ? 'white' : 'black' 
    }}
  >
    Prontuário & Exames
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
          {pacientes.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhum paciente cadastrado até o momento.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {pacientes.map((p) => (
                <li key={p.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{p.nome}</strong> <br />
                    <small><Phone size={14} /> {p.telefone || 'Sem telefone'} | CPF: {p.cpf || 'N/A'}</small><br />
                    <small style={{ color: '#555' }}>
                      📅 Nasc.: {formatarData(p.data_nascimento)} ({calcularIdadeDetalhada(p.data_nascimento)})
                    </small>
                  </div>
                  <button onClick={() => handleDeletarPaciente(p.id, p.nome)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={16} /> Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ABA AGENDAMENTOS */}
      {abaAtiva === 'agendamentos' && (
        <div>
          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h2><CalendarIcon size={20} /> Agendar Consulta</h2>
            <form onSubmit={handleSalvarAgendamento} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
              <select value={formAgendamento.paciente_id} onChange={(e) => {
                setFormAgendamento({ ...formAgendamento, paciente_id: e.target.value });
                fetchPlanosDoPaciente(e.target.value);
              }} required style={{ padding: '8px' }}>
                <option value="">Selecione um Paciente...</option>
                {pacientes.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </select>

              <input type="datetime-local" value={formAgendamento.data_hora} onChange={(e) => setFormAgendamento({ ...formAgendamento, data_hora: e.target.value })} required style={{ padding: '8px' }} />

              <select 
                value={formAgendamento.tipo_consulta} 
                onChange={(e) => setFormAgendamento({ ...formAgendamento, tipo_consulta: e.target.value })} 
                style={{ padding: '8px' }}
              >
                <option value="Avaliação">Avaliação</option>
                <option value="Consulta Avulsa">Consulta Avulsa</option>
                <option value="Plano de Cuidado">Plano de Cuidado (Pacote)</option>
              </select>

              {formAgendamento.tipo_consulta === 'Plano de Cuidado' ? (
                <select value={formAgendamento.plano_paciente_id} onChange={(e) => setFormAgendamento({ ...formAgendamento, plano_paciente_id: e.target.value })} required style={{ padding: '8px' }}>
                  <option value="">Selecione o Pacote Ativo...</option>
                  {planosPaciente.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.tipo_plano} ({plano.consultas_restantes}/{plano.total_consultas} restantes)
                    </option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  placeholder="Valor Pago (R$)" 
                  value={formAgendamento.valor_pago} 
                  onChange={(e) => setFormAgendamento({ ...formAgendamento, valor_pago: e.target.value })} 
                  style={{ padding: '8px' }} 
                />
              )}

              <input type="text" placeholder="Observações" value={formAgendamento.observacoes} onChange={(e) => setFormAgendamento({ ...formAgendamento, observacoes: e.target.value })} style={{ gridColumn: 'span 2', padding: '8px' }} />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Confirmar Agendamento</button>
            </form>
          </div>

          <div style={{ height: '600px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '30px' }}>
            <BigCalendar 
              localizer={localizer} 
              events={eventos} 
              view={view}
              onView={(novaView) => setView(novaView)}
              date={date}
              onNavigate={(novaData) => setDate(novaData)}
              views={['month', 'week', 'day']} 
              culture="pt-BR"
              min={new Date(0, 0, 0, 8, 0, 0)}
              max={new Date(0, 0, 0, 21, 0, 0)}
            />
          </div>

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
                    <span style={{ fontWeight: 'bold', color: '#007bff' }}>Tipo: {a.tipo_consulta || 'N/A'}</span>
                    {a.valor_pago > 0 && <span> | Pago: R$ {a.valor_pago}</span>}<br />
                    <span><Clock size={14} /> {new Date(a.data_hora ? a.data_hora.replace(' ', 'T') : new Date()).toLocaleString('pt-BR')}</span> <br />
                    <small style={{ color: '#666' }}>Obs: {a.observacoes || 'Nenhuma'}</small> <br />
                    <span style={{ fontWeight: 'bold', color: a.status === 'realizado' ? 'green' : a.status === 'cancelado' ? 'red' : 'orange' }}>Status: {a.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => atualizarStatus(a.id, 'realizado')}
                      style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ✔ Realizada
                    </button>
                    <button
                      onClick={() => atualizarStatus(a.id, 'cancelado')}
                      style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ⊗ Cancelar
                    </button>
                    <button
                      onClick={() => handleDeletarAgendamento(a.id)}
                      style={{ backgroundColor: '#6c757d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </li>
              ))}
          </ul>

      {/* ABA PRONTUÁRIO E EXAMES */}
      {abaAtiva === 'prontuario' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Selecione o Paciente:</label>
            <select 
              value={pacienteSelecionadoId} 
              onChange={(e) => {
                const id = e.target.value;
                setPacienteSelecionadoId(id);
              }} 
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px' }}
            >
              <option value="">-- Escolha um Paciente para Ver o Histórico --</option>
              {pacientes.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
            </select>
          </div>

          {pacienteSelecionadoId ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h3><FileText size={18} /> Nova Anotação / Evolução</h3>
                <form onSubmit={handleSalvarProntuario} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea placeholder="Queixa Principal / Motivo da Consulta" value={formProntuario.queixa_principal} onChange={(e) => setFormProntuario({ ...formProntuario, queixa_principal: e.target.value })} rows={3} style={{ padding: '8px' }} required />
                  <textarea placeholder="Diagnóstico Quiroprático / Testes Positivos" value={formProntuario.diagnostico_quiropratico} onChange={(e) => setFormProntuario({ ...formProntuario, diagnostico_quiropratico: e.target.value })} rows={3} style={{ padding: '8px' }} />
                  <textarea placeholder="Conduta / Ajustes Realizados" value={formProntuario.conduta_tratamento} onChange={(e) => setFormProntuario({ ...formProntuario, conduta_tratamento: e.target.value })} rows={3} style={{ padding: '8px' }} />
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar Evolução</button>
                </form>
              </div>

              <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h3><Upload size={18} /> Anexar Exames ou Documentos</h3>
                <form onSubmit={handleUploadDocumento} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Título (ex: Raio-X Coluna Cervical)" value={formDoc.titulo} onChange={(e) => setFormDoc({ ...formDoc, titulo: e.target.value })} required style={{ padding: '8px' }} />
                  <input type="file" onChange={(e) => setFormDoc({ ...formDoc, arquivo: e.target.files[0] })} required style={{ padding: '8px' }} />
                  <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enviar Arquivo</button>
                </form>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '20px' }}>
                <h2>Histórico Clínico do Paciente</h2>
                <h3>Anotações / Evoluções</h3>
                {historico.prontuarios && historico.prontuarios.length > 0 ? (
                  historico.prontuarios.map((pront) => (
                    <div key={pront.id} style={{ border: '1px solid #ddd', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <small style={{ color: '#666' }}>Data: {new Date(pront.data_atendimento).toLocaleString('pt-BR')}</small>
                        <p style={{ margin: '5px 0' }}><strong>Queixa:</strong> {pront.queixa_principal}</p>
                        <p style={{ margin: '5px 0' }}><strong>Diagnóstico:</strong> {pront.diagnostico_quiropratico || 'Não especificado'}</p>
                        <p style={{ margin: '5px 0' }}><strong>Ajustes / Conduta:</strong> {pront.conduta_tratamento || 'Não especificado'}</p>
                      </div>
                      <button onClick={() => handleDeletarProntuario(pront.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhuma anotação registrada para este paciente.</p>
                )}

                <h3 style={{ marginTop: '30px' }}>Exames e Anexos</h3>
                {historico.documentos && historico.documentos.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {historico.documentos.map((doc) => (
                      <li key={doc.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <File size={16} /> <strong>{doc.titulo}</strong>
                          <br /><small style={{ color: '#666' }}>Enviado em: {new Date(doc.data_envio).toLocaleDateString('pt-BR')}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <a href={`http://localhost:3001${doc.caminho_arquivo}`} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontWeight: 'bold' }}>Visualizar / Download</a>
                          <button onClick={() => handleDeletarDocumento(doc.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhum documento anexado para este paciente.</p>
                )}
              </div>
            </div>
          ) : (
            <p style={{ padding: '20px', backgroundColor: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '6px', textAlign: 'center', color: '#666' }}>
              Selecione um paciente na lista acima para visualizar o histórico de evoluções e exames.
            </p>
          )}
        </div>
      )}

      {/* ABA FINANCEIRO */}
      {abaAtiva === 'financeiro' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#eef6ff' }}>
              <h3>Consultas Realizadas</h3>
              <h2>R$ {Number(resumoFinanceiro.total_agendamentos || 0).toFixed(2)}</h2>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#eefaf1' }}>
              <h3>Planos Vendidos</h3>
              <h2>R$ {Number(resumoFinanceiro.total_planos || 0).toFixed(2)}</h2>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#fff8e6' }}>
              <h3>Total Arrecadado</h3>
              <h2>R$ {Number(resumoFinanceiro.faturamento_total || 0).toFixed(2)}</h2>
            </div>
          </div>

          <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h2><Package size={20} /> Vender / Cadastrar Plano de Cuidado (Pacote)</h2>
            <form onSubmit={handleSalvarPlano} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
              <select value={formPlano.paciente_id} onChange={(e) => setFormPlano({ ...formPlano, paciente_id: e.target.value })} required style={{ padding: '8px' }}>
                <option value="">Selecione o Paciente...</option>
                {pacientes.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </select>

              <input type="text" placeholder="Nome do Plano (ex: Pacote 10 Sessões)" value={formPlano.tipo_plano} onChange={(e) => setFormPlano({ ...formPlano, tipo_plano: e.target.value })} required style={{ padding: '8px' }} />
              <input type="number" placeholder="Qtd. Consultas Compradas" value={formPlano.total_consultas} onChange={(e) => setFormPlano({ ...formPlano, total_consultas: Number(e.target.value) })} required style={{ padding: '8px' }} />
              <input type="number" placeholder="Valor Total do Pacote (R$)" value={formPlano.valor_total} onChange={(e) => setFormPlano({ ...formPlano, valor_total: e.target.value })} required style={{ padding: '8px' }} />

              <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Registrar Venda do Pacote</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;