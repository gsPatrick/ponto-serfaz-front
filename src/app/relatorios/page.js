// src/app/relatorios/page.js
'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import Header from '@/components/Header/Header';
import styles from './relatorios.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import API_URL from '@/services/api';

const ITEMS_PER_PAGE = 10;

// Componente interno para lidar com a lógica que usa useSearchParams
const RelatoriosContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- ESTADOS ---

  // Lista COMPLETA de marcações para o período selecionado, vinda da API
  const [allMarcacoes, setAllMarcacoes] = useState([]);
  
  // Estado centralizado para os filtros
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    funcionarioBusca: '', // Nome ou Matrícula
  });

  // Outros estados da UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // --- CARREGAMENTO INICIAL E RECARGA DE DADOS ---

  // Função para buscar TODOS os dados da API com base nos filtros
  const fetchAllMarcacoes = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (currentFilters.dataInicio) params.append('startDate', currentFilters.dataInicio);
      if (currentFilters.dataFim) params.append('endDate', currentFilters.dataFim);
      // O backend de marcações não suporta busca por nome, faremos no front-end
      
      const response = await fetch(`${API_URL}/marcacoes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) router.push('/login');
        throw new Error('Falha ao carregar marcações.');
      }

      const data = await response.json();
      setAllMarcacoes(data);
      setCurrentPage(1); // Sempre reseta a página ao buscar novos dados
    } catch (err) {
      console.error('Erro ao buscar marcações:', err);
      setError('Não foi possível carregar as marcações. Tente novamente.');
      setAllMarcacoes([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Efeito para a busca inicial no carregamento da página
  useEffect(() => {
    const funcFromQuery = searchParams.get('funcionario') || '';
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const initialFilters = { dataInicio: startDate, dataFim: endDate, funcionarioBusca: funcFromQuery };
    setFiltros(initialFilters);
    fetchAllMarcacoes(initialFilters);
  }, [searchParams, fetchAllMarcacoes]);


  // --- LÓGICA DE FILTRAGEM E PAGINAÇÃO NO FRONT-END ---

  const filteredMarcacoes = useMemo(() => {
    if (!filtros.funcionarioBusca) return allMarcacoes;
    const termoBuscaLower = filtros.funcionarioBusca.toLowerCase();
    return allMarcacoes.filter(marcacao => 
      marcacao.funcionario.nome.toLowerCase().includes(termoBuscaLower) ||
      marcacao.funcionario.matricula.includes(filtros.funcionarioBusca)
    );
  }, [allMarcacoes, filtros.funcionarioBusca]);

  const paginatedMarcacoes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMarcacoes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMarcacoes, currentPage]);
  
  const totalPages = Math.ceil(filteredMarcacoes.length / ITEMS_PER_PAGE);

  // --- HANDLERS ---

  const handleFiltroChange = (e) => {
    const { id, value } = e.target;
    setFiltros(prev => ({ ...prev, [id]: value }));
  };

  const handleFiltrarClick = () => {
    // A busca por funcionário é instantânea, mas a busca por data precisa de um clique para chamar a API
    fetchAllMarcacoes(filtros);
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const handleExport = () => {
    if (filteredMarcacoes.length === 0) {
      alert('Nenhum dado para exportar com os filtros atuais.');
      return;
    }
    
    alert('Iniciando exportação...');
    try {
      const headers = ["Matrícula", "Nome", "Escala", "Data/Hora da Marcação", "Origem", "Data Extração"];
      const rows = filteredMarcacoes.map(m => [
        `"${m.funcionario.matricula}"`, // Envolve em aspas para garantir formatação
        `"${m.funcionario.nome}"`,
        `"${m.funcionario.escala}"`,
        `"${new Date(m.dataMarcacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} ${m.horaMarcacao}"`,
        `"${m.origem}"`,
        `"${new Date(m.dataExtracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}"`
      ]);

      let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_marcacoes_${filtros.dataInicio}_a_${filtros.dataFim}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      setError('Não foi possível exportar os dados.');
    }
  };

  return (
    <main className={styles.relatoriosMain}>
      <h1 className={styles.pageTitle}>Relatório de Marcações de Ponto</h1>

      <section className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="dataInicio" className={styles.label}>Data Início:</label>
          <input type="date" id="dataInicio" className={styles.input} value={filtros.dataInicio} onChange={handleFiltroChange} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dataFim" className={styles.label}>Data Fim:</label>
          <input type="date" id="dataFim" className={styles.input} value={filtros.dataFim} onChange={handleFiltroChange} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="funcionarioBusca" className={styles.label}>Funcionário (filtro rápido):</label>
          <input type="text" id="funcionarioBusca" className={styles.input} placeholder="Nome ou Matrícula" value={filtros.funcionarioBusca} onChange={handleFiltroChange} />
        </div>
        <button onClick={handleFiltrarClick} className={styles.filterButton} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar por Data'}
        </button>
        <button onClick={handleExport} className={styles.exportButton} disabled={loading || filteredMarcacoes.length === 0}>
          Exportar CSV
        </button>
      </section>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <table className={styles.marcacoesTable}>
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome</th>
                <th>Escala</th>
                <th>Data/Hora da Marcação</th>
                <th>Origem</th>
                <th>Data Extração</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className={styles.noData}>Carregando...</td></tr>
              ) : paginatedMarcacoes.length > 0 ? (
                paginatedMarcacoes.map((marcacao) => (
                  <tr key={marcacao.id}>
                    <td>{marcacao.funcionario.matricula}</td>
                    <td>{marcacao.funcionario.nome}</td>
                    <td>{marcacao.funcionario.escala}</td>
                    <td>{`${new Date(marcacao.dataMarcacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} ${marcacao.horaMarcacao}`}</td>
                    <td>{marcacao.origem}</td>
                    <td>{new Date(marcacao.dataExtracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className={styles.noData}>Nenhuma marcação encontrada para os critérios selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {totalPages > 1 && (
        <section className={styles.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className={styles.paginationButton}>
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {currentPage} de {totalPages} ({filteredMarcacoes.length} registros)
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loading} className={styles.paginationButton}>
            Próxima
          </button>
        </section>
      )}
    </main>
  );
};

// Componente principal que envolve o conteúdo com Suspense
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