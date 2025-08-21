// src/app/usuarios/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header/Header';
import styles from './usuarios.module.css';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

const papeisDisponiveis = ['admin', 'supervisor', 'user'];

export default function GestaoUsuariosPage() {
  const router = useRouter();
  const [buscaTermo, setBuscaTermo] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Paginação (controlada pelo backend)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formValues, setFormValues] = useState({ nome: '', email: '', senha: '', papel: 'user', status: true });
  const [confirmSenha, setConfirmSenha] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchUsuarios = useCallback(async (page = 1, termoBusca = '') => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({ page, limit: itemsPerPage });
      if (termoBusca) params.append('nome', termoBusca); // O backend filtra por nome ou email

      const response = await fetch(`${API_URL}/usuarios?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) router.push('/login');
        if (response.status === 403) throw new Error('Acesso negado. Você não tem permissão para ver os usuários.');
        throw new Error('Falha ao carregar usuários.');
      }

      const data = await response.json();
      setUsuarios(data.usuarios);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
      setCurrentPage(data.page);

    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError(err.message);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsuarios(1, '');
  }, [fetchUsuarios]);

  const handleBusca = () => {
    fetchUsuarios(1, buscaTermo);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchUsuarios(newPage, buscaTermo);
    }
  };

  const openAddModal = () => {
    setCurrentUser(null);
    setFormValues({ nome: '', email: '', senha: '', papel: 'user', status: true });
    setConfirmSenha('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormValues({ ...user, senha: '' }); // Limpa a senha por segurança
    setConfirmSenha('');
    setFormError(null);
    setIsFormModalOpen(true);
  };
  const closeFormModal = () => setIsFormModalOpen(false);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveUsuario = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (formValues.senha !== confirmSenha) {
      setFormError('As senhas não coincidem.');
      return;
    }
    if (!currentUser && !formValues.senha) {
      setFormError('A senha é obrigatória para novos usuários.');
      return;
    }

    setFormLoading(true);
    const token = localStorage.getItem('jwtToken');
    const method = currentUser ? 'PUT' : 'POST';
    const url = currentUser ? `${API_URL}/usuarios/${currentUser.id}` : `${API_URL}/usuarios`;
    
    // O backend não tem rota PUT, então vamos usar POST para criar e simular a edição localmente
    // Em um cenário real, você implementaria a rota PUT no backend
    
    // Para esta integração, vamos focar no POST
    if (currentUser) {
        alert("Funcionalidade de edição não implementada no backend. Demonstração apenas.");
        setFormLoading(false);
        return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || 'Falha ao salvar usuário.');

      alert(`Usuário ${currentUser ? 'atualizado' : 'adicionado'} com sucesso!`);
      closeFormModal();
      fetchUsuarios(currentPage, buscaTermo);

    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleToggleStatus = async (user) => {
    alert("Funcionalidade de ativar/desativar não implementada no backend. Demonstração apenas.");
    // Lógica futura:
    // const token = localStorage.getItem('jwtToken');
    // await fetch(`${API_URL}/usuarios/${user.id}`, { method: 'PUT', ... });
  };


  return (
    <div>
      <Header />
      <main className={styles.usuariosMain}>
        <h1 className={styles.pageTitle}>Gestão de Usuários</h1>

        <section className={styles.topControls}>
          <div className={styles.searchContainer}>
            <input type="text" className={styles.searchInput} placeholder="Buscar por Nome ou E-mail" value={buscaTermo} onChange={(e) => setBuscaTermo(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleBusca(); }} />
            <button onClick={handleBusca} className={styles.searchButton} disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
          </div>
          <button onClick={openAddModal} className={styles.addUserButton}>Adicionar Novo Usuário</button>
        </section>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <section className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            <table className={styles.usuariosTable}>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className={styles.noData}>Carregando...</td></tr>
                ) : usuarios.length > 0 ? (
                  usuarios.map((user) => (
                    <tr key={user.id}>
                      <td>{user.nome}</td><td>{user.email}</td><td>{user.role}</td>
                      <td className={user.ativo ? styles.statusActive : styles.statusInactive}>{user.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className={styles.actions}>
                        <button onClick={() => openEditModal(user)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                        <button onClick={() => handleToggleStatus(user)} className={`${styles.actionButton} ${user.ativo ? styles.deactivateButton : styles.activateButton}`}>
                          {user.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className={styles.noData}>Nenhum usuário encontrado.</td></tr>
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
            <h2 className={styles.modalTitle}>{currentUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2>
            <form onSubmit={handleSaveUsuario}>
              <div className={styles.inputGroup}><label htmlFor="nome" className={styles.label}>Nome:</label><input type="text" id="nome" name="nome" className={styles.input} value={formValues.nome} onChange={handleFormChange} required /></div>
              <div className={styles.inputGroup}><label htmlFor="email" className={styles.label}>E-mail:</label><input type="email" id="email" name="email" className={styles.input} value={formValues.email} onChange={handleFormChange} required /></div>
              <div className={styles.inputGroup}><label htmlFor="senha" className={styles.label}>{currentUser ? 'Nova Senha (opcional):' : 'Senha:'}</label><input type="password" id="senha" name="senha" className={styles.input} value={formValues.senha} onChange={handleFormChange} required={!currentUser} /></div>
              <div className={styles.inputGroup}><label htmlFor="confirmSenha" className={styles.label}>Confirmar Senha:</label><input type="password" id="confirmSenha" name="confirmSenha" className={styles.input} value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} required={!currentUser || formValues.senha !== ''} /></div>
              <div className={styles.inputGroup}><label htmlFor="papel" className={styles.label}>Papel:</label><select id="papel" name="role" className={styles.input} value={formValues.role} onChange={handleFormChange} required>{papeisDisponiveis.map(papel => (<option key={papel} value={papel}>{papel.charAt(0).toUpperCase() + papel.slice(1)}</option>))}</select></div>
              <div className={styles.inputGroup}><input type="checkbox" id="ativo" name="ativo" checked={formValues.ativo} onChange={handleFormChange} className={styles.checkbox} /><label htmlFor="ativo" className={styles.checkboxLabel}>Ativo</label></div>
              {formError && <p className={styles.errorMessage}>{formError}</p>}
              <div className={styles.modalActions}><button type="button" onClick={closeFormModal} className={styles.cancelButton}>Cancelar</button><button type="submit" className={styles.saveButton} disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}