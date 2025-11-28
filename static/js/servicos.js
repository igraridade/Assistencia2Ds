const API_BASE = '/api/servicos';
let todosUsuarios = [];
let servicosMock = [];
let currentUserRole = null;  // ✅ CORRIGIDO: era 'user', agora é null
let currentUserId = null;
let currentUserName = '';
let empresas = [];

// ===================== UTILITÁRIOS =====================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// ===================== CARREGAR EMPRESAS =====================
async function carregarEmpresas() {
  try {
    const response = await fetch('/api/empresas');
    const data = await response.json();
    if (response.ok && data.success) {
      empresas = data.empresas;
    }
  } catch (error) {
    // Silencioso
  }
}

// ===================== CARREGAR SERVIÇOS =====================
async function carregarServicos() {
  try {
    // ✅ SEMPRE usa /api/servicos - o backend decide o que mostrar
    const response = await fetch('/api/servicos');

    if (response.status === 401) {
      mostrarErro('Faça login para ver os serviços');
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }

    const data = await response.json();

    if (response.ok && data.success) {
      servicosMock = data.servicos;
      currentUserRole = data.user_role || 'user';  // ✅ Garante que sempre tem valor
      currentUserId = data.user_id;
      currentUserName = data.user_name;

      // ✅ DEBUG - pode remover depois
      console.log('🔍 User Role:', currentUserRole);
      console.log('🔍 Total de Serviços:', servicosMock.length);

      renderServicosTable(servicosMock);
      atualizarResumo(servicosMock);
      atualizarIndicadorAdmin();
      controlarBotaoNovoServico();  // ✅ Chama DEPOIS de atualizar o role
      carregarVitrine();
    } else {
      mostrarErro('Erro ao carregar serviços: ' + (data.error || 'Erro desconhecido'));
    }

  } catch (error) {
    console.error('Erro ao carregar serviços:', error);
    mostrarErro('Erro ao conectar com o servidor');
  }
}

// ===================== CONTROLE DE PERMISSÕES =====================
function controlarBotaoNovoServico() {
  const btnAdd = document.getElementById('btnAddServico');
  if (!btnAdd) return;

  // ✅ CORRIGIDO: verifica se é admin
  if (currentUserRole === 'admin') {
    btnAdd.style.display = 'flex';
    console.log('✅ Botão "Novo Serviço" ATIVADO (admin)');
  } else {
    btnAdd.style.display = 'none';
    console.log('❌ Botão "Novo Serviço" DESATIVADO (não é admin)');
  }
}

function atualizarIndicadorAdmin() {
  const heroTitle = document.querySelector('.hero-title');
  if (currentUserRole === 'admin' && heroTitle && !heroTitle.querySelector('.admin-badge')) {
    const badge = document.createElement('span');
    badge.className = 'admin-badge';
    badge.textContent = 'Administrador';
    heroTitle.appendChild(badge);
  }
}

// ===================== RENDERIZAÇÃO =====================
function renderServicosTable(servicos) {
  const tbody = document.getElementById('servicosTableBody');
  if (!tbody) return;

  if (servicos.length === 0) {
    tbody.innerHTML = `<tr class="empty-state">
      <td colspan="9">
        <div class="empty-message">
          <span class="empty-icon"></span>
          <p>Nenhum serviço encontrado</p>
          ${currentUserRole === 'admin' ? '<button class="btn-empty-action" id="btnEmptyNew">Abrir Novo Serviço</button>' : ''}
        </div>
      </td>
    </tr>`;
    document.getElementById('tableCount').textContent = '0 serviços encontrados';

    const btnEmpty = document.getElementById('btnEmptyNew');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', abrirModalNovoServico);
    }
    return;
  }

  tbody.innerHTML = servicos.map(srv => {
    // ✅ CONTROLE DE PERMISSÕES CORRETO
    const podeEditar = currentUserRole === 'admin';  // ← APENAS ADMIN PODE EDITAR
    const podeExcluir = currentUserRole === 'admin'; // ← APENAS ADMIN PODE EXCLUIR
    const nomeCliente = srv.cliente || currentUserName;

    const iconesCategoria = {
      'Hardware': '🔧',
      'Software': '💻',
      'Redes': '🌐',
      'Suporte': '🎧'
    };

    const coresCategoria = {
      'Hardware': 'categoria-hardware',
      'Software': 'categoria-software',
      'Redes': 'categoria-redes',
      'Suporte': 'categoria-suporte'
    };

    const categoria = srv.categoria || 'Hardware';
    const iconeCategoria = iconesCategoria[categoria] || '📦';
    const corCategoria = coresCategoria[categoria] || 'categoria-hardware';

    const problemaCompleto = srv.problema || '';
    const problemaExibido = problemaCompleto.length > 50
      ? problemaCompleto.substring(0, 50) + '...'
      : problemaCompleto;

    const iconVer = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const iconEdit = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const iconDelete = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    return `
<tr>
  <td><strong>${srv.protocolo}</strong></td>
  <td><span class="categoria-badge ${corCategoria}">${iconeCategoria} ${categoria}</span></td>
  <td>${escapeHtml(srv.empresa)}</td>
  <td>${escapeHtml(nomeCliente)}</td>
  <td><span class="problema-text" title="${escapeHtml(problemaCompleto)}">${escapeHtml(problemaExibido)}</span></td>
  <td><span class="prioridade-badge prioridade-${srv.prioridade}">${srv.prioridade.charAt(0).toUpperCase() + srv.prioridade.slice(1)}</span></td>
  <td><span class="status-badge status-${srv.status.replace(/ /g, "-").toLowerCase()}">${srv.status.charAt(0).toUpperCase() + srv.status.slice(1)}</span></td>
  <td>${srv.prazo ? new Date(srv.prazo).toLocaleDateString('pt-BR') : '-'}</td>
  <td>
    <div class="table-actions">
      <button class="btn-action btn-view" data-protocolo="${srv.protocolo}">${iconVer} Ver</button>
      ${podeEditar ? `<button class="btn-action btn-edit" data-protocolo="${srv.protocolo}">${iconEdit} Editar</button>` : ''}
      ${podeExcluir ? `<button class="btn-action btn-delete" data-protocolo="${srv.protocolo}">${iconDelete} Excluir</button>` : ''}
    </div>
  </td>
</tr>
    `;
  }).join('');

  document.getElementById('tableCount').textContent = `${servicos.length} serviços encontrados`;
}


// ===================== ATUALIZAR RESUMO =====================
function atualizarResumo(servicos) {
  document.getElementById('total-servicos').textContent = servicos.length;
  document.getElementById('servicos-abertos').textContent = servicos.filter(s =>
    s.status === 'aberta' || s.status === 'em andamento'
  ).length;
  document.getElementById('servicos-concluidos').textContent = servicos.filter(s =>
    s.status === 'concluida'
  ).length;
  document.getElementById('servicos-urgentes').textContent = servicos.filter(s =>
    s.prioridade === 'urgente'
  ).length;
  const hoje = new Date();
  const limite7dias = new Date(hoje);
  limite7dias.setDate(limite7dias.getDate() - 7);
  const novos = servicos.filter(s => {
    if (!s.prazo) return false;
    const dataPrazo = new Date(s.prazo);
    return dataPrazo >= limite7dias;
  }).length;
  document.getElementById('novos7dias').textContent = novos;
  const concluidos = servicos.filter(s => s.status === 'concluida');
  if (concluidos.length) {
    const media = Math.round(
      concluidos.map(s => {
        const diff = Math.abs(new Date(s.prazo) - new Date()) / (1000 * 60 * 60 * 24);
        return diff;
      }).reduce((a, b) => a + b, 0) / concluidos.length
    );
    document.getElementById('mediaPrazo').textContent = `${media}`;
  } else {
    document.getElementById('mediaPrazo').textContent = '-';
  }
  const tops = {};
  servicos.forEach(s => {
    const problema = s.problema || 'Sem descrição';
    tops[problema] = (tops[problema] || 0) + 1;
  });
  let max = 0, freqProb = '';
  Object.entries(tops).forEach(([prob, count]) => {
    if (count > max) {
      max = count;
      freqProb = prob.length > 40 ? prob.substring(0, 40) + '...' : prob;
    }
  });
  document.getElementById('topProblemas').textContent = freqProb || '-';
}

// ===================== FILTROS =====================
function filtrarServicos() {
  const term = document.getElementById('searchServico').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const prioridade = document.getElementById('filterPrioridade').value;
  const categoria = document.getElementById('filterCategoria').value;
  let filtrados = servicosMock.filter(srv => {
    const busca = srv.protocolo.toString().toLowerCase().includes(term)
      || srv.empresa.toLowerCase().includes(term)
      || (srv.cliente && srv.cliente.toLowerCase().includes(term))
      || srv.problema.toLowerCase().includes(term)
      || (srv.categoria && srv.categoria.toLowerCase().includes(term.toLowerCase()));
    const matchStatus = !status || srv.status === status;
    const matchPrio = !prioridade || srv.prioridade === prioridade;
    const matchCategoria = !categoria || srv.categoria === categoria;
    return busca && matchStatus && matchPrio && matchCategoria;
  });
  renderServicosTable(filtrados);
  document.getElementById('tableCount').textContent = `${filtrados.length} serviços encontrados`;
}

// ===================== MODAL: NOVO SERVIÇO =====================
function abrirModalNovoServico() {
  const empresasOptions = empresas.map(e =>
    `<option value="${e.id_empresa_cliente}">${escapeHtml(e.nome)}</option>`
  ).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
  <div class="modal-content">
    <div class="modal-header">
      <h2>Novo Serviço</h2>
      <button class="modal-close" onclick="fecharModal()">&times;</button>
    </div>
    <form id="formNovoServico" onsubmit="salvarNovoServico(event)">
      <div class="form-group">
        <label>Categoria *</label>
        <select id="novoCategoria" required>
          <option value="Hardware">🔧 Hardware</option>
          <option value="Software">💻 Software</option>
          <option value="Redes">🌐 Redes</option>
          <option value="Suporte">🎧 Suporte</option>
        </select>
      </div>
      <div class="form-group">
        <label>Empresa *</label>
        <select id="novoEmpresa" required>
          <option value="">Selecione...</option>
          ${empresasOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Problema *</label>
        <textarea id="novoProblema" rows="3" required placeholder="Descreva o problema..."></textarea>
      </div>
      <div class="form-group">
        <label>Prioridade *</label>
        <select id="novoPrioridade" required>
          <option value="baixa">Baixa</option>
          <option value="media" selected>Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prazo Estimado</label>
        <input type="date" id="novoPrazo" value="${getDataFutura(7)}">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Criar Serviço</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(modal);
}

// ===================== FUNÇÃO PARA SALVAR NOVO SERVIÇO =====================
async function salvarNovoServico(e) {
  e.preventDefault();
  const dados = {
    categoria: document.getElementById('novoCategoria').value,
    id_empresa_cliente: document.getElementById('novoEmpresa').value,
    problema: document.getElementById('novoProblema').value,
    prioridade: document.getElementById('novoPrioridade').value,
    prazo_estimado: document.getElementById('novoPrazo').value
  };
  try {
    const response = await fetch('/api/servicos/novo', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dados)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      mostrarSucesso(`Serviço ${data.protocolo} criado com sucesso!`);
      fecharModal();
      carregarServicos();
    } else {
      mostrarErro(data.error || 'Erro ao criar serviço');
    }

  } catch (error) {
    console.error('Erro ao salvar serviço:', error);
    mostrarErro('Erro ao criar serviço');
  }
}

// ===================== FUNÇÃO PARA VER DETALHES DE SERVIÇO =====================
function verServico(protocolo) {
  const servico = servicosMock.find(s => s.protocolo == protocolo);
  if (!servico) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
  <div class="modal-content">
    <div class="modal-header">
      <h2>Serviço ${protocolo}</h2>
      <button class="modal-close" onclick="fecharModal()">&times;</button>
    </div>
    <div style="padding: 28px;">
      <div class="form-group">
        <label>Categoria</label>
        <p><strong>${servico.categoria || 'Hardware'}</strong></p>
      </div>
      <div class="form-group">
        <label>Empresa</label>
        <p><strong>${escapeHtml(servico.empresa)}</strong></p>
      </div>
      <div class="form-group">
        <label>Cliente</label>
        <p><strong>${escapeHtml(servico.cliente)}</strong></p>
      </div>
      <div class="form-group">
        <label>Problema</label>
        <p>${escapeHtml(servico.problema)}</p>
      </div>
      <div class="form-group">
        <label>Prioridade</label>
        <p><span class="prioridade-badge prioridade-${servico.prioridade}">${servico.prioridade.charAt(0).toUpperCase() + servico.prioridade.slice(1)}</span></p>
      </div>
      <div class="form-group">
        <label>Status</label>
        <p><span class="status-badge status-${servico.status.replace(/ /g, "-").toLowerCase()}">${servico.status.charAt(0).toUpperCase() + servico.status.slice(1)}</span></p>
      </div>
      <div class="form-group">
        <label>Prazo</label>
        <p><strong>${servico.prazo ? new Date(servico.prazo).toLocaleDateString('pt-BR') : '-'}</strong></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-primary" onclick="fecharModal()">Fechar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// ===================== FUNÇÃO PARA ABRIR MODAL DE EDIÇÃO =====================
function abrirModalEditarServico(protocolo) {
  const servico = servicosMock.find(s => s.protocolo == protocolo);
  if (!servico) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
  <div class="modal-content">
    <div class="modal-header">
      <h2>Editar Serviço ${protocolo}</h2>
      <button class="modal-close" onclick="fecharModal()">&times;</button>
    </div>
    <form id="formEditarServico" onsubmit="salvarEdicaoServico(event, '${protocolo}')">
      <div class="form-group">
        <label>Categoria *</label>
        <select id="editCategoria" required>
          <option value="Hardware" ${servico.categoria === 'Hardware' ? 'selected' : ''}>🔧 Hardware</option>
          <option value="Software" ${servico.categoria === 'Software' ? 'selected' : ''}>💻 Software</option>
          <option value="Redes" ${servico.categoria === 'Redes' ? 'selected' : ''}>🌐 Redes</option>
          <option value="Suporte" ${servico.categoria === 'Suporte' ? 'selected' : ''}>🎧 Suporte</option>
        </select>
      </div>
      <div class="form-group">
        <label>Problema *</label>
        <textarea id="editProblema" rows="3" required>${escapeHtml(servico.problema)}</textarea>
      </div>
      <div class="form-group">
        <label>Prioridade *</label>
        <select id="editPrioridade" required>
          <option value="baixa" ${servico.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
          <option value="media" ${servico.prioridade === 'media' ? 'selected' : ''}>Média</option>
          <option value="alta" ${servico.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
          <option value="urgente" ${servico.prioridade === 'urgente' ? 'selected' : ''}>Urgente</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status *</label>
        <select id="editStatus" required>
          <option value="aberta" ${servico.status === 'aberta' ? 'selected' : ''}>Aberta</option>
          <option value="em andamento" ${servico.status === 'em andamento' ? 'selected' : ''}>Em Andamento</option>
          <option value="concluida" ${servico.status === 'concluida' ? 'selected' : ''}>Concluída</option>
          <option value="pendente" ${servico.status === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="cancelada" ${servico.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prazo Estimado</label>
        <input type="date" id="editPrazo" value="${servico.prazo}">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Alterações</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(modal);
}

// ===================== FUNÇÃO PARA SALVAR EDIÇÃO =====================
async function salvarEdicaoServico(e, protocolo) {
  e.preventDefault();
  const dados = {
    categoria: document.getElementById('editCategoria').value,
    problema: document.getElementById('editProblema').value,
    prioridade: document.getElementById('editPrioridade').value,
    status: document.getElementById('editStatus').value,
    prazo_estimado: document.getElementById('editPrazo').value
  };
  try {
    const response = await fetch(`/api/servicos/${protocolo}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dados)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      mostrarSucesso('Serviço atualizado com sucesso!');
      fecharModal();
      carregarServicos();
    } else {
      mostrarErro(data.error || 'Erro ao atualizar serviço');
    }

  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    mostrarErro('Erro ao atualizar serviço');
  }
}

function fecharModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
}

// ===================== VITRINE =====================
async function carregarVitrine() {
  try {
    const response = await fetch('/api/servicos/vitrine');
    const data = await response.json();

    if (response.ok && data.success) {
      renderVitrine(data.vitrine);
    }

  } catch (error) {
    // Silencioso
  }
}

function renderVitrine(vitrine) {
  const vitrineContainer = document.getElementById('vitrineCards');
  if (!vitrineContainer) return;
  const cores = {
    'Hardware': 'vitrine-blue',
    'Software': 'vitrine-cyan',
    'Redes': 'vitrine-violet',
    'Suporte': 'vitrine-green'
  };
  const icones = {
    'Hardware': '🔧',
    'Software': '💻',
    'Redes': '🌐',
    'Suporte': '🎧'
  };
  vitrineContainer.innerHTML = vitrine.map(cat => `
    <div class="vitrine-card ${cores[cat.categoria] || 'vitrine-blue'}">
      <div class="vitrine-icon">${icones[cat.categoria] || '📦'}</div>
      <div class="vitrine-info">
        <h3 class="vitrine-title">${cat.categoria}</h3>
        <div class="vitrine-stats">
          <div class="vitrine-stat">
            <span class="stat-value">${cat.total}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="vitrine-stat">
            <span class="stat-value">${cat.abertos}</span>
            <span class="stat-label">Abertos</span>
          </div>
          <div class="vitrine-stat">
            <span class="stat-value">${cat.concluidos}</span>
            <span class="stat-label">Concluídos</span>
          </div>
          ${cat.urgentes > 0 ? `
          <div class="vitrine-stat urgente">
            <span class="stat-value">${cat.urgentes}</span>
            <span class="stat-label">Urgentes</span>
          </div>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// ===================== EXCLUIR =====================
async function excluirServico(protocolo) {
  if (!confirm(`Tem certeza que deseja excluir o serviço ${protocolo}?`)) return;
  try {
    const response = await fetch(`/api/servicos/${protocolo}`, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'}
    });

    const data = await response.json();

    if (response.ok && data.success) {
      mostrarSucesso('Serviço excluído com sucesso!');
      carregarServicos();
    } else {
      mostrarErro(data.error || 'Erro ao excluir serviço');
    }

  } catch (error) {
    console.error('Erro ao excluir serviço:', error);
    mostrarErro('Erro ao excluir serviço');
  }
}

// ===================== HELPERS =====================
function mostrarSucesso(msg) {
  alert('✓ ' + msg);
}

function mostrarErro(msg) {
  alert('✗ ' + msg);
}

function getDataFutura(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

// ===================== EVENT LISTENERS =====================
document.addEventListener('DOMContentLoaded', () => {
  // ✅ Sempre chama carregarServicos() - ela detecta automaticamente se é admin
  carregarServicos();
  carregarEmpresas();

  const searchInput = document.getElementById('searchServico');
  const filterStatus = document.getElementById('filterStatus');
  const filterPrio = document.getElementById('filterPrioridade');
  const filterCat = document.getElementById('filterCategoria');
  const btnAdd = document.getElementById('btnAddServico');
  const btnExport = document.getElementById('btnExportarServicos');

  if (searchInput) searchInput.addEventListener('input', filtrarServicos);
  if (filterStatus) filterStatus.addEventListener('change', filtrarServicos);
  if (filterPrio) filterPrio.addEventListener('change', filtrarServicos);
  if (filterCat) filterCat.addEventListener('change', filtrarServicos);
  if (btnAdd) btnAdd.addEventListener('click', abrirModalNovoServico);
  if (btnExport) btnExport.addEventListener('click', function() {
    window.location.href = '/api/servicos/exportar';
  });

  // Delegação de eventos para botões da tabela
  const tbody = document.getElementById('servicosTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-action');
      if (!btn) return;

      const protocolo = btn.getAttribute('data-protocolo');
      if (!protocolo) return;

      if (btn.classList.contains('btn-view')) {
        verServico(protocolo);
      } else if (btn.classList.contains('btn-edit')) {
        abrirModalEditarServico(protocolo);
      } else if (btn.classList.contains('btn-delete')) {
        excluirServico(protocolo);
      }
    });
  }
});
