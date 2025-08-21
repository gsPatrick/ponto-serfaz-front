// src/app/funcionarios/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header/Header';
import styles from './funcionarios.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

const ITEMS_PER_PAGE = 10;

export default function GestaoFuncionariosPage() {
  const router = useRouter();

  // --- ESTADOS ---

  // Estado para a lista COMPLETA de funcionários, vinda da API
  const [allFuncionarios, setAllFuncionarios] = useState([]);
  // Estado para a lista FILTRADA E PAGINADA que será exibida na tela
  const [displayedFuncionarios, setDisplayedFuncionarios] = useState([]);

  // Estado centralizado para os filtros
  const [filtros, setFiltros] = useState({
    termoBusca: '', // Nome ou Matrícula
    escala: '',
    cargo: '',
    contrato: '',
    status: '', // '', 'true', 'false'
  });

  // Estados para popular os dropdowns de filtro dinamicamente
  const [escalaOptions, setEscalaOptions] = useState([]);
  const [cargoOptions, setCargoOptions] = useState([]);
  const [contratoOptions, setContratoOptions] = useState([]);
  
  // Outros estados da UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados do Modal (sem alteração na lógica)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentFuncionario, setCurrentFuncionario] = useState(null);
  const [formValues, setFormValues] = useState({ matricula: '', nome: '', escala: '', cargo: '', contrato: '', ativo: true });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);


  // --- CARREGAMENTO INICIAL DE DADOS ---
  useEffect(() => {
    const fetchAllFuncionarios = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        // Buscamos TODOS os funcionários (ou um limite muito alto) para filtrar no front-end
        const response = await fetch(`${API_URL}/funcionarios?limit=10000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar a lista de funcionários.');
        
        const data = await response.json();
        const funcionariosData = data.funcionarios || [];
        setAllFuncionarios(funcionariosData);

        // Popula as opções dos filtros com base nos dados recebidos
        const getUniqueOptions = (key) => [...new Set(funcionariosData.map(f => f[key]).filter(Boolean))].sort();
        setEscalaOptions(getUniqueOptions('escala'));
        setCargoOptions(getUniqueOptions('cargo'));
        setContratoOptions(getUniqueOptions('contrato'));

      } catch (err) {
        setError('Não foi possível carregar os funcionários.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllFuncionarios();
  }, [router]);


  // --- LÓGICA DE FILTRAGEM E PAGINAÇÃO (Executada a cada mudança nos filtros ou dados) ---
  const filteredFuncionarios = useMemo(() => {
    return allFuncionarios.filter(func => {
      const termoBuscaLower = filtros.termoBusca.toLowerCase();
      // Combina todos os filtros com lógica AND
      return (
        // Filtro de busca por Nome/Matrícula
        (filtros.termoBusca === '' || 
         func.nome.toLowerCase().includes(termoBuscaLower) || 
         func.matricula.includes(filtros.termoBusca)) &&
        // Filtro de Escala
        (filtros.escala === '' || func.escala === filtros.escala) &&
        // Filtro de Cargo
        (filtros.cargo === '' || func.cargo === filtros.cargo) &&
        // Filtro de Contrato
        (filtros.contrato === '' || func.contrato === filtros.contrato) &&
        // Filtro de Status
        (filtros.status === '' || String(func.ativo) === filtros.status)
      );
    });
  }, [allFuncionarios, filtros]);

  // Efeito para atualizar a lista exibida quando a lista filtrada ou a página mudam
  useEffect(() => {
    setTotalItems(filteredFuncionarios.length);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setDisplayedFuncionarios(filteredFuncionarios.slice(startIndex, endIndex));
  }, [filteredFuncionarios, currentPage]);


  // --- HANDLERS ---
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reseta para a primeira página ao aplicar qualquer filtro
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };


  // --- Funções do Modal e Ações ---
  const openAddModal = () => {
    setCurrentFuncionario(null);
    setFormValues({ matricula: '', nome: '', escala: '', cargo: '', contrato: '', ativo: true });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (funcionario) => {
    setCurrentFuncionario(funcionario);
    setFormValues(funcionario);
    setFormError(null);
    setIsFormModalOpen(true);
  };
  
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setCurrentFuncionario(null);
  };
  
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleSaveFuncionario = async (e) => {
    e.preventDefault();
    setFormLoading(true); 
    setFormError(null);
    const token = localStorage.getItem('jwtToken');
    const method = currentFuncionario ? 'PUT' : 'POST';
    const url = currentFuncionario ? `${API_URL}/funcionarios/${currentFuncionario.id}` : `${API_URL}/funcionarios`;
    try {
      const response = await fetch(url, { 
        method, 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formValues) 
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || 'Falha ao salvar funcionário.');
      alert('Operação realizada com sucesso!');
      closeFormModal();
      // Recarrega a página para garantir que a lista e os filtros sejam atualizados
      window.location.reload(); 
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (funcionario) => {
    if (!confirm(`Tem certeza que deseja ${funcionario.ativo ? 'DESATIVAR' : 'ATIVAR'} ${funcionario.nome}?`)) return;
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_URL}/funcionarios/${funcionario.id}`, { 
        method: 'PUT', 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...funcionario, ativo: !funcionario.ativo }) 
      });
      if (!response.ok) throw new Error('Falha ao alterar status.');
      alert('Status alterado com sucesso!');
      // Atualiza o estado localmente para uma resposta mais rápida da UI
      setAllFuncionarios(prev => prev.map(f => f.id === funcionario.id ? { ...f, ativo: !f.ativo } : f));
    } catch (err) {
      setError(err.message);
    }
  };

  // --- RENDERIZAÇÃO ---
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div>
      <Header />
      <main className={styles.funcionariosMain}>
        <h1 className={styles.pageTitle}>Gestão de Funcionários</h1>

        <section className={styles.topControls}>
          <div className={styles.searchContainer}>
            <input
              type="text" name="termoBusca" className={styles.searchInput}
              placeholder="Buscar por Nome ou Matrícula..."
              value={filtros.termoBusca} onChange={handleFiltroChange}
            />
          </div>
          <button onClick={openAddModal} className={styles.addEmployeeButton}>
            Adicionar Novo Funcionário
          </button>
        </section>

        {/* ÁREA DE FILTROS COM DROPDOWNS */}
        <section className={styles.filterContainer}>
          <select name="escala" className={styles.filterSelect} value={filtros.escala} onChange={handleFiltroChange}>
            <option value="">Todas as Escalas</option>
            {escalaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select name="cargo" className={styles.filterSelect} value={filtros.cargo} onChange={handleFiltroChange}>
            <option value="">Todos os Cargos</option>
            {cargoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select name="contrato" className={styles.filterSelect} value={filtros.contrato} onChange={handleFiltroChange}>
            <option value="">Todos os Contratos</option>
            {contratoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select name="status" className={styles.filterSelect} value={filtros.status} onChange={handleFiltroChange}>
            <option value="">Todos os Status</option>
            <option value="true">Apenas Ativos</option>
            <option value="false">Apenas Inativos</option>
          </select>
        </section>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <section className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            <table className={styles.funcionariosTable}>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Nome</th>
                  <th>Escala</th>
                  <th>Cargo</th>
                  <th>Contrato</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className={styles.noData}>Carregando...</td></tr>
                ) : displayedFuncionarios.length > 0 ? (
                  displayedFuncionarios.map((func) => (
                    <tr key={func.id}>
                      <td>{func.matricula}</td>
                      <td>{func.nome}</td>
                      <td>{func.escala}</td>
                      <td>{func.cargo}</td>
                      <td>{func.contrato}</td>
                      <td className={func.ativo ? styles.statusActive : styles.statusInactive}>{func.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className={styles.actions}>
                        <button onClick={() => openEditModal(func)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                        <button onClick={() => handleToggleActive(func)} className={`${styles.actionButton} ${func.ativo ? styles.deactivateButton : styles.activateButton}`}>{func.ativo ? 'Desativar' : 'Ativar'}</button>
                        <Link href={`/relatorios?funcionario=${func.nome}`} passHref legacyBehavior><a className={`${styles.actionButton} ${styles.viewMarksButton}`}>Marcações</a></Link>
                        <Link href={`/inconsistencias?funcionario=${func.nome}`} passHref legacyBehavior><a className={`${styles.actionButton} ${styles.viewInconsistenciesButton}`}>Inconsist.</a></Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className={styles.noData}>Nenhum funcionário encontrado para os filtros selecionados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totalItems > 0 && (
          <section className={styles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className={styles.paginationButton}>Anterior</button>
            <span className={styles.pageInfo}>Página {currentPage} de {totalPages} ({totalItems} registros)</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loading} className={styles.paginationButton}>Próxima</button>
          </section>
        )}
      </main>

      {isFormModalOpen && (
        <div className={styles.modalOverlay} onClick={closeFormModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{currentFuncionario ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</h2>
            <form onSubmit={handleSaveFuncionario}>
              <div className={styles.inputGroup}>
                <label htmlFor="matricula" className={styles.label}>Matrícula:</label>
                <input type="text" id="matricula" name="matricula" className={styles.input} value={formValues.matricula} onChange={handleFormChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="nome" className={styles.label}>Nome:</label>
                <input type="text" id="nome" name="nome" className={styles.input} value={formValues.nome} onChange={handleFormChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="escala" className={styles.label}>Escala:</label>
                <input type="text" id="escala" name="escala" className={styles.input} value={formValues.escala} onChange={handleFormChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="cargo" className={styles.label}>Cargo:</label>
                <input type="text" id="cargo" name="cargo" className={styles.input} value={formValues.cargo} onChange={handleFormChange} />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="contrato" className={styles.label}>Contrato:</label>
                <input type="text" id="contrato" name="contrato" className={styles.input} value={formValues.contrato} onChange={handleFormChange} />
              </div>
              <div className={styles.inputGroup}>
                <input type="checkbox" id="ativo" name="ativo" checked={formValues.ativo} onChange={handleFormChange} className={styles.checkbox} />
                <label htmlFor="ativo" className={styles.checkboxLabel}>Ativo</label>
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