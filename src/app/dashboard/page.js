// src/app/dashboard/page.js
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header/Header';
import styles from './dashboard.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import API_URL from '@/services/api';

// Importa ícones do React Icons (Font Awesome)
import {
  FaUsers,
  FaFileAlt,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaUserCog,
  FaCheckCircle,
  FaChartBar,
  FaClock,
  FaLightbulb,
  FaCog
} from 'react-icons/fa';

// Importa componentes do Recharts
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// Cores para os gráficos (baseadas na paleta fornecida)
const CHART_COLORS = [
  '#2D82B7', // Azul Médio (para barras)
  '#D32F2F', // Vermelho Rubi (Abertas)
  '#FFB300', // Âmbar (Em Análise)
  '#2E7D32', // Verde Esmeralda (Resolvidas)
  '#1E2A38', // Azul Noturno
  '#444444', // Grafite
];

// Helper para renderizar os rótulos do Pie Chart
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, fill }) => { // 1. Removido 'index', adicionado 'fill'
  if (percent === 0) return null;

  const RADIAN = Math.PI / 180;
  const isSmallChart = outerRadius < 90;
  const labelOffsetMultiplier = isSmallChart ? 1.08 : 1.15;
  const linePointOffset = isSmallChart ? 5 : 10;
  const textLineLength = isSmallChart ? 15 : 25;
  const xText = cx + outerRadius * labelOffsetMultiplier * Math.cos(-midAngle * RADIAN);
  const yText = cy + outerRadius * labelOffsetMultiplier * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;
  const mx = cx + (outerRadius + linePointOffset) * cos;
  const my = cy + (outerRadius + linePointOffset) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * textLineLength;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  const fontSize = isSmallChart ? '0.7rem' : '0.8rem';

  return (
    <g>
      {/* 2. Substituído CHART_COLORS[index + 1] por 'fill' */}
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * (isSmallChart ? 3 : 5)} y={ey} textAnchor={textAnchor} fill="var(--cor-grafite)" style={{ fontSize }}>
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

// Componente para exibir mensagem de "Sem Dados" sobreposto ao gráfico
const NoDataMessage = () => (
    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#aaa',
        fontSize: '0.9rem',
        textAlign: 'center',
    }}>
        Nenhum dado para exibir
    </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState({
    totalFuncionariosAtivos: 0,
    inconsistenciasAbertas: 0,
    inconsistenciasResolvidas: 0,
    ultimaDataScraping: 'Carregando...',
  });
  const [chartData, setChartData] = useState({
    inconsistenciasPorTipo: [],
    inconsistenciasPorStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasTipoData, setHasTipoData] = useState(false);
  const [hasStatusData, setHasStatusData] = useState(false);

  // Estados para o modal de detecção
  const [isDetectModalOpen, setIsDetectModalOpen] = useState(false);
  const [detectionDate, setDetectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState({ type: '', text: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const [funcionariosRes, inconsistenciasRes, marcacoesRes] = await Promise.all([
        fetch(`${API_URL}/funcionarios?ativo=true`, { headers }),
        fetch(`${API_URL}/inconsistencias`, { headers }),
        fetch(`${API_URL}/marcacoes`, { headers })
      ]);
      
      if (!funcionariosRes.ok || !inconsistenciasRes.ok || !marcacoesRes.ok) {
        if ([401, 403].includes(funcionariosRes.status) || [401, 403].includes(inconsistenciasRes.status) || [401, 403].includes(marcacoesRes.status)) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('userData');
          router.push('/login');
          return;
        }
        throw new Error('Falha ao buscar dados do servidor.');
      }

      const funcionariosData = await funcionariosRes.json();
      const inconsistenciasData = await inconsistenciasRes.json();
      const marcacoesData = await marcacoesRes.json();

      const inconsistenciasAbertas = inconsistenciasData.filter(inc => inc.status === 'Detectado' || inc.status === 'Em Análise').length;
      const inconsistenciasResolvidas = inconsistenciasData.filter(inc => inc.status === 'Resolvido').length;
      
      let ultimaData = 'N/A';
      if (marcacoesData.length > 0) {
        ultimaData = marcacoesData.reduce((max, p) => p.dataExtracao > max ? p.dataExtracao : max, marcacoesData[0].dataExtracao);
        ultimaData = new Date(ultimaData).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
      
      setKpis({
        totalFuncionariosAtivos: funcionariosData.total,
        inconsistenciasAbertas,
        inconsistenciasResolvidas,
        ultimaDataScraping: ultimaData,
      });

      const porTipo = inconsistenciasData.reduce((acc, inc) => { acc[inc.tipoInconsistencia] = (acc[inc.tipoInconsistencia] || 0) + 1; return acc; }, {});
      const porStatus = inconsistenciasData.reduce((acc, inc) => { acc[inc.status] = (acc[inc.status] || 0) + 1; return acc; }, {});
      const inconsistenciasPorTipoData = Object.entries(porTipo).map(([tipo, quantidade]) => ({ tipo, quantidade }));
      const inconsistenciasPorStatusData = [
        { name: 'Abertas', value: porStatus['Detectado'] || 0, color: CHART_COLORS[1] },
        { name: 'Em Análise', value: porStatus['Em Análise'] || 0, color: CHART_COLORS[2] },
        { name: 'Resolvidas', value: porStatus['Resolvido'] || 0, color: CHART_COLORS[3] },
      ];
      
      setChartData({
        inconsistenciasPorTipo: inconsistenciasPorTipoData,
        inconsistenciasPorStatus: inconsistenciasPorStatusData,
      });

      setHasTipoData(inconsistenciasPorTipoData.length > 0);
      setHasStatusData(inconsistenciasPorStatusData.reduce((sum, item) => sum + item.value, 0) > 0);

    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError('Não foi possível carregar os dados. Verifique sua conexão ou tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDetectInconsistencies = async () => {
    setDetectionLoading(true);
    setDetectionMessage({ type: '', text: '' });
    const token = localStorage.getItem('jwtToken');

    try {
      const response = await fetch(`${API_URL}/inconsistencias/detect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: detectionDate }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || 'Falha ao iniciar detecção.');
      
      setDetectionMessage({ type: 'success', text: `Detecção para ${new Date(detectionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} concluída! ${responseData.data.inconsistenciasDetectadas} novas inconsistências encontradas.` });
      fetchData(); // Recarrega os dados do dashboard
    } catch (err) {
      console.error('Erro ao detectar inconsistências:', err);
      setDetectionMessage({ type: 'error', text: err.message });
    } finally {
      setDetectionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Carregando dados do Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.reloadButton}>
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className={styles.dashboardMain}>
        <h1 className={styles.pageTitle}>Dashboard Principal</h1>

        <div className={styles.dashboardLayout}>
          <div className={styles.dashboardContent}>
            <section className={styles.kpiCards}>
              <div className={`${styles.kpiCard} ${styles.kpiCardActive}`}>
                <FaUsers className={styles.kpiIcon} />
                <h2 className={styles.kpiTitle}>Funcionários Ativos</h2>
                <p className={styles.kpiValue}>{kpis.totalFuncionariosAtivos}</p>
              </div>
              <div className={`${styles.kpiCard} ${styles.kpiCardWarning}`}>
                <FaExclamationTriangle className={styles.kpiIcon} />
                <h2 className={styles.kpiTitle}>Inconsistências Abertas</h2>
                <p className={styles.kpiValue}>{kpis.inconsistenciasAbertas}</p>
              </div>
              <div className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
                <FaCheckCircle className={styles.kpiIcon} />
                <h2 className={styles.kpiTitle}>Inconsistências Resolvidas</h2>
                <p className={styles.kpiValue}>{kpis.inconsistenciasResolvidas}</p>
              </div>
              <div className={`${styles.kpiCard} ${styles.kpiCardInfo}`}>
                <FaClock className={styles.kpiIcon} />
                <h2 className={styles.kpiTitle}>Última Extração</h2>
                <p className={styles.kpiValueSm}>{kpis.ultimaDataScraping}</p>
              </div>
            </section>

            <section className={styles.chartsSection}>
              <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>Inconsistências por Tipo</h2>
                {!hasTipoData && <NoDataMessage />}
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chartData.inconsistenciasPorTipo} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="tipo" tick={{ fill: 'var(--cor-grafite)' }} style={{ fontSize: '0.8rem' }} />
                    <YAxis tick={{ fill: 'var(--cor-grafite)' }} style={{ fontSize: '0.8rem' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--cor-branco-puro)', border: '1px solid #ddd' }} />
                    <Bar dataKey="quantidade" fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>Inconsistências por Status</h2>
                {!hasStatusData && <NoDataMessage />}
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <Pie
                      data={chartData.inconsistenciasPorStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      label={hasStatusData ? renderCustomizedLabel : false}
                      labelLine={hasStatusData}
                    >
                      {chartData.inconsistenciasPorStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--cor-branco-puro)', border: '1px solid #ddd' }} />
                    <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '5px' }} iconType="circle" layout="horizontal" align="center" verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <aside className={styles.dashboardSidebar}>
            <section className={styles.quickLinks}>
              <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
              <div className={styles.linksGrid}>
                <Link href="/funcionarios" className={styles.quickLinkItem}>
                  <FaUsers className={styles.quickLinkIcon} />
                  <h3>Funcionários</h3>
                </Link>
                <Link href="/relatorios" className={styles.quickLinkItem}>
                  <FaFileAlt className={styles.quickLinkIcon} />
                  <h3>Relatórios</h3>
                </Link>
                <Link href="/inconsistencias" className={styles.quickLinkItem}>
                  <FaExclamationTriangle className={styles.quickLinkIcon} />
                  <h3>Inconsistências</h3>
                </Link>
                <Link href="/feriados" className={styles.quickLinkItem}>
                  <FaCalendarAlt className={styles.quickLinkIcon} />
                  <h3>Feriados</h3>
                </Link>
                <Link href="/usuarios" className={styles.quickLinkItem}>
                  <FaUserCog className={styles.quickLinkIcon} />
                  <h3>Usuários</h3>
                </Link>
                <button onClick={() => setIsDetectModalOpen(true)} className={styles.quickLinkItem}>
                  <FaCog className={styles.quickLinkIcon} />
                  <h3>Detectar Inconsist.</h3>
                </button>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {isDetectModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !detectionLoading && setIsDetectModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Detectar Inconsistências</h2>
            <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--cor-grafite)' }}>
              Selecione a data para a qual deseja verificar as inconsistências. Este processo pode levar alguns instantes.
            </p>
            <div className={styles.inputGroup}>
              <label htmlFor="detectionDate" className={styles.label}>Data de Referência:</label>
              <input
                type="date"
                id="detectionDate"
                className={styles.input}
                value={detectionDate}
                onChange={(e) => setDetectionDate(e.target.value)}
                disabled={detectionLoading}
              />
            </div>

            {detectionMessage.text && (
              <p style={{
                color: detectionMessage.type === 'success' ? 'var(--cor-verde-esmeralda)' : 'var(--cor-vermelho-rubi)',
                textAlign: 'center',
                fontWeight: 'bold',
                marginTop: '1rem'
              }}>
                {detectionMessage.text}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setIsDetectModalOpen(false)}
                className={styles.cancelButton}
                disabled={detectionLoading}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDetectInconsistencies}
                className={styles.saveButton}
                disabled={detectionLoading}
              >
                {detectionLoading ? 'Processando...' : 'Executar Detecção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
