// src/app/usuarios/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header/Header';
import styles from './usuarios.module.css';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

const ITEMS_PER_PAGE = 10;
const papeisDisponiveis = ['admin', 'supervisor', 'user'];
const statusDisponiveis = [{ label: 'Todos', value: ''}, { label: 'Ativo', value: 'true'}, { label: 'Inativo', value: 'false'}];

export default function GestaoUsuariosPage() {
  const router = useRouter();

  // --- ESTADOS ---
  const [allUsuarios, setAllUsuarios] = useState([]);
  const [displayedUsuarios, setDisplayedUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ termoBusca: '', papel: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formValues, setFormValues] = useState({ nome: '', email: '', senha: '', role: 'user', ativo: true });
  const [confirmSenha, setConfirmSenha] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // --- CARREGAMENTO INICIAL DE DADOS ---
  useEffect(() => {
    const fetchAllUsuarios = async () => {
      setLoading(true); setError(null);
      const token = localStorage.getItem('jwtToken');
      if (!token) { router.push('/login'); return; }
      try {
        const response = await fetch(`${API_URL}/usuarios?limit=10000`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            if (response.status === 403) throw new Error('Acesso negado. Você não tem permissão para ver os usuários.');
            throw new Error('Falha ao carregar usuários.');
        }
        const data = await response.json();
        setAllUsuarios(data.usuarios || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllUsuarios();
  }, [router]);

  // --- LÓGICA DE FILTRAGEM E PAGINAÇÃO NO FRONT-END ---
  const filteredUsuarios = useMemo(() => {
    return allUsuarios.filter(user => {
      const termoBuscaLower = filtros.termoBusca.toLowerCase();
      return (
        (filtros.termoBusca === '' || user.nome.toLowerCase().includes(termoBuscaLower) || user.email.toLowerCase().includes(termoBuscaLower)) &&
        (filtros.papel === '' || user.role === filtros.papel) &&
        (filtros.status === '' || String(user.ativo) === filtros.status)
      );
    });
  }, [allUsuarios, filtros]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    setDisplayedUsuarios(filteredUsuarios.slice(startIndex, startIndex + ITEMS_PER_PAGE));
  }, [filteredUsuarios, currentPage]);

  // --- HANDLERS ---
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };
  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(filteredUsuarios.length / ITEMS_PER_PAGE);
    if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
  };

  // --- FUNÇÕES DO MODAL E AÇÕES ---
  const openAddModal = () => {
    setCurrentUser(null);
    setFormValues({ nome: '', email: '', senha: '', role: 'user', ativo: true });
    setConfirmSenha(''); setFormError(null); setIsFormModalOpen(true);
  };
  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormValues({ ...user, senha: '' });
    setConfirmSenha(''); setFormError(null); setIsFormModalOpen(true);
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
      setFormError('As senhas não coincidem.'); return;
    }
    if (!currentUser && !formValues.senha) {
      setFormError('A senha é obrigatória para novos usuários.'); return;
    }

    setFormLoading(true);
    const token = localStorage.getItem('jwtToken');
    const method = currentUser ? 'PUT' : 'POST';
    const url = currentUser ? `${API_URL}/usuarios/${currentUser.id}` : `${API_URL}/usuarios`;
    
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
      if (currentUser) {
        setAllUsuarios(prev => prev.map(u => u.id === currentUser.id ? responseData.data : u));
      } else {
        window.location.reload();
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDeleteUsuario = async (user) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR o usuário ${user.nome}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    const token = localStorage.getItem('jwtToken');
    try {
      const response = await fetch(`${API_URL}/usuarios/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir o usuário.');
      }
      alert('Usuário excluído com sucesso!');
      setAllUsuarios(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
        // Exibe o erro na interface principal, pois o modal não estará mais visível
        setError(err.message || 'Ocorreu um erro ao excluir o usuário.');
    }
  };

  const totalItems = filteredUsuarios.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div>
      <Header />
      <main className={styles.usuariosMain}>
        <h1 className={styles.pageTitle}>Gestão de Usuários</h1>
        <section className={styles.topControls}>
          <div className={styles.searchContainer}>
            <input type="text" name="termoBusca" className={styles.searchInput} placeholder="Buscar por Nome ou E-mail..." value={filtros.termoBusca} onChange={handleFiltroChange} />
          </div>
          <button onClick={openAddModal} className={styles.addUserButton}>Adicionar Novo Usuário</button>
        </section>
        <section className={styles.filterContainer}>
            <select name="papel" className={styles.filterSelect} value={filtros.papel} onChange={handleFiltroChange}>
                <option value="">Todos os Papéis</option>
                {papeisDisponiveis.map(papel => <option key={papel} value={papel}>{papel.charAt(0).toUpperCase() + papel.slice(1)}</option>)}
            </select>
            <select name="status" className={styles.filterSelect} value={filtros.status} onChange={handleFiltroChange}>
                {statusDisponiveis.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
        </section>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <section className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            <table className={styles.usuariosTable}>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className={styles.noData}>Carregando...</td></tr>
                ) : displayedUsuarios.length > 0 ? (
                  displayedUsuarios.map((user) => (
                    <tr key={user.id}>
                      <td>{user.nome}</td><td>{user.email}</td><td>{user.role}</td>
                      <td className={user.ativo ? styles.statusActive : styles.statusInactive}>{user.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className={styles.actions}>
                        <button onClick={() => openEditModal(user)} className={`${styles.actionButton} ${styles.editButton}`}>Editar</button>
                        <button onClick={() => handleDeleteUsuario(user)} className={`${styles.actionButton} ${styles.deactivateButton}`}>Excluir</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className={styles.noData}>Nenhum usuário encontrado para os filtros selecionados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {totalItems > 0 && (
          <section className={styles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.paginationButton}>Anterior</button>
            <span className={styles.pageInfo}>Página {currentPage} de {totalPages} ({totalItems} registros)</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.paginationButton}>Próxima</button>
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
              <div className={styles.inputGroup}><label htmlFor="senha" className={styles.label}>{currentUser ? 'Nova Senha (deixe em branco para não alterar):' : 'Senha:'}</label><input type="password" id="senha" name="senha" className={styles.input} value={formValues.senha} onChange={handleFormChange} required={!currentUser} /></div>
              <div className={styles.inputGroup}><label htmlFor="confirmSenha" className={styles.label}>Confirmar Senha:</label><input type="password" id="confirmSenha" name="confirmSenha" className={styles.input} value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} required={!currentUser || formValues.senha !== ''} /></div>
              <div className={styles.inputGroup}><label htmlFor="role" className={styles.label}>Papel:</label><select id="role" name="role" className={styles.input} value={formValues.role} onChange={handleFormChange} required>{papeisDisponiveis.map(papel => (<option key={papel} value={papel}>{papel.charAt(0).toUpperCase() + papel.slice(1)}</option>))}</select></div>
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