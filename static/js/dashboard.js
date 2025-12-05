(function () {
  const cards = [
    { key: 'tecnicos',  value: 'value-tecnicos',  growth: 'growth-tecnicos',  spark: 'spark-tecnicos',  color: '#3b8cff' },
    { key: 'empresas',  value: 'value-empresas',  growth: 'growth-empresas',  spark: 'spark-empresas',  color: '#60b6ff' },
    { key: 'usuarios',  value: 'value-usuarios',  growth: 'growth-usuarios',  spark: 'spark-usuarios',  color: '#2463eb' },
    { key: 'alocacoes', value: 'value-alocacoes', growth: 'growth-alocacoes', spark: 'spark-alocacoes', color: '#a5c9ff' }
  ];

  let filtroAtual = 'hoje';

  function getEl(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const el = getEl(id);
    if (el) el.textContent = text;
  }

  // Mantém o comportamento antigo:
  // - se growth vier em fração (0.64), multiplica por 100 -> 64%
  // - se vier em inteiro (64, 640), não mexe
  // - limita visualmente entre -100% e +100% para não estourar o layout
  function normalizeGrowth(raw) {
    if (raw == null) return { value: 0, text: '+0%' };

    let num;

    if (typeof raw === 'string') {
      const m = raw.match(/-?\d+(\.\d+)?/);
      num = m ? parseFloat(m[0]) : 0;
    } else {
      num = Number(raw);
    }

    if (!isFinite(num)) num = 0;

    // Se o valor estiver entre -1 e 1, assume que veio em fração (0.64 = 64%)
    if (Math.abs(num) <= 1) num = num * 100;

    let arred = Math.round(num);

    // Limita entre -100 e 100 para não mostrar +640%, -300% etc
    arred = Math.max(-100, Math.min(100, arred));

    const sign = arred >= 0 ? '+' : '';
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
    const cssWidth = parseFloat(style.width) || 80;
    const cssHeight = parseFloat(style.height) || 24;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

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
          drawSparkline(spark, [0, 0, 0, 0, 0, 0, 0], color);
        });
      }

      // Insights cards
      if (data && data.insights) {
        const cardGrowth = document.querySelector('.insight-card.destaque-growth span:last-child');
        if (cardGrowth && data.insights.growthTexto)
          cardGrowth.textContent = data.insights.growthTexto;

        const cardAlerta = document.querySelector('.insight-card.destaque-alerta span:last-child');
        if (cardAlerta && data.insights.alertaTexto)
          cardAlerta.textContent = data.insights.alertaTexto;

        const cardStatus = document.querySelector('.insight-card.destaque-status span:last-child');
        if (cardStatus && data.insights.sistemaTexto)
          cardStatus.textContent = data.insights.sistemaTexto;
      }

      // Status detalhado
      if (data && data.statusSistema) {
        const mini = document.querySelector('.mini-data');
        if (mini && data.statusSistema.ultimaAtualizacao)
          mini.textContent = data.statusSistema.ultimaAtualizacao;
      }
    } catch (_err) {
      cards.forEach(({ value, growth, spark, color }) => {
        setText(value, '--');
        setText(growth, '+0%');
        paintGrowth(getEl(growth), 0);
        drawSparkline(spark, [0, 0, 0, 0, 0, 0, 0], color);
      });
    }
  }

  function updateFiltroUI(selected) {
    const container = document.querySelector('.dashboard-filtros');
    if (!container) return;
    container.querySelectorAll('button').forEach(btn =>
      btn.classList.remove('filtro-ativo')
    );
    if (selected) selected.classList.add('filtro-ativo');
  }

  async function loadDashboardFiltro(periodo) {
    filtroAtual = periodo;
    const btnSel = document.getElementById('filtro-' + periodo);
    updateFiltroUI(btnSel);
    await loadDashboard(periodo);
  }

  // Listeners dos filtros
  ['hoje', 'semana', 'mes', 'ano'].forEach(fil => {
    const btn = document.getElementById('filtro-' + fil);
    if (btn) btn.onclick = () => loadDashboardFiltro(fil);
  });

  // Exportar CSV
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', async function (e) {
      e.preventDefault();
      try {
        const res = await fetch(`/api/dashboard/exportar?periodo=${filtroAtual}`);
        if (!res.ok) throw new Error('Erro no servidor');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard_${filtroAtual}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (e2) {
        alert('Erro ao exportar: ' + e2.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => loadDashboard(filtroAtual));

  let timer = null;
  function start() {
    if (!timer) {
      timer = setInterval(() => {
        if (!document.hidden) loadDashboard(filtroAtual);
      }, 30000);
    }
  }
  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
  start();
})();
