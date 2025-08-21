// src/app/funcionarios/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header/Header';
import styles from './funcionarios.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

export default function GestaoFuncionariosPage() {
  const router = useRouter();
  const [buscaTermo, setBuscaTermo] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Modal de Adicionar/Editar Funcionário
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentFuncionario, setCurrentFuncionario] = useState(null);
  const [formValues, setFormValues] = useState({
    matricula: '',
    nome: '',
    escala: '',
    cargo: '',
    contrato: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Função para buscar dados da API
  const fetchFuncionarios = useCallback(async (page = 1, termoBusca = '') => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Constrói a URL com query params para busca e paginação
      const params = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
      });
      if (termoBusca) {
        // O backend espera 'nome' ou 'matricula', vamos enviar para ambos
        params.append('nome', termoBusca);
        // Se o termo de busca for numérico, podemos assumir que é uma matrícula
        if (!isNaN(termoBusca)) {
            params.append('matricula', termoBusca);
        }
      }

      const response = await fetch(`${API_URL}/funcionarios?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if ([401, 403].includes(response.status)) router.push('/login');
        throw new Error('Falha ao carregar funcionários.');
      }

      const data = await response.json();
      setFuncionarios(data.funcionarios);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
      setTotalItems(data.total);
      setCurrentPage(data.page);

    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
      setError('Não foi possível carregar os funcionários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFuncionarios(1, buscaTermo);
  }, [fetchFuncionarios]);

  const handleBusca = () => {
    fetchFuncionarios(1, buscaTermo);
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchFuncionarios(newPage, buscaTermo);
    }
  };

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
        body: JSON.stringify(formValues),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Falha ao ${currentFuncionario ? 'atualizar' : 'adicionar'} funcionário.`);
      }

      alert(`Funcionário ${currentFuncionario ? 'atualizado' : 'adicionado'} com sucesso!`);
      closeFormModal();
      fetchFuncionarios(currentPage, buscaTermo); // Recarrega a lista

    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (funcionario) => {
    if (!confirm(`Tem certeza que deseja ${funcionario.ativo ? 'DESATIVAR' : 'ATIVAR'} o funcionário ${funcionario.nome}?`)) {
        return;
    }
    
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_URL}/funcionarios/${funcionario.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...funcionario, ativo: !funcionario.ativo }), // Envia todos os dados com o status 'ativo' invertido
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao alterar status do funcionário.');
        }

        alert(`Funcionário ${!funcionario.ativo ? 'ativado' : 'desativado'} com sucesso!`);
        fetchFuncionarios(currentPage, buscaTermo); // Recarrega a lista

    } catch (err) {
      console.error('Erro ao alternar status:', err);
      setError(err.message); // Exibe o erro na tela principal
    }
  };


  return (
    <div>
      <Header />
      <main className={styles.funcionariosMain}>
        <h1 className={styles.pageTitle}>Gestão de Funcionários</h1>

        <section className={styles.topControls}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por Nome ou Matrícula"
              value={buscaTermo}
              onChange={(e) => setBuscaTermo(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleBusca(); }}
            />
            <button onClick={handleBusca} className={styles.searchButton} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <button onClick={openAddModal} className={styles.addEmployeeButton}>
            Adicionar Novo Funcionário
          </button>
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
                ) : funcionarios.length > 0 ? (
                  funcionarios.map((func) => (
                    <tr key={func.id}>
                      <td>{func.matricula}</td>
                      <td>{func.nome}</td>
                      <td>{func.escala}</td>
                      <td>{func.cargo}</td>
                      <td>{func.contrato}</td>
                      <td className={func.ativo ? styles.statusActive : styles.statusInactive}>
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </td>
                      <td className={styles.actions}>
                        <button onClick={() => openEditModal(func)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                        <button onClick={() => handleToggleActive(func)} className={`${styles.actionButton} ${func.ativo ? styles.deactivateButton : styles.activateButton}`}>
                          {func.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <Link href={`/relatorios?funcionario=${func.nome}`} passHref legacyBehavior>
                          <a className={`${styles.actionButton} ${styles.viewMarksButton}`}>Marcações</a>
                        </Link>
                        <Link href={`/inconsistencias?funcionario=${func.nome}`} passHref legacyBehavior>
                          <a className={`${styles.actionButton} ${styles.viewInconsistenciesButton}`}>Inconsist.</a>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className={styles.noData}>Nenhum funcionário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totalItems > 0 && (
          <section className={styles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className={styles.paginationButton}>
              Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {currentPage} de {totalPages} ({totalItems} registros)
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loading} className={styles.paginationButton}>
              Próxima
            </button>
          </section>
        )}
      </main>

      {isFormModalOpen && (
        <div className={styles.modalOverlay} onClick={closeFormModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {currentFuncionario ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}
            </h2>
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
                <button type="submit" className={styles.saveButton} disabled={formLoading}>
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}