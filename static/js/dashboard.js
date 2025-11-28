(function () {
  const cards = [
    { key: 'tecnicos',  value: 'value-tecnicos',  growth: 'growth-tecnicos',  spark: 'spark-tecnicos',  color: '#3b8cff' },
    { key: 'empresas',  value: 'value-empresas',  growth: 'growth-empresas',  spark: 'spark-empresas',  color: '#60b6ff' },
    { key: 'usuarios',  value: 'value-usuarios',  growth: 'growth-usuarios',  spark: 'spark-usuarios',  color: '#2463eb' },
    { key: 'alocacoes', value: 'value-alocacoes', growth: 'growth-alocacoes', spark: 'spark-alocacoes', color: '#a5c9ff' }
  ];
  let filtroAtual = 'hoje';

  function getEl(id) { return document.getElementById(id); }
  function setText(id, text) { const el = getEl(id); if (el) el.textContent = text; }

  function normalizeGrowth(raw) {
    if (raw == null) return { value: 0, text: "+0%" };
    if (typeof raw === 'string') {
      const m = raw.match(/-?\d+(\.\d+)?/);
      const num = m ? parseFloat(m[0]) : 0;
      const sign = num >= 0 ? "+" : "";
      return { value: num, text: `${sign}${num}%` };
    }
    let num = Number(raw);
    if (!isFinite(num)) num = 0;
    if (Math.abs(num) <= 1) num = num * 100;
    const arred = Math.round(num);
    const sign = arred >= 0 ? "+" : "";
    return { value: arred, text: `${sign}${arred}%` };
  }

  function paintGrowth(el, numericPercent) {
    if (!el) return;
    const v = Number(numericPercent) || 0;
    el.classList.remove('pos', 'neg', 'neu');
    if (v > 0) el.classList.add('pos');
    else if (v < 0) el.classList.add('neg');
    else el.classList.add('neu');
  }

  function drawSparkline(canvasId, data, color) {
    const canvas = getEl(canvasId);
    if (!canvas || !Array.isArray(data) || data.length === 0) return;
    const style = getComputedStyle(canvas);
    const cssWidth = parseFloat(style.width);
    const cssHeight = parseFloat(style.height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = cssWidth;
    const h = cssHeight;
    const pad = 4;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(1, max - min);
    const toX = (i) => {
      if (data.length === 1) return pad;
      return pad + (i * (w - pad * 2)) / (data.length - 1);
    };
    const toY = (v) => {
      const norm = (v - min) / span;
      return pad + (1 - norm) * (h - pad * 2);
    };
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // bolinha no último ponto
    const lastX = toX(data.length - 1);
    const lastY = toY(data[data.length - 1]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  async function fetchWithRetry(url, opts = {}, attempts = 3, backoff = 400) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, { credentials: 'same-origin', ...opts });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, backoff * (i + 1)));
      }
    }
    throw lastErr;
  }

  // Preenche métricas, sparklines, insights e status com base no JSON retornado
  async function loadDashboard(periodo = filtroAtual) {
    try {
      const data = await fetchWithRetry(`/api/dashboard?periodo=${periodo}`, {}, 3, 400);

      // Cards principais
      if (data && !data.error) {
        cards.forEach(({ key, value, growth, spark, color }) => {
          const section = data[key] || {};
          const count = section.count != null ? section.count : 0;
          const ng = normalizeGrowth(section.growth);
          setText(value, count);
          setText(growth, ng.text);
          paintGrowth(getEl(growth), ng.value);
          const series = Array.isArray(section.series) ? section.series : [];
          drawSparkline(spark, series, color);
        });
      } else {
        cards.forEach(({ value, growth, spark, color }) => {
          setText(value, '0');
          setText(growth, '+0%');
          paintGrowth(getEl(growth), 0);
          drawSparkline(spark, [0,0,0,0,0,0,0], color);
        });
      }

      // Insights cards (requere classes específicas na estrutura HTML)
      if (data.insights) {
        if (document.querySelector('.insight-card.destaque-growth'))
          document.querySelector('.insight-card.destaque-growth span:last-child').textContent = data.insights.growthTexto;
        if (document.querySelector('.insight-card.destaque-alerta'))
          document.querySelector('.insight-card.destaque-alerta span:last-child').textContent = data.insights.alertaTexto;
        if (document.querySelector('.insight-card.destaque-status'))
          document.querySelector('.insight-card.destaque-status span:last-child').textContent = data.insights.sistemaTexto;
      }

      // Status detalhado (exemplo)
      if (data.statusSistema && document.querySelector('.mini-data')) {
        document.querySelector('.mini-data').textContent = data.statusSistema.ultimaAtualizacao;
      }
    } catch (_err) {
      cards.forEach(({ value, growth, spark, color }) => {
        setText(value, '--');
        setText(growth, '+0%');
        paintGrowth(getEl(growth), 0);
        drawSparkline(spark, [0,0,0,0,0,0,0], color);
      });
    }
  }

  // Filtros de período
  function updateFiltroUI(selected) {
    document.querySelectorAll('.dashboard-filtros button').forEach(btn => btn.classList.remove('filtro-ativo'));
    if (selected) selected.classList.add('filtro-ativo');
  }

  async function loadDashboardFiltro(periodo) {
    filtroAtual = periodo;
    updateFiltroUI(document.getElementById('filtro-' + periodo));
    await loadDashboard(periodo);
  }

  // Adicione listeners para filtros
  ['hoje', 'semana', 'mes', 'ano'].forEach(fil => {
    const btn = document.getElementById('filtro-' + fil);
    if (btn) btn.onclick = () => loadDashboardFiltro(fil);
  });

// Botão de exportar CSV (chama o backend Flask)
document.getElementById('btn-exportar')?.addEventListener('click', function() {
  window.open(`/api/dashboard/exportar?periodo=${filtroAtual}`, '_blank');

});

  document.addEventListener('DOMContentLoaded', () => loadDashboard(filtroAtual));

  // Auto-refresh a cada 30s somente se a aba estiver visível
  let timer = null;
  function start() {
    if (!timer) {
      timer = setInterval(() => { if (!document.hidden) loadDashboard(filtroAtual); }, 30000);
    }
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  start();
})();




