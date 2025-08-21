// src/app/inconsistencias/page.js
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Header from '@/components/Header/Header';
import styles from './inconsistencias.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import API_URL from '@/services/api';

// Mapeamento de status para classes CSS
const getStatusClass = (status) => {
  switch (status) {
    case 'Detectado': return styles.statusOpen;
    case 'Em Análise': return styles.statusInProgress;
    case 'Resolvido': return styles.statusResolved;
    default: return '';
  }
};

const tiposInconsistencia = [
  'Todos',
  'Ausência de Marcação',
  'Marcação Incompleta',
  'Intervalo de Almoço Insuficiente',
];

const statusInconsistencia = [
  'Todos',
  'Detectado',
  'Em Análise',
  'Resolvido',
];

// Componente interno para a lógica principal
const InconsistenciasContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados de Filtro
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funcionarioBusca, setFuncionarioBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  
  const [inconsistencias, setInconsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Modais
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInconsistencia, setSelectedInconsistencia] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [inconsistenciaToUpdate, setInconsistenciaToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusObservacoes, setStatusObservacoes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);


  const fetchInconsistencias = useCallback(async (page = 1, filters) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.dataInicio) params.append('dataReferencia', filters.dataInicio); // O backend pode usar a mesma data para início e fim se apenas uma for fornecida
      if (filters.dataFim) params.append('dataReferenciaFim', filters.dataFim); // Um param customizado para range seria melhor, mas adaptamos
      if (filters.funcionarioBusca) params.append('funcionarioNome', filters.funcionarioBusca);
      if (filters.statusFiltro && filters.statusFiltro !== 'Todos') params.append('status', filters.statusFiltro);
      if (filters.tipoFiltro && filters.tipoFiltro !== 'Todos') params.append('tipoInconsistencia', filters.tipoFiltro);

      const response = await fetch(`${API_URL}/inconsistencias?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) router.push('/login');
        throw new Error('Falha ao carregar inconsistências.');
      }

      const data = await response.json();
      
      const totalItems = data.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage));
      
      const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);
      setInconsistencias(paginatedData);
      setCurrentPage(page);

    } catch (err) {
      console.error('Erro ao buscar inconsistências:', err);
      setError('Não foi possível carregar as inconsistências. Tente novamente.');
      setInconsistencias([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const funcFromQuery = searchParams.get('funcionario');
    const initialFilters = {
      dataInicio: '',
      dataFim: '',
      funcionarioBusca: funcFromQuery || '',
      statusFiltro: 'Todos',
      tipoFiltro: 'Todos',
    };

    if (funcFromQuery) {
      setFuncionarioBusca(funcFromQuery);
    }
    
    fetchInconsistencias(1, initialFilters);
  }, [fetchInconsistencias, searchParams]);

  const handleFiltrar = () => {
    fetchInconsistencias(1, { dataInicio, dataFim, funcionarioBusca, statusFiltro, tipoFiltro });
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchInconsistencias(newPage, { dataInicio, dataFim, funcionarioBusca, statusFiltro, tipoFiltro });
    }
  };

  const openDetailsModal = (inconsistencia) => {
    setSelectedInconsistencia(inconsistencia);
    setIsDetailsModalOpen(true);
  };
  const closeDetailsModal = () => setIsDetailsModalOpen(false);

  const openStatusModal = (inconsistencia) => {
    setInconsistenciaToUpdate(inconsistencia);
    setNewStatus(inconsistencia.status);
    setStatusObservacoes(inconsistencia.observacoesResolucao || '');
    setFormError(null);
    setIsStatusModalOpen(true);
  };
  const closeStatusModal = () => setIsStatusModalOpen(false);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    const token = localStorage.getItem('jwtToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    try {
      const response = await fetch(`${API_URL}/inconsistencias/${inconsistenciaToUpdate.id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newStatus: newStatus,
          observacoes: statusObservacoes,
          resolvidoPorId: userData.id, // Envia o ID do usuário logado
        }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || 'Falha ao atualizar status.');
      
      alert('Status atualizado com sucesso!');
      closeStatusModal();
      fetchInconsistencias(currentPage, { dataInicio, dataFim, funcionarioBusca, statusFiltro, tipoFiltro });

    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <main className={styles.inconsistenciasMain}>
      <h1 className={styles.pageTitle}>Gestão de Inconsistências</h1>

      <section className={styles.filtersContainer}>
        <div className={styles.filterGroup}><label htmlFor="dataInicio" className={styles.label}>Data Ref. Início:</label><input type="date" id="dataInicio" className={styles.input} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
        <div className={styles.filterGroup}><label htmlFor="dataFim" className={styles.label}>Data Ref. Fim:</label><input type="date" id="dataFim" className={styles.input} value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        <div className={styles.filterGroup}><label htmlFor="funcionarioBusca" className={styles.label}>Funcionário:</label><input type="text" id="funcionarioBusca" className={styles.input} placeholder="Nome do Funcionário" value={funcionarioBusca} onChange={(e) => setFuncionarioBusca(e.target.value)} /></div>
        <div className={styles.filterGroup}><label htmlFor="statusFiltro" className={styles.label}>Status:</label><select id="statusFiltro" className={styles.input} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>{statusInconsistencia.map(status => (<option key={status} value={status}>{status}</option>))}</select></div>
        <div className={styles.filterGroup}><label htmlFor="tipoFiltro" className={styles.label}>Tipo:</label><select id="tipoFiltro" className={styles.input} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>{tiposInconsistencia.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}</select></div>
        <button onClick={handleFiltrar} className={styles.filterButton} disabled={loading}>{loading ? 'Filtrando...' : 'Filtrar'}</button>
      </section>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <table className={styles.inconsistenciasTable}>
            <thead><tr><th>Data Ref.</th><th>Funcionário</th><th>Tipo</th><th>Mensagem</th><th>Status</th><th>Detectado em</th><th>Ações</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className={styles.noData}>Carregando...</td></tr>
              ) : inconsistencias.length > 0 ? (
                inconsistencias.map((inc) => (
                  <tr key={inc.id}>
                    <td>{new Date(inc.dataReferencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td>{inc.funcionario.nome}</td>
                    <td>{inc.tipoInconsistencia}</td>
                    <td>{inc.mensagemGerada}</td>
                    <td className={getStatusClass(inc.status)}>{inc.status}</td>
                    <td>{new Date(inc.detectadoEm).toLocaleString('pt-BR')}</td>
                    <td className={styles.actions}>
                      <button onClick={() => openDetailsModal(inc)} className={`${styles.actionButton} ${styles.viewButton}`}>Detalhes</button>
                      <button onClick={() => openStatusModal(inc)} className={`${styles.actionButton} ${styles.changeStatusButton}`}>Mudar Status</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className={styles.noData}>Nenhuma inconsistência encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {totalPages > 1 && (
        <section className={styles.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className={styles.paginationButton}>Anterior</button>
          <span className={styles.pageInfo}>Página {currentPage} de {totalPages}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loading} className={styles.paginationButton}>Próxima</button>
        </section>
      )}

      {isDetailsModalOpen && selectedInconsistencia && (
        <div className={styles.modalOverlay} onClick={closeDetailsModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Detalhes da Inconsistência</h2>
            <p><strong>Data de Referência:</strong> {new Date(selectedInconsistencia.dataReferencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
            <p><strong>Funcionário:</strong> {selectedInconsistencia.funcionario.nome}</p>
            <p><strong>Tipo:</strong> {selectedInconsistencia.tipoInconsistencia}</p>
            <p><strong>Mensagem:</strong> {selectedInconsistencia.mensagemGerada}</p>
            <p><strong>Status:</strong> <span className={getStatusClass(selectedInconsistencia.status)}>{selectedInconsistencia.status}</span></p>
            <p><strong>Detectado em:</strong> {new Date(selectedInconsistencia.detectadoEm).toLocaleString('pt-BR')}</p>
            <p><strong>Observações:</strong> {selectedInconsistencia.observacoesResolucao || 'Nenhuma'}</p>
            <button onClick={closeDetailsModal} className={styles.modalCloseButton}>Fechar</button>
          </div>
        </div>
      )}

      {isStatusModalOpen && inconsistenciaToUpdate && (
        <div className={styles.modalOverlay} onClick={closeStatusModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Mudar Status da Inconsistência</h2>
            <form onSubmit={handleStatusUpdate}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Inconsistência:</label>
                <input type="text" className={styles.input} value={`${inconsistenciaToUpdate.funcionario.nome} - ${inconsistenciaToUpdate.tipoInconsistencia} (${new Date(inconsistenciaToUpdate.dataReferencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})`} readOnly disabled />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="newStatus" className={styles.label}>Novo Status:</label>
                <select id="newStatus" className={styles.input} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
                  {statusInconsistencia.filter(s => s !== 'Todos').map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="statusObservacoes" className={styles.label}>Observações:</label>
                <textarea id="statusObservacoes" className={styles.textarea} rows="4" placeholder="Adicione observações sobre a mudança de status..." value={statusObservacoes} onChange={(e) => setStatusObservacoes(e.target.value)}></textarea>
              </div>
              {formError && <p className={styles.errorMessage}>{formError}</p>}
              <div className={styles.modalActions}>
                <button type="button" onClick={closeStatusModal} className={styles.cancelButton}>Cancelar</button>
                <button type="submit" className={styles.saveButton} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default function GestaoInconsistenciasPage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div>Carregando...</div>}>
        <InconsistenciasContent />
      </Suspense>
    </div>
  );
}