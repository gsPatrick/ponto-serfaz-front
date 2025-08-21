// src/app/login/page.js
'use client'; // Marca como Client Component para interatividade

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import Link from 'next/link';
import API_URL from '@/services/api'; // ALTERAÇÃO: Importando a URL base da API

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // ALTERAÇÃO: Adicionado estado de loading
  const router = useRouter();

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });

      const responseData = await response.json();

      if (response.ok) {
        // ESTA LINHA ESTÁ CORRETA E VAI FUNCIONAR APÓS A MUDANÇA NO BACKEND
        const { token, user } = responseData.data;
        
        localStorage.setItem('jwtToken', token);
        // O objeto 'user' que vem da API já está no formato correto
        localStorage.setItem('userData', JSON.stringify(user));

        router.push('/dashboard');
      } else {
        setError(responseData.message || 'E-mail ou senha inválidos');
      }
    } catch (apiError) {
      console.error('Erro ao conectar com a API:', apiError);
      setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Bem-vindo!</h1>
        <p className={styles.subtitle}>Faça login para continuar</p>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>E-mail</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading} // ALTERAÇÃO: Desabilita durante o loading
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Senha</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={styles.input}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading} // ALTERAÇÃO: Desabilita durante o loading
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading} // ALTERAÇÃO: Desabilita durante o loading
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'} {/* ALTERAÇÃO: Feedback de loading no botão */}
          </button>

          {/* Opcional: Link de Esqueceu a Senha */}
          <Link href="/esqueceu-senha" className={styles.forgotPasswordLink}>
            Esqueceu a senha?
          </Link>
        </form>
      </div>
    </div>
  );
}