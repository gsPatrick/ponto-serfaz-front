// src/app/feriados/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header/Header';
import styles from './feriados.module.css';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

const tiposFeriado = [
  'Todos',
  'Feriado Nacional',
  'Ponto Facultativo',
  'Feriado Municipal',
  'Feriado Estadual', // Adicionando mais opções
];

export default function GestaoFeriadosPage() {
  const router = useRouter();

  // Estados de Filtro
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFeriadoFiltro, setTipoFeriadoFiltro] = useState('Todos');
  
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formValues, setFormValues] = useState({ data: '', nome: '', tipo: 'Feriado Nacional' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchFeriados = useCallback(async (page = 1, filters) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.dataInicio) params.append('startDate', filters.dataInicio);
      if (filters.dataFim) params.append('endDate', filters.dataFim);
      if (filters.tipoFeriadoFiltro && filters.tipoFeriadoFiltro !== 'Todos') {
        params.append('tipo', filters.tipoFeriadoFiltro);
      }

      const response = await fetch(`${API_URL}/feriados?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) router.push('/login');
        throw new Error('Falha ao carregar feriados.');
      }

      const data = await response.json();
      
      const totalItems = data.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage));
      
      const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);
      setFeriados(paginatedData);
      setCurrentPage(page);

    } catch (err) {
      console.error('Erro ao buscar feriados:', err);
      setError('Não foi possível carregar os feriados. Tente novamente.');
      setFeriados([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const initialFilters = {
        dataInicio: `${currentYear}-01-01`,
        dataFim: `${currentYear}-12-31`,
        tipoFeriadoFiltro: 'Todos'
    };
    setDataInicio(initialFilters.dataInicio);
    setDataFim(initialFilters.dataFim);
    fetchFeriados(1, initialFilters);
  }, [fetchFeriados]);

  const handleFiltrar = () => {
    fetchFeriados(1, { dataInicio, dataFim, tipoFeriadoFiltro });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
        fetchFeriados(newPage, { dataInicio, dataFim, tipoFeriadoFiltro });
    }
  };

  const openAddModal = () => {
    setFormValues({ data: '', nome: '', tipo: 'Feriado Nacional' });
    setFormError(null);
    setIsFormModalOpen(true);
  };
  const closeFormModal = () => setIsFormModalOpen(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveFeriado = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    const token = localStorage.getItem('jwtToken');

    try {
      const response = await fetch(`${API_URL}/feriados`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || 'Falha ao adicionar feriado.');
      
      alert('Feriado adicionado com sucesso!');
      closeFormModal();
      handleFiltrar(); // Recarrega a lista com os filtros atuais
    } catch (err) {
      console.error('Erro ao salvar feriado:', err);
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className={styles.feriadosMain}>
        <h1 className={styles.pageTitle}>Gestão de Feriados e Pontos Facultativos</h1>

        <section className={styles.topControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="dataInicio" className={styles.label}>Data Início:</label>
            <input type="date" id="dataInicio" className={styles.input} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="dataFim" className={styles.label}>Data Fim:</label>
            <input type="date" id="dataFim" className={styles.input} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="tipoFeriadoFiltro" className={styles.label}>Tipo de Feriado:</label>
            <select id="tipoFeriadoFiltro" className={styles.input} value={tipoFeriadoFiltro} onChange={(e) => setTipoFeriadoFiltro(e.target.value)}>
              {tiposFeriado.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
            </select>
          </div>
          <button onClick={handleFiltrar} className={styles.filterButton} disabled={loading}>{loading ? 'Filtrando...' : 'Filtrar'}</button>
          <button onClick={openAddModal} className={styles.addHolidayButton}>Adicionar Novo Feriado</button>
        </section>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <section className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            <table className={styles.feriadosTable}>
              <thead><tr><th>Data</th><th>Nome do Feriado</th><th>Tipo</th>{/*<th>Ações</th>*/}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className={styles.noData}>Carregando...</td></tr>
                ) : feriados.length > 0 ? (
                  feriados.map((feriado) => (
                    <tr key={feriado.id}>
                      <td>{new Date(feriado.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td>{feriado.nome}</td>
                      <td>{feriado.tipo}</td>
                      {/*
                      <td className={styles.actions}>
                        <button className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                        <button className={`${styles.actionButton} ${styles.deleteButton}`}>Excluir</button>
                      </td>
                      */}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className={styles.noData}>Nenhum feriado encontrado.</td></tr>
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
      </main>

      {isFormModalOpen && (
        <div className={styles.modalOverlay} onClick={closeFormModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Adicionar Novo Feriado</h2>
            <form onSubmit={handleSaveFeriado}>
              <div className={styles.inputGroup}>
                <label htmlFor="data" className={styles.label}>Data:</label>
                <input type="date" id="data" name="data" className={styles.input} value={formValues.data} onChange={handleFormChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="nome" className={styles.label}>Nome do Feriado:</label>
                <input type="text" id="nome" name="nome" className={styles.input} value={formValues.nome} onChange={handleFormChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="tipo" className={styles.label}>Tipo:</label>
                <select id="tipo" name="tipo" className={styles.input} value={formValues.tipo} onChange={handleFormChange} required>
                  {tiposFeriado.filter(t => t !== 'Todos').map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
                </select>
              </div>
              {formError && <p className={styles.errorMessage}>{formError}</p>}
              <div className={styles.modalActions}>
                <button type="button" onClick={closeFormModal} className={styles.cancelButton}>Cancelar</button>
                <button type="submit" className={styles.saveButton} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}