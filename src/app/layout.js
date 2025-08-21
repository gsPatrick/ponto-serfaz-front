// src/app/layout.js
import './globals.css'; // Importa os estilos globais
import Head from 'next/head'; // Removido para App Router, mas deixo como comentário para referência

export const metadata = {
  title: 'Sistema de Ponto',
  description: 'Sistema de Coleta e Análise de Registros de Ponto',
  // ADICIONAR OU AJUSTAR ESTAS PROPRIEDADES DE VIEWPORT
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  // Opcional: Adicione links para fontes diretamente aqui se preferir
  // link: [
  //   {
  //     rel: 'stylesheet',
  //     href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Muli:wght@400&family=Roboto:wght@400;700&display=swap',
  //   },
  // ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      {/* Removemos o <Head> aqui, pois a metadata acima cuida disso no App Router */}
      <body>{children}</body>
    </html>
  );
}