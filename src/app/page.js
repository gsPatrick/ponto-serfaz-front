// src/app/page.js
'use client'; // Marca como Client Component para usar useRouter

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Importa useRouter do Next.js 13+ App Router

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a página de login
    router.push('/login');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px', color: '#444444' }}>
      Carregando...
    </div>
  );
}