let tecnicos = [];
let tecnicosFiltrados = [];

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatPreco(valor) {
  const num = parseFloat(valor);
  if (isNaN(num)) return 'R$ 0,00';
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

function normalizeTecnico(x) {
  const rawStatus = x.status;
  let statusTexto = 'ativo';

  if (typeof rawStatus === 'string') {
    statusTexto = rawStatus.toLowerCase();
  } else if (rawStatus === 0 || rawStatus === false) {
    statusTexto = 'inativo';
  } else {
    statusTexto = 'ativo';
  }

  return {
    id: x.id_tecnico || x.id || 0,
    nome: x.nome || '',
    email: x.email || '',
    telefone: x.telefone || '',
    especialidade: x.especialidade || '',
    nivel_experiencia: x.nivel_experiencia || 'Junior',
    preco_hora: parseFloat(x.preco_hora || 100.00),
    empresa: x.empresa || '',
    status: statusTexto
  };
}


function renderTable(lista) {
  const tbody = document.getElementById('tecnicosTableBody');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;">Nenhum técnico encontrado</td></tr>';
    return;
  }

  let html = '';
  lista.forEach(function(tec) {
    const statusText = tec.status.charAt(0).toUpperCase() + tec.status.slice(1);
    const precoFormatado = formatPreco(tec.preco_hora);
    
    html += '<tr data-id="' + tec.id + '">';
    html += '<td><strong>#' + tec.id + '</strong></td>';
    html += '<td>' + escapeHtml(tec.nome) + '</td>';
    html += '<td>' + escapeHtml(tec.especialidade) + '</td>';
    html += '<td><span class="nivel-badge nivel-' + tec.nivel_experiencia.toLowerCase() + '">' + escapeHtml(tec.nivel_experiencia) + '</span></td>';
    html += '<td><strong>' + precoFormatado + '</strong></td>';
    html += '<td>' + escapeHtml(tec.empresa || '-') + '</td>';
    html += '<td><span class="status-badge status-' + tec.status + '">' + statusText + '</span></td>';
    html += '<td><span class="aloc-badge' + (tec.alocacoes === 0 ? ' aloc-zero' : '') + '">' + tec.alocacoes + '</span></td>';
    html += '<td>';
    html += '<button class="btn-action btn-view" data-id="' + tec.id + '">Ver</button> ';
    html += '<button class="btn-action btn-edit" data-id="' + tec.id + '">Editar</button> ';
    html += '<button class="btn-action btn-delete" data-id="' + tec.id + '">Excluir</button>';
    html += '</td>';
    html += '</tr>';
  });
  
  tbody.innerHTML = html;
}

function updateCounters(qtdFiltrados) {
  const totalEl = document.getElementById('total-tecnicos');
  const countEl = document.getElementById('tableCount');
  const ativosEl = document.getElementById('tecnicos-ativos');

  if (totalEl) {
    totalEl.textContent = tecnicos.length;
  }

  if (countEl) {
    countEl.textContent =
      qtdFiltrados + ' técnico' +
      (qtdFiltrados === 1 ? '' : 's') +
      ' encontrado' +
      (qtdFiltrados === 1 ? '' : 's');
  }

  if (ativosEl) {
    const ativos = tecnicos.filter(t => {
      const s = (t.status + '').toLowerCase();
      return s === 'ativo' || s === '1' || s === 'true';
    }).length;
    ativosEl.textContent = ativos;
  }
}


async function refreshTecnicos() {
  try {
    const response = await fetch('/api/tecnicos');
    const data = await response.json();
    
    if (data.success && Array.isArray(data.tecnicos)) {
      tecnicos = data.tecnicos.map(normalizeTecnico);
    } else {
      tecnicos = [];
    }
  } catch (err) {
    console.error('Erro ao carregar técnicos:', err);
    tecnicos = [];
  }
  
  tecnicosFiltrados = tecnicos.slice(0);
  renderTable(tecnicosFiltrados);
  updateCounters(tecnicosFiltrados.length);
}

async function prepareModalForNew() {
  console.log('🆕 Abrindo modal NOVO técnico...');
  
  const modal = document.getElementById('modalTecnico');
  const form = document.getElementById('formTecnico');
  
  // Fecha o modal primeiro para resetar tudo
  if (modal) modal.style.display = 'none';
  
  setTimeout(function() {
    if (form) {
      form.reset();
      form.dataset.mode = 'create';
      delete form.dataset.id;
      
      // Habilita todos os campos do formulário
      document.querySelectorAll('#formTecnico input, #formTecnico select, #formTecnico textarea, #formTecnico button').forEach(function(el) {
        el.disabled = false;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
      });
      
      // Define valores padrão
      const precoInput = document.getElementById('tecPrecoHora');
      if (precoInput) precoInput.value = '100.00';
      
      const nivelInput = document.getElementById('tecNivelExp');
      if (nivelInput) nivelInput.value = 'Junior';
      
      const statusInput = document.getElementById('tecStatus');
      if (statusInput) statusInput.value = 'ativo';
    }
    
    const titleEl = document.getElementById('modalTecnicoTitle');
    if (titleEl) titleEl.textContent = 'Cadastrar Técnico';
    
    // Exibe o modal com CSS forçado
    if (modal) {
      modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: rgba(10, 31, 68, 0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important; visibility: visible !important;');
      console.log('✅ Modal reaberto - campos habilitados!');
      
      // Foca no primeiro campo após abrir
      setTimeout(function() {
        const nomeInput = document.getElementById('tecNome');
        if (nomeInput) nomeInput.focus();
      }, 100);
    }
  }, 50);
}

async function prepareModalForEdit(id) {
  console.log('✏️ Abrindo modal EDITAR técnico ID:', id);
  
  const modal = document.getElementById('modalTecnico');
  const form = document.getElementById('formTecnico');
  const titleEl = document.getElementById('modalTecnicoTitle');
  
  if (titleEl) titleEl.textContent = 'Editar Técnico';
  
  try {
    // Busca os dados do técnico na API
    const response = await fetch('/api/tecnicos/' + id);
    const data = await response.json();
    const tec = normalizeTecnico(data.tecnico || data.data || data);
    
    console.log('Técnico carregado:', tec);
    
    if (form) {
      form.dataset.mode = 'edit';
      form.dataset.id = id;
      
      // Habilita todos os campos para edição
      document.querySelectorAll('#formTecnico input, #formTecnico select, #formTecnico textarea, #formTecnico button').forEach(function(el) {
        el.disabled = false;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
      });
      
      // Preenche os campos com os dados do técnico
      if (form.nome) form.nome.value = tec.nome;
      if (form.email) form.email.value = tec.email || '';
      if (form.telefone) form.telefone.value = tec.telefone || '';
      if (form.especialidade) form.especialidade.value = tec.especialidade;
      if (form.status) form.status.value = tec.status;
      if (form.observacoes) form.observacoes.value = tec.observacoes || '';
      
      const nivelInput = document.getElementById('tecNivelExp');
      if (nivelInput) nivelInput.value = tec.nivel_experiencia;
      
      const precoInput = document.getElementById('tecPrecoHora');
      if (precoInput) precoInput.value = tec.preco_hora.toFixed(2);
    }
    
    // Exibe o modal com CSS forçado
    if (modal) {
      modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: rgba(10, 31, 68, 0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important; visibility: visible !important;');
      console.log('✅ Modal EDITAR exibido com CSS forçado!');
    }
  } catch (err) {
    console.error('❌ Erro ao carregar técnico:', err);
    alert('Erro ao carregar técnico');
  }
}

async function openViewTecnico(id) {
  console.log('👁️ Abrindo modal VER técnico ID:', id);
  
  const modal = document.getElementById('modalTecnico');
  const form = document.getElementById('formTecnico');
  const titleEl = document.getElementById('modalTecnicoTitle');
  
  if (titleEl) titleEl.textContent = 'Visualizar Técnico';
  
  try {
    // Busca os dados do técnico na API
    const response = await fetch('/api/tecnicos/' + id);
    const data = await response.json();
    const tec = normalizeTecnico(data.tecnico || data.data || data);
    
    if (form) {
      form.dataset.mode = 'view';
      
      // Preenche os campos
      if (form.nome) form.nome.value = tec.nome;
      if (form.email) form.email.value = tec.email || '';
      if (form.telefone) form.telefone.value = tec.telefone || '';
      if (form.especialidade) form.especialidade.value = tec.especialidade;
      if (form.status) form.status.value = tec.status;
      if (form.observacoes) form.observacoes.value = tec.observacoes || '';
      
      const nivelInput = document.getElementById('tecNivelExp');
      if (nivelInput) nivelInput.value = tec.nivel_experiencia;
      
      const precoInput = document.getElementById('tecPrecoHora');
      if (precoInput) precoInput.value = tec.preco_hora.toFixed(2);
      
      // Desabilita todos os campos no modo visualização
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(function(input) {
        input.disabled = true;
      });
    }
    
    // Exibe o modal
    if (modal) {
      modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: rgba(10, 31, 68, 0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important; visibility: visible !important;');
      console.log('✅ Modal VER exibido com CSS forçado!');
    }
  } catch (err) {
    console.error('❌ Erro ao carregar técnico:', err);
    alert('Erro ao carregar técnico');
  }
}

function closeModalTecnico() {
  console.log('❌ Fechando modal...');
  
  const modal = document.getElementById('modalTecnico');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Reabilita todos os campos ao fechar
  const form = document.getElementById('formTecnico');
  if (form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function(input) {
      input.disabled = false;
    });
  }
}

async function salvarTecnico(event) {
  event.preventDefault();
  console.log('💾 Salvando técnico...');
  
  const form = document.getElementById('formTecnico');
  if (!form) return;
  
  // Se estiver no modo visualização, apenas fecha o modal
  if (form.dataset.mode === 'view') {
    closeModalTecnico();
    return;
  }
  
  // Monta o objeto com os dados do formulário
  const payload = {
    nome: form.nome.value.trim(),
    email: form.email.value.trim() || null,
    telefone: form.telefone ? form.telefone.value.trim() : null,
    especialidade: form.especialidade.value,
    nivel_experiencia: document.getElementById('tecNivelExp').value,
    preco_hora: parseFloat(document.getElementById('tecPrecoHora').value),
    status: form.status.value,
    observacoes: form.observacoes ? form.observacoes.value.trim() : null
  };
  
  console.log('Payload:', payload);
  
  // Validações básicas
  if (!payload.nome) {
    alert('Informe o nome do técnico');
    return;
  }
  
  if (!payload.especialidade) {
    alert('Selecione a especialidade');
    return;
  }
  
  try {
    let url = '/api/tecnicos/novo';
    let method = 'POST';
    
    // Se estiver editando, muda a URL para a rota de edição
    if (form.dataset.mode === 'edit' && form.dataset.id) {
      url = '/api/tecnicos/' + form.dataset.id + '/editar';
      method = 'POST';
    }
    
    console.log('Request:', method, url);
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('✅ Salvo com sucesso!');
      await refreshTecnicos();
      closeModalTecnico();
    } else {
      console.error('❌ Erro na resposta:', response.status);
      const errorData = await response.json();
      alert('Erro ao salvar técnico: ' + (errorData.error || 'Erro desconhecido'));
    }
  } catch (err) {
    console.error('❌ Erro ao salvar:', err);
    alert('Erro ao salvar técnico: ' + err.message);
  }
}

async function excluirTecnico(id) {
  if (!confirm('Confirmar exclusão do técnico?')) return;
  
  console.log('🗑️ Excluindo técnico ID:', id);
  
  try {
    const response = await fetch('/api/tecnicos/' + id, { method: 'DELETE' });
    if (response.ok) {
      console.log('✅ Excluído com sucesso!');
      await refreshTecnicos();
    } else {
      alert('Erro ao excluir técnico');
    }
  } catch (err) {
    console.error('❌ Erro ao excluir:', err);
    alert('Erro ao excluir técnico');
  }
}

function bindEvents() {
  console.log('🔗 Vinculando eventos...');
  
  // Botão de adicionar novo técnico
  const btnAdd = document.getElementById('btnAddTecnico');
  if (btnAdd) {
    console.log('✅ Botão ADD encontrado');
    btnAdd.addEventListener('click', prepareModalForNew);
  } else {
    console.error('❌ Botão ADD NÃO encontrado!');
  }
  
  // Botão de fechar modal (X)
  const btnClose = document.getElementById('closeModalTecnico');
  if (btnClose) {
    btnClose.addEventListener('click', closeModalTecnico);
  }
  
  // Botão cancelar do formulário
  const btnCancel = document.getElementById('btnCancelTecnico');
  if (btnCancel) {
    btnCancel.addEventListener('click', closeModalTecnico);
  }
  
  // Submit do formulário
  const form = document.getElementById('formTecnico');
  if (form) {
    console.log('✅ Form encontrado');
    form.addEventListener('submit', salvarTecnico);
  } else {
    console.error('❌ Form NÃO encontrado!');
  }
  
  // Eventos dos botões de ação na tabela (Ver/Editar/Excluir)
  const tbody = document.getElementById('tecnicosTableBody');
  if (tbody) {
    tbody.addEventListener('click', function(event) {
      const btn = event.target.closest('.btn-action');
      if (!btn) return;
      
      const id = btn.getAttribute('data-id');
      if (!id) return;
      
      if (btn.classList.contains('btn-view')) {
        openViewTecnico(id);
      } else if (btn.classList.contains('btn-edit')) {
        prepareModalForEdit(id);
      } else if (btn.classList.contains('btn-delete')) {
        excluirTecnico(id);
      }
    });
  }
}

function aplicarFiltros() {
  const searchTerm = document.getElementById('searchTecnico').value.toLowerCase();
  const especialidadeSel = document.getElementById('filterEspecialidade').value.toLowerCase();
  const statusSel = document.getElementById('filterStatus').value.toLowerCase();
  
  const filtrados = tecnicos.filter(function(tec) {
    const matchSearch = !searchTerm || 
      tec.nome.toLowerCase().includes(searchTerm) ||
      tec.especialidade.toLowerCase().includes(searchTerm) ||
      (tec.empresa && tec.empresa.toLowerCase().includes(searchTerm));
    
    const matchEspecialidade = !especialidadeSel || 
      tec.especialidade.toLowerCase() === especialidadeSel;
    
    const matchStatus = !statusSel || 
      tec.status.toLowerCase() === statusSel;
    
    return matchSearch && matchEspecialidade && matchStatus;
  });
  
  tecnicosFiltrados = filtrados;
  renderTable(tecnicosFiltrados);
  updateCounters(tecnicosFiltrados.length);
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando técnicos...');
  bindEvents();
  refreshTecnicos();
  
  const searchInput = document.getElementById('searchTecnico');
  const filterEsp = document.getElementById('filterEspecialidade');
  const filterSt = document.getElementById('filterStatus');
  
  if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
  if (filterEsp) filterEsp.addEventListener('change', aplicarFiltros);
  if (filterSt) filterSt.addEventListener('change', aplicarFiltros);
});
  
  tecnicosFiltrados = filtrados;
  renderTable(tecnicosFiltrados);
  updateCounters(tecnicosFiltrados.length);
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando técnicos...');
  bindEvents();
  refreshTecnicos();
  
  const searchInput = document.getElementById('searchTecnico');
  const filterEsp = document.getElementById('filterEspecialidade');
  const filterSt = document.getElementById('filterStatus');
  
  if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
  if (filterEsp) filterEsp.addEventListener('change', aplicarFiltros);
  if (filterSt) filterSt.addEventListener('change', aplicarFiltros);
});
  tecnicosFiltrados = filtrados;
  renderTable(tecnicosFiltrados);
  updateCounters(tecnicosFiltrados.length);
}

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando técnicos...');
  bindEvents();
  refreshTecnicos();
  
  // Adiciona eventos nos campos de filtro
  const searchInput = document.getElementById('searchTecnico');
  const filterEsp = document.getElementById('filterEspecialidade');
  const filterSt = document.getElementById('filterStatus');
  
  if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
  if (filterEsp) filterEsp.addEventListener('change', aplicarFiltros);
  if (filterSt) filterSt.addEventListener('change', aplicarFiltros);
});
