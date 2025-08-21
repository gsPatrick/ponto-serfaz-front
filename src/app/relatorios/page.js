// src/app/relatorios/page.js
'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import Header from '@/components/Header/Header';
import styles from './relatorios.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import API_URL from '@/services/api';

const ITEMS_PER_PAGE = 10;

// Componente interno para a lógica principal
const RelatoriosContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- ESTADOS ---
  const [allMarcacoes, setAllMarcacoes] = useState([]);
  const [filtros, setFiltros] = useState({
    dataInicio: '', dataFim: '',
    termoBusca: '', // Nome ou Matrícula
    escala: '', cargo: '', contrato: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // --- CARREGAMENTO DE DADOS ---
  const fetchAllMarcacoes = useCallback(async (currentFilters) => {
    setLoading(true); setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) { router.push('/login'); return; }
    try {
      const params = new URLSearchParams();
      if (currentFilters.dataInicio) params.append('startDate', currentFilters.dataInicio);
      if (currentFilters.dataFim) params.append('endDate', currentFilters.dataFim);
      
      const response = await fetch(`${API_URL}/marcacoes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar marcações.');
      
      const data = await response.json();
      setAllMarcacoes(data);
      setCurrentPage(1);
    } catch (err) {
      setError('Não foi possível carregar as marcações. Tente novamente.');
      setAllMarcacoes([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Efeito para a busca inicial
  useEffect(() => {
    const funcFromQuery = searchParams.get('funcionario') || '';
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const initialFilters = { dataInicio: startDate, dataFim: endDate, termoBusca: funcFromQuery, escala: '', cargo: '', contrato: '' };
    setFiltros(initialFilters);
    fetchAllMarcacoes(initialFilters);
  }, [searchParams, fetchAllMarcacoes]);

  // --- LÓGICA DE FILTRAGEM E PAGINAÇÃO NO FRONT-END ---
  const filteredMarcacoes = useMemo(() => {
    return allMarcacoes.filter(marcacao => {
        const funcionario = marcacao.funcionario;
        if (!funcionario) return false;

        const termoBuscaLower = filtros.termoBusca.toLowerCase();
        const escalaLower = filtros.escala.toLowerCase();
        const cargoLower = filtros.cargo.toLowerCase();
        const contratoLower = filtros.contrato.toLowerCase();

        return (
            (filtros.termoBusca === '' || funcionario.nome.toLowerCase().includes(termoBuscaLower) || funcionario.matricula.includes(filtros.termoBusca)) &&
            (filtros.escala === '' || (funcionario.escala && funcionario.escala.toLowerCase().includes(escalaLower))) &&
            (filtros.cargo === '' || (funcionario.cargo && funcionario.cargo.toLowerCase().includes(cargoLower))) &&
            (filtros.contrato === '' || (funcionario.contrato && funcionario.contrato.toLowerCase().includes(contratoLower)))
        );
    });
  }, [allMarcacoes, filtros]);

  const paginatedMarcacoes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMarcacoes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMarcacoes, currentPage]);
  
  const totalPages = Math.ceil(filteredMarcacoes.length / ITEMS_PER_PAGE);

  // --- HANDLERS ---
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleBuscarPorDataClick = () => {
    fetchAllMarcacoes(filtros);
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
  };
  
  const handleExport = () => {
    if (filteredMarcacoes.length === 0) {
      alert('Nenhum dado para exportar com os filtros atuais.');
      return;
    }
    alert('Iniciando exportação...');
    try {
      const headers = ["Matrícula", "Nome", "Escala", "Cargo", "Contrato", "Data/Hora da Marcação", "Origem", "Data Extração"];
      const rows = filteredMarcacoes.map(m => [
        `"${m.funcionario.matricula}"`, `"${m.funcionario.nome}"`, `"${m.funcionario.escala}"`,
        `"${m.funcionario.cargo || ''}"`, `"${m.funcionario.contrato || ''}"`,
        `"${new Date(m.dataMarcacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} ${m.horaMarcacao}"`,
        `"${m.origem}"`, `"${new Date(m.dataExtracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}"`
      ]);

      let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_marcacoes_${filtros.dataInicio}_a_${filtros.dataFim}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Não foi possível exportar os dados.');
    }
  };

  return (
    <main className={styles.relatoriosMain}>
      <h1 className={styles.pageTitle}>Relatório de Marcações de Ponto</h1>

      <section className={styles.topControls}>
        <div className={styles.filterGroup}>
          <label htmlFor="dataInicio" className={styles.label}>Data Início:</label>
          <input type="date" id="dataInicio" name="dataInicio" className={styles.input} value={filtros.dataInicio} onChange={handleFiltroChange} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dataFim" className={styles.label}>Data Fim:</label>
          <input type="date" id="dataFim" name="dataFim" className={styles.input} value={filtros.dataFim} onChange={handleFiltroChange} />
        </div>
        <button onClick={handleBuscarPorDataClick} className={styles.filterButton} disabled={loading}>{loading ? 'Buscando...' : 'Buscar por Data'}</button>
        <button onClick={handleExport} className={styles.exportButton} disabled={loading || filteredMarcacoes.length === 0}>Exportar CSV</button>
      </section>

      <section className={styles.filterContainer}>
        <input type="text" name="termoBusca" placeholder="Filtrar por Nome/Matrícula..." className={styles.filterInput} value={filtros.termoBusca} onChange={handleFiltroChange} />
        <input type="text" name="escala" placeholder="Filtrar por Escala..." className={styles.filterInput} value={filtros.escala} onChange={handleFiltroChange} />
        <input type="text" name="cargo" placeholder="Filtrar por Cargo..." className={styles.filterInput} value={filtros.cargo} onChange={handleFiltroChange} />
        <input type="text" name="contrato" placeholder="Filtrar por Contrato..." className={styles.filterInput} value={filtros.contrato} onChange={handleFiltroChange} />
      </section>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <table className={styles.marcacoesTable}>
            <thead>
              <tr>
                <th>Matrícula</th><th>Nome</th><th>Escala</th><th>Cargo</th><th>Contrato</th>
                <th>Data/Hora da Marcação</th><th>Origem</th><th>Data Extração</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className={styles.noData}>Carregando...</td></tr>
              ) : paginatedMarcacoes.length > 0 ? (
                paginatedMarcacoes.map((marcacao) => (
                  <tr key={marcacao.id}>
                    <td>{marcacao.funcionario.matricula}</td><td>{marcacao.funcionario.nome}</td><td>{marcacao.funcionario.escala}</td>
                    <td>{marcacao.funcionario.cargo}</td><td>{marcacao.funcionario.contrato}</td>
                    <td>{`${new Date(marcacao.dataMarcacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} ${marcacao.horaMarcacao}`}</td>
                    <td>{marcacao.origem}</td><td>{new Date(marcacao.dataExtracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className={styles.noData}>Nenhuma marcação encontrada para os critérios selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {totalPages > 1 && (
        <section className={styles.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.paginationButton}>Anterior</button>
          <span className={styles.pageInfo}>Página {currentPage} de {totalPages} ({filteredMarcacoes.length} registros)</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.paginationButton}>Próxima</button>
        </section>
      )}
    </main>
  );
};

// Componente principal
export default function RelatoriosPage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div style={{padding: '2rem', textAlign: 'center'}}>Carregando...</div>}>
        <RelatoriosContent />
      </Suspense>
    </div>
  );
}