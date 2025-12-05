/* ============================================================================
   TECNICOS.JS - Gerenciamento de Técnicos
   ============================================================================ */

(() => {
  'use strict';

  const API = {
    list: '/api/tecnicos',
    get: (id) => `/api/tecnicos/${id}`,
    create: '/api/tecnicos/novo',
    edit: (id) => `/api/tecnicos/${id}/editar`,
    delete: (id) => `/api/tecnicos/${id}`
  };

  const SELECTORS = {
    tbody: '#tecnicosTableBody',
    total: '#total-tecnicos',
    count: '#tableCount',
    ativos: '#tecnicos-ativos',
    seniors: '#tecnicos-senior',
    contratos: '#total-contratos',
    modal: '#modalTecnico',
    form: '#formTecnico',
    modalTitle: '#modalTecnicoTitle',
    btnAdd: '#btnAddTecnico',
    btnClose: '#closeModalTecnico',
    btnCancel: '#btnCancelTecnico',
    search: '#searchTecnico',
    filterEsp: '#filterEspecialidade',
    filterStatus: '#filterStatus'
  };

  const DEFAULTS = {
    nivel: 'Junior',
    precoHora: 100.00,
    status: 'ativo'
  };

  const state = {
    tecnicos: [],
    filtrados: []
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const setText = (sel, value) => {
    const el = $(sel);
    if (el) el.textContent = value;
  };

  const escapeHtml = (s) => {
    if (!s && s !== 0) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  };

  const toMoneyBR = (valor) => {
    const num = parseFloat(valor);
    if (isNaN(num)) return 'R$ 0,00';
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  };

  function mascaraTelefone(valor) {
    valor = (valor || '').replace(/\D/g, '');
    if (!valor) return '';
    if (valor.length <= 10) {
      valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return valor;
  }

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data ?? {};
  };

  function normalizeTecnico(x) {
    const rawStatus = x.status;
    let status = 'ativo';

    if (typeof rawStatus === 'string') {
      status = rawStatus.toLowerCase();
    } else if (rawStatus === 0 || rawStatus === false) {
      status = 'inativo';
    } else {
      status = 'ativo';
    }

    return {
      id: x.id_tecnico || x.id || 0,
      nome: x.nome || '',
      email: x.email || '',
      telefone: x.telefone || '',
      especialidade: x.especialidade || '',
      nivel_experiencia: x.nivel_experiencia || DEFAULTS.nivel,
      preco_hora: parseFloat(x.preco_hora ?? DEFAULTS.precoHora),
      empresa: x.empresa || '',
      status,
      alocacoes: Number(x.alocacoes || 0)
    };
  }

  const emptyRowTemplate = () => `
    <tr class="empty-state">
      <td colspan="9" style="text-align:center;padding:40px;">
        Nenhum técnico cadastrado ainda
      </td>
    </tr>
  `;

  const rowTemplate = (t) => {
    const nivelClass = `nivel-${escapeHtml(t.nivel_experiencia).toLowerCase()}`;
    const statusClass = `status-${escapeHtml(t.status)}`;
    const statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);

    return `
      <tr data-id="${t.id}">
        <td><strong>#${t.id}</strong></td>
        <td>${escapeHtml(t.nome)}</td>
        <td>${escapeHtml(t.especialidade)}</td>
        <td>
          <span class="nivel-badge ${nivelClass}">
            ${escapeHtml(t.nivel_experiencia)}
          </span>
        </td>
        <td><strong>${toMoneyBR(t.preco_hora)}</strong></td>
        <td>${escapeHtml(t.empresa || '-')}</td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <span class="aloc-badge${t.alocacoes === 0 ? ' aloc-zero' : ''}">
            ${t.alocacoes}
          </span>
        </td>
        <td>
          <button class="btn-action btn-view" data-id="${t.id}" aria-label="Ver técnico">
            Ver
          </button>
          <button class="btn-action btn-edit" data-id="${t.id}" aria-label="Editar técnico">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-action btn-delete" data-id="${t.id}" aria-label="Excluir técnico">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  };

  function renderTable(lista) {
    const tbody = $(SELECTORS.tbody);
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = emptyRowTemplate();
      return;
    }

    tbody.innerHTML = lista.map(rowTemplate).join('');
  }

  function updateCounters(qtd) {
    setText(SELECTORS.total, state.tecnicos.length);

    const plural = (n, s, p) => (n === 1 ? s : p);
    setText(
      SELECTORS.count,
      `${qtd} técnico${plural(qtd, '', 's')} encontrado${plural(qtd, '', 's')}`
    );

    const ativos = state.tecnicos.filter(t => {
      const s = String(t.status).toLowerCase();
      return s === 'ativo' || s === '1' || s === 'true';
    }).length;
    setText(SELECTORS.ativos, ativos);

    const seniors = state.tecnicos.filter(t =>
      String(t.nivel_experiencia).toLowerCase() === 'senior'
    ).length;
    setText(SELECTORS.seniors, seniors);

    const totalContratos = state.tecnicos.reduce((acc, t) =>
      acc + Number(t.alocacoes || 0), 0
    );
    setText(SELECTORS.contratos, totalContratos);
  }

  const showModal = () => {
    const modal = $(SELECTORS.modal);
    if (modal) {
      modal.setAttribute('style', [
        'position: fixed !important',
        'top: 0 !important',
        'left: 0 !important',
        'width: 100% !important',
        'height: 100% !important',
        'background: rgba(10, 31, 68, 0.85) !important',
        'display: flex !important',
        'align-items: center !important',
        'justify-content: center !important',
        'z-index: 999999 !important',
        'opacity: 1 !important',
        'visibility: visible !important'
      ].join(';'));
      document.body.classList.add('modal-open');
    }
  };

  const hideModal = () => {
    const modal = $(SELECTORS.modal);
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  const enableForm = (enabled) => {
    const form = $(SELECTORS.form);
    if (!form) return;

    $$('input, select, textarea, button', form).forEach(el => {
      if (enabled) {
        el.disabled = false;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
      } else {
        el.disabled = true;
      }
    });
  };

  const fillForm = (tec) => {
    const form = $(SELECTORS.form);
    if (!form) return;

    if (form.nome) form.nome.value = tec.nome ?? '';
    if (form.email) form.email.value = tec.email ?? '';
    if (form.telefone) form.telefone.value = mascaraTelefone(tec.telefone ?? '');
    if (form.especialidade) form.especialidade.value = tec.especialidade ?? '';
    if (form.status) form.status.value = tec.status ?? DEFAULTS.status;

    const nivel = $('#tecNivelExp');
    if (nivel) nivel.value = tec.nivel_experiencia ?? DEFAULTS.nivel;

    const preco = $('#tecPrecoHora');
    if (preco) preco.value = Number(tec.preco_hora ?? DEFAULTS.precoHora).toFixed(2);

    if (form.observacoes) form.observacoes.value = tec.observacoes ?? '';
  };

  async function refreshTecnicos() {
    try {
      const data = await fetchJson(API.list);
      state.tecnicos = Array.isArray(data.tecnicos)
        ? data.tecnicos.map(normalizeTecnico)
        : [];
    } catch (e) {
      console.error('Erro ao carregar técnicos:', e);
      state.tecnicos = [];
    }

    state.filtrados = state.tecnicos.slice();
    renderTable(state.filtrados);
    updateCounters(state.filtrados.length);
  }

  async function prepareModalForNew() {
    const form = $(SELECTORS.form);
    if (form) {
      form.reset();
      form.dataset.mode = 'create';
      delete form.dataset.id;
    }

    enableForm(true);

    const title = $(SELECTORS.modalTitle);
    if (title) title.textContent = 'Cadastrar Técnico';

    const preco = $('#tecPrecoHora');
    if (preco) preco.value = DEFAULTS.precoHora.toFixed(2);

    const nivel = $('#tecNivelExp');
    if (nivel) nivel.value = DEFAULTS.nivel;

    const status = $('#tecStatus');
    if (status) status.value = DEFAULTS.status;

    showModal();
    setTimeout(() => { $('#tecNome')?.focus(); }, 100);
  }

  async function prepareModalForEdit(id) {
    const title = $(SELECTORS.modalTitle);
    if (title) title.textContent = 'Editar Técnico';

    try {
      const data = await fetchJson(API.get(id));
      const tec = normalizeTecnico(data.tecnico || data.data || data);

      const form = $(SELECTORS.form);
      if (form) {
        form.dataset.mode = 'edit';
        form.dataset.id = id;
      }

      enableForm(true);
      fillForm(tec);
      showModal();
    } catch (e) {
      console.error('Erro ao carregar técnico:', e);
      alert('Erro ao carregar técnico');
    }
  }

  async function openViewTecnico(id) {
    const title = $(SELECTORS.modalTitle);
    if (title) title.textContent = 'Visualizar Técnico';

    try {
      const data = await fetchJson(API.get(id));
      const tec = normalizeTecnico(data.tecnico || data.data || data);

      const form = $(SELECTORS.form);
      if (form) {
        form.dataset.mode = 'view';
      }

      fillForm(tec);
      enableForm(false);
      showModal();
    } catch (e) {
      console.error('Erro ao carregar técnico:', e);
      alert('Erro ao carregar técnico');
    }
  }

  function closeModalTecnico() {
    enableForm(true);
    hideModal();
  }

  async function salvarTecnico(ev) {
    ev.preventDefault();

    const form = $(SELECTORS.form);
    if (!form) return;

    if (form.dataset.mode === 'view') {
      hideModal();
      return;
    }

    const payload = {
      nome: form.nome?.value.trim(),
      email: form.email?.value.trim() || null,
      telefone: (form.telefone?.value || '').replace(/\D/g, '') || null,
      especialidade: form.especialidade?.value,
      nivel_experiencia: $('#tecNivelExp')?.value,
      preco_hora: parseFloat($('#tecPrecoHora')?.value),
      status: form.status?.value,
      observacoes: form.observacoes?.value.trim() || null
    };

    if (!payload.nome) return alert('Informe o nome do técnico');
    if (!payload.especialidade) return alert('Selecione a especialidade');

    try {
      const isEdit = form.dataset.mode === 'edit' && form.dataset.id;
      const url = isEdit ? API.edit(form.dataset.id) : API.create;

      await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await refreshTecnicos();
      hideModal();
    } catch (e) {
      console.error('Erro ao salvar técnico:', e);
      alert('Erro ao salvar técnico: ' + e.message);
    }
  }

  async function excluirTecnico(id) {
    if (!confirm('Confirmar exclusão do técnico?')) return;

    try {
      await fetchJson(API.delete(id), { method: 'DELETE' });
      await refreshTecnicos();
    } catch (e) {
      console.error('Erro ao excluir técnico:', e);
      alert('Erro ao excluir técnico');
    }
  }

  function aplicarFiltros() {
    const term = ($(SELECTORS.search)?.value || '').toLowerCase();
    const esp = ($(SELECTORS.filterEsp)?.value || '').toLowerCase();
    const st = ($(SELECTORS.filterStatus)?.value || '').toLowerCase();

    state.filtrados = state.tecnicos.filter(t => {
      const matchTerm =
        !term ||
        t.nome.toLowerCase().includes(term) ||
        t.especialidade.toLowerCase().includes(term) ||
        (t.empresa && t.empresa.toLowerCase().includes(term));

      const matchEsp = !esp || t.especialidade.toLowerCase() === esp;
      const matchStatus = !st || t.status.toLowerCase() === st;

      return matchTerm && matchEsp && matchStatus;
    });

    renderTable(state.filtrados);
    updateCounters(state.filtrados.length);
  }

  function bindEvents() {
  $(SELECTORS.btnAdd)?.addEventListener('click', prepareModalForNew);
  $(SELECTORS.btnClose)?.addEventListener('click', closeModalTecnico);
  $(SELECTORS.btnCancel)?.addEventListener('click', closeModalTecnico);
  $(SELECTORS.form)?.addEventListener('submit', salvarTecnico);

  // máscara telefone
  $('#tecTelefone')?.addEventListener('input', (e) => {
    e.target.value = mascaraTelefone(e.target.value);
  });

  // clique nas ações da tabela
  $(SELECTORS.tbody)?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    if (!id) return;

    if (btn.classList.contains('btn-view')) return openViewTecnico(id);
    if (btn.classList.contains('btn-edit')) return prepareModalForEdit(id);
    if (btn.classList.contains('btn-delete')) return excluirTecnico(id);
  });

  // filtros
  $(SELECTORS.search)?.addEventListener('input', aplicarFiltros);
  $(SELECTORS.filterEsp)?.addEventListener('change', aplicarFiltros);
  $(SELECTORS.filterStatus)?.addEventListener('change', aplicarFiltros);

  // fechar modal ao clicar fora
  const modalTec = $(SELECTORS.modal);
  if (modalTec) {
    const contentTec = modalTec.querySelector('.modal-content');

    if (contentTec) {
      contentTec.addEventListener('click', (e) => e.stopPropagation());
    }

    modalTec.addEventListener('click', (e) => {
      if (e.target === modalTec) {
        closeModalTecnico();
      }
    });
  }
}


  document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await refreshTecnicos();
  });

  Object.assign(window, {
    refreshTecnicos,
    prepareModalForNew,
    prepareModalForEdit,
    openViewTecnico,
    closeModalTecnico,
    salvarTecnico,
    excluirTecnico,
    aplicarFiltros
  });
})();
