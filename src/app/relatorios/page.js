// src/app/relatorios/page.js
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Header from '@/components/Header/Header';
import styles from './relatorios.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import API_URL from '@/services/api';

// Componente interno para lidar com a lógica que usa useSearchParams
const RelatoriosContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funcionarioBusca, setFuncionarioBusca] = useState('');
  const [marcacoesFiltradas, setMarcacoesFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Função para buscar dados da API
  const fetchMarcacoes = useCallback(async (page = 1, filters) => {
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
      if (filters.funcionarioBusca) params.append('funcionarioNome', filters.funcionarioBusca); // O backend pode filtrar por nome
      
      const response = await fetch(`${API_URL}/marcacoes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) router.push('/login');
        throw new Error('Falha ao carregar marcações.');
      }

      const data = await response.json();
      
      // Paginação no lado do cliente, pois a API de marcações não retorna paginação
      const totalItems = data.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage));
      
      const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);
      setMarcacoesFiltradas(paginatedData);
      setCurrentPage(page);

    } catch (err) {
      console.error('Erro ao buscar marcações:', err);
      setError('Não foi possível carregar as marcações. Tente novamente.');
      setMarcacoesFiltradas([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Efeito para buscar os dados quando o componente montar ou os filtros mudarem
  useEffect(() => {
    // Pega o nome do funcionário da URL, se existir
    const funcFromQuery = searchParams.get('funcionario');
    if (funcFromQuery) {
      setFuncionarioBusca(funcFromQuery);
    }
    // Define um período padrão (últimos 7 dias)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDataInicio(startDate);
    setDataFim(endDate);
    
    fetchMarcacoes(1, { 
      dataInicio: startDate, 
      dataFim: endDate, 
      funcionarioBusca: funcFromQuery || '' 
    });
  }, [fetchMarcacoes, searchParams]);

  const handleFiltrar = () => {
    fetchMarcacoes(1, { dataInicio, dataFim, funcionarioBusca });
  };

  const handlePageChange = (newPage) => {
    // A paginação ocorre no lado do cliente, então apenas atualizamos os dados exibidos
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Re-chamar fetchMarcacoes para aplicar a paginação
      fetchMarcacoes(newPage, { dataInicio, dataFim, funcionarioBusca });
    }
  };
  
  const handleExport = async () => {
    alert('Iniciando exportação... Isso pode levar um momento.');
    setLoading(true);
    // Para exportar todos os dados, fazemos uma nova chamada sem paginação
    const token = localStorage.getItem('jwtToken');
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('startDate', dataInicio);
      if (dataFim) params.append('endDate', dataFim);
      if (funcionarioBusca) params.append('funcionarioNome', funcionarioBusca);

      const response = await fetch(`${API_URL}/marcacoes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar dados para exportação.');
      
      const allData = await response.json();

      if (allData.length === 0) {
        alert('Nenhum dado encontrado para exportar com os filtros selecionados.');
        return;
      }

      const headers = ["Matrícula", "Nome", "Escala", "Data/Hora da Marcação", "Origem", "Data Extração"];
      const rows = allData.map(m => [
        m.funcionario.matricula,
        m.funcionario.nome,
        m.funcionario.escala,
        `${new Date(m.dataMarcacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} ${m.horaMarcacao}`,
        m.origem,
        new Date(m.dataExtracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})
      ]);

      let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "relatorio_marcacoes.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      setError('Não foi possível exportar os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.relatoriosMain}>
      <h1 className={styles.pageTitle}>Relatório de Marcações de Ponto</h1>

      <section className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="dataInicio" className={styles.label}>Data Início:</label>
          <input type="date" id="dataInicio" className={styles.input} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="dataFim" className={styles.label}>Data Fim:</label>
          <input type="date" id="dataFim" className={styles.input} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="funcionarioBusca" className={styles.label}>Funcionário:</label>
          <input type="text" id="funcionarioBusca" className={styles.input} placeholder="Nome ou Matrícula" value={funcionarioBusca} onChange={(e) => setFuncionarioBusca(e.target.value)} />
        </div>
        <button onClick={handleFiltrar} className={styles.filterButton} disabled={loading}>
          {loading ? 'Filtrando...' : 'Filtrar'}
        </button>
        <button onClick={handleExport} className={styles.exportButton} disabled={loading}>
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
              ) : marcacoesFiltradas.length > 0 ? (
                marcacoesFiltradas.map((marcacao) => (
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
            Página {currentPage} de {totalPages}
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
      <Suspense fallback={<div>Carregando filtros...</div>}>
        <RelatoriosContent />
      </Suspense>
    </div>
  );
}