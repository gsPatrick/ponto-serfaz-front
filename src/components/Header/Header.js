// src/components/Header/Header.js
'use client'; 

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // ALTERAÇÃO: Adicionado useRouter
import styles from './Header.module.css';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Usuário'); // ALTERAÇÃO: Estado para o nome do usuário
  const pathname = usePathname();
  const router = useRouter(); // ALTERAÇÃO: Hook para redirecionamento

  // ALTERAÇÃO: Efeito para buscar os dados do usuário do localStorage no lado do cliente
  useEffect(() => {
    try {
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        // Pega o primeiro nome para uma saudação mais curta
        setUserName(userData.nome.split(' ')[0]);
      }
    } catch (error) {
      console.error("Erro ao ler dados do usuário do localStorage:", error);
      // Mantém o nome padrão se houver erro
    }
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  // ALTERAÇÃO: Função de Logout
  const handleLogout = () => {
    // Limpa os dados de autenticação do localStorage
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userData');
    // Redireciona para a página de login
    router.push('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <Link href="/dashboard" className={styles.logoLink} onClick={closeMobileMenu}>
            Sistema de Ponto
          </Link>
        </div>
        <button
          className={styles.hamburgerMenu}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Abrir/Fechar Menu"
        >
          <div className={styles.hamburgerIcon}></div>
          <div className={styles.hamburgerIcon}></div>
          <div className={styles.hamburgerIcon}></div>
        </button>
      </div>

      <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.navOpen : ''}`}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Dashboard
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/relatorios" className={`${styles.navLink} ${pathname === '/relatorios' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Relatórios
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/inconsistencias" className={`${styles.navLink} ${pathname === '/inconsistencias' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Inconsistências
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/funcionarios" className={`${styles.navLink} ${pathname === '/funcionarios' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Funcionários
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/usuarios" className={`${styles.navLink} ${pathname === '/usuarios' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Usuários (Admin)
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/feriados" className={`${styles.navLink} ${pathname === '/feriados' ? styles.activeLink : ''}`} onClick={closeMobileMenu}>
              Feriados
            </Link>
          </li>
        </ul>
      </nav>

      <div className={styles.userActions}>
        {/* ALTERAÇÃO: Saudação personalizada */}
        <span className={styles.userName}>Olá, {userName}!</span>
        {/* ALTERAÇÃO: Botão de logout funcional */}
        <button onClick={handleLogout} className={styles.logoutButton}>Sair</button>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu}></div>
      )}
    </header>
  );
};

export default Header;