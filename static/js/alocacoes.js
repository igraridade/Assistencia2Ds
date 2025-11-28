const API_BASE = '/api/alocacoes';
let alocacoesCache = [];
let servicosCache = [];

// ========== UTILITÁRIOS ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function mostrarErro(mensagem) {
  const errDiv = document.getElementById('alocacaoError');
  errDiv.textContent = mensagem;
  errDiv.style.display = 'block';
  setTimeout(() => { errDiv.style.display = 'none'; }, 5000);
}

// ========== CARREGAR SELECTS ==========
async function carregarServicos() {
  const select = document.getElementById('servicoAlocacao');
  select.innerHTML = '<option value="">Carregando serviços...</option>';
  
  try {
    const resp = await fetch('/api/servicos');
    const data = await resp.json();
    
    select.innerHTML = '<option value="">Selecione um serviço...</option>';
    
    if (data.servicos && data.servicos.length > 0) {
      servicosCache = data.servicos;
      data.servicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.protocolo;
        opt.dataset.status = s.status || 'aberta';
        opt.dataset.empresa = s.id_empresa_cliente_fk || '';
        opt.textContent = `#${s.protocolo} - ${s.problema || 'Sem descrição'}`;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">Nenhum serviço disponível</option>';
    }
  } catch (err) {
    console.error('Erro ao carregar serviços:', err);
    select.innerHTML = '<option value="">Erro ao carregar serviços</option>';
  }
}

async function carregarTecnicos() {
  const select = document.getElementById('tecnicoAlocacao');
  select.innerHTML = '<option value="">Carregando técnicos...</option>';
  
  try {
    const resp = await fetch('/api/tecnicos');
    const data = await resp.json();
    
    select.innerHTML = '<option value="">Selecione um técnico...</option>';
    
    if (data.tecnicos && data.tecnicos.length > 0) {
      data.tecnicos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id_tecnico;
        opt.textContent = `${t.nome} - ${t.especialidade || 'Geral'}`;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">Nenhum técnico disponível</option>';
    }
  } catch (err) {
    console.error('Erro ao carregar técnicos:', err);
    select.innerHTML = '<option value="">Erro ao carregar técnicos</option>';
  }
}

async function carregarEmpresaDoServico(idEmpresa) {
  if (!idEmpresa) {
    document.getElementById('empresaExibicao').value = 'Não vinculado';
    return;
  }
  
  try {
    const resp = await fetch('/api/empresas');
    const data = await resp.json();
    
    if (data.empresas && data.empresas.length > 0) {
      const empresa = data.empresas.find(e => e.id_empresa_cliente == idEmpresa);
      document.getElementById('empresaExibicao').value = empresa ? empresa.nome : 'Não encontrada';
    }
  } catch (err) {
    console.error('Erro ao carregar empresa:', err);
    document.getElementById('empresaExibicao').value = 'Erro ao carregar';
  }
}

// Atualizar status e empresa ao selecionar serviço
document.getElementById('servicoAlocacao').addEventListener('change', function() {
  const selectedOption = this.options[this.selectedIndex];
  const status = selectedOption.dataset.status || 'aberta';
  const idEmpresa = selectedOption.dataset.empresa || '';
  
  document.getElementById('statusExibicao').value = status.charAt(0).toUpperCase() + status.slice(1);
  carregarEmpresaDoServico(idEmpresa);
});

// ========== MODAL ==========
async function openAlocacaoModal(editData = null) {
  await carregarServicos();
  await carregarTecnicos();
  
  document.getElementById('formAlocacao').reset();
  document.getElementById('idAlocacao').value = editData?.id_alocacao ?? "";
  document.getElementById('modalAlocacaoTitle').textContent = editData ? "Editar Alocação" : "Nova Alocação";
  document.getElementById('statusExibicao').value = '';
  document.getElementById('empresaExibicao').value = '';
  
  if (editData) {
    document.getElementById('servicoAlocacao').value = editData.protocolo ?? "";
    document.getElementById('tecnicoAlocacao').value = editData.id_tecnico ?? "";
    document.getElementById('dataAlocacao').value = editData.data_alocacao ? editData.data_alocacao.split('T')[0] : "";
    document.getElementById('statusExibicao').value = editData.status ? editData.status.charAt(0).toUpperCase() + editData.status.slice(1) : '';
    document.getElementById('empresaExibicao').value = editData.empresa_nome || 'Não vinculado';
  }
  
  openModal('modalAlocacao');
}

function closeAlocacaoModal() {
  closeModal(document.getElementById('modalAlocacao'));
}

// ========== EVENTOS ==========
document.getElementById('btnAddAlocacao').addEventListener('click', () => openAlocacaoModal());
document.getElementById('closeModalAlocacao').addEventListener('click', closeAlocacaoModal);

document.getElementById('modalAlocacao').addEventListener('click', (e) => {
  if (e.target.id === 'modalAlocacao') closeAlocacaoModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('modalAlocacao').getAttribute('aria-hidden') === 'false') {
    closeAlocacaoModal();
  }
});

document.getElementById('formAlocacao').addEventListener('submit', async function(e){
  e.preventDefault();
  
  const btnSalvar = document.getElementById('btnSalvarAlocacao');
  const textoOriginal = btnSalvar.textContent;
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';
  
  const id = document.getElementById('idAlocacao').value;
  const payload = {
    servico_protocolo: document.getElementById('servicoAlocacao').value,
    id_tecnico: document.getElementById('tecnicoAlocacao').value,
    data_alocacao: document.getElementById('dataAlocacao').value || null
  };
  
  if (!payload.servico_protocolo) {
    mostrarErro('Selecione um serviço');
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
    return;
  }
  
  if (!payload.id_tecnico) {
    mostrarErro('Selecione um técnico');
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
    return;
  }
  
  try {
    let resp;
    if(id){
      resp = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
    } else {
      resp = await fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
    }
    
    const result = await resp.json();
    
    if(!resp.ok) {
      throw new Error(result.error || "Erro ao salvar alocação");
    }
    
    closeAlocacaoModal();
    await loadAlocacoes();
  } catch (err) {
    console.error('Erro ao salvar:', err);
    mostrarErro(err.message || 'Falha ao salvar alocação');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = textoOriginal;
  }
});

// ========== DELETE ==========
async function deletarAlocacao(id) {
  try {
    const resp = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    const result = await resp.json();
    
    if (!resp.ok) {
      throw new Error(result.error || 'Erro ao deletar');
    }
    
    await loadAlocacoes();
  } catch (err) {
    alert('Erro ao deletar alocação: ' + err.message);
  }
}

// ========== MUDAR STATUS ==========
async function mudarStatus(id, novoStatus) {
  try {
    const resp = await fetch(`${API_BASE}/${id}/${novoStatus}`, { 
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    });
    const result = await resp.json();
    
    if (!resp.ok) {
      throw new Error(result.error || 'Erro ao alterar status');
    }
    
    await loadAlocacoes();
  } catch (err) {
    alert('Erro ao alterar status: ' + err.message);
  }
}

// ========== RESUMO ==========
function atualizarCardsResumo(dados) {
  document.getElementById('total-alocacoes').textContent = dados.total;
  document.getElementById('alocacoes-hoje').textContent = dados.hoje;
  document.getElementById('tecnicos-alocados').textContent = dados.tecnicos;
  document.getElementById('servicos-ativos').textContent = dados.servicosAtivos;
}

// ========== FILTROS ==========
function filtrarAlocacoes() {
  const searchTerm = document.getElementById('searchAlocacao').value.toLowerCase();
  const statusFilter = document.getElementById('filterStatus').value;
  
  let filtradas = alocacoesCache;
  
  if (searchTerm) {
    filtradas = filtradas.filter(a =>
      (a.tecnico_nome || '').toLowerCase().includes(searchTerm) ||
      (a.servico_nome || '').toLowerCase().includes(searchTerm) ||
      (a.protocolo || '').toString().includes(searchTerm)
    );
  }
  
  if (statusFilter) {
    filtradas = filtradas.filter(a => a.status === statusFilter);
  }
  
  renderTabela(filtradas);
}

// ========== DROPDOWN ==========
function inicializarDropdowns() {
  // Fechar todos os dropdowns ao clicar fora
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });
  
  // Toggle dropdown ao clicar no botão
  document.querySelectorAll('.btn-dropdown').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const menu = this.nextElementSibling;
      const isOpen = menu.classList.contains('show');
      
      // Fechar todos os outros
      document.querySelectorAll('.dropdown-menu').forEach(m => {
        m.classList.remove('show');
      });
      
      // Toggle este
      if (!isOpen) {
        menu.classList.add('show');
      }
    });
  });
  
  // Ações do menu
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      const action = this.dataset.action;
      const row = this.closest('tr');
      const id = row.getAttribute('data-id');
      
      // Fechar menu
      this.closest('.dropdown-menu').classList.remove('show');
      
      // Executar ação
      if (action === 'delete') {
        if (confirm(`Deseja realmente excluir a alocação #${id}?`)) {
          deletarAlocacao(id);
        }
      } else if (action === 'concluir') {
        if (confirm('Marcar este serviço como concluído?')) {
          mudarStatus(id, action);
        }
      } else if (action === 'pendente') {
        if (confirm('Marcar este serviço como pendente?')) {
          mudarStatus(id, action);
        }
      } else if (action === 'reabrir') {
        if (confirm('Reabrir este serviço?')) {
          mudarStatus(id, action);
        }
      } else {
        mudarStatus(id, action);
      }
    });
  });
  
  // Evento de edição
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.closest('tr').getAttribute('data-id');
      const data = alocacoesCache.find(x => x.id_alocacao == id);
      if (data) openAlocacaoModal(data);
    });
  });
}

// ========== RENDERIZAÇÃO ==========
function renderTabela(lista) {
  const tbody = document.getElementById('alocacoesTableBody');
  
  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px; color:#999;">
          Nenhuma alocação encontrada.
        </td>
      </tr>
    `;
    document.getElementById('tableCount').textContent = '0 alocações encontradas';
    return;
  }
  
  tbody.innerHTML = lista.map(al => {
    const status = al.status || 'aberta';
    
    // Menu de ações baseado no status
    let opcoesMenu = '';
    
    if (status === 'aberta') {
      opcoesMenu = `
        <div class="dropdown-item" data-action="em-andamento">▶️ Iniciar</div>
        <div class="dropdown-item" data-action="pendente">⏸️ Marcar como Pendente</div>
      `;
    } else if (status === 'em andamento') {
      opcoesMenu = `
        <div class="dropdown-item" data-action="pendente">⏸️ Marcar como Pendente</div>
        <div class="dropdown-item" data-action="concluir">✅ Concluir</div>
      `;
    } else if (status === 'pendente') {
      opcoesMenu = `
        <div class="dropdown-item" data-action="em-andamento">▶️ Retomar</div>
        <div class="dropdown-item" data-action="concluir">✅ Concluir</div>
      `;
    } else if (status === 'concluida') {
      opcoesMenu = `
        <div class="dropdown-item" data-action="reabrir">🔄 Reabrir</div>
      `;
    }
    
    return `
      <tr data-id="${al.id_alocacao}">
        <td><strong>#${al.id_alocacao}</strong></td>
        <td>${al.protocolo ?? "-"}</td>
        <td>${al.servico_nome ?? "-"}</td>
        <td>${al.tecnico_nome ?? "-"}</td>
        <td>${al.empresa_nome ?? "-"}</td>
        <td><span class="badge badge-${status.replace(' ', '-')}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td>${al.data_alocacao ? new Date(al.data_alocacao).toLocaleDateString("pt-BR") : "-"}</td>
        <td class="td-actions">
          <button class="btn-action btn-edit" type="button" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <div class="dropdown">
            <button class="btn-action btn-dropdown" type="button" title="Mais ações">⋮</button>
            <div class="dropdown-menu">
              ${opcoesMenu}
              <div class="dropdown-divider"></div>
              <div class="dropdown-item dropdown-item-danger" data-action="delete">🗑️ Excluir</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('tableCount').textContent = `${lista.length} alocações encontradas`;
  
  // Adicionar evento de clique para dropdowns
  inicializarDropdowns();
}

// ========== LISTAGEM ==========
async function loadAlocacoes(){
  try {
    const resp = await fetch(API_BASE);
    const result = await resp.json();
    alocacoesCache = result?.alocacoes ?? [];
    
    renderTabela(alocacoesCache);
    
    // Calcular resumo
    const total = alocacoesCache.length;
    const hoje = alocacoesCache.filter(a =>
      new Date(a.data_alocacao).toDateString() === new Date().toDateString()
    ).length;
    const tecnicosUnicos = [...new Set(alocacoesCache.map(a => a.tecnico_nome))].filter(Boolean).length;
    const servicosAtivos = [...new Set(alocacoesCache.map(a => a.protocolo))].filter(Boolean).length;
    
    atualizarCardsResumo({
      total,
      hoje,
      tecnicos: tecnicosUnicos,
      servicosAtivos
    });
  } catch (err) {
    console.error('Erro ao carregar alocações:', err);
    document.getElementById('alocacoesTableBody').innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px; color:red;">
          Erro ao carregar alocações. Tente novamente.
        </td>
      </tr>
    `;
    atualizarCardsResumo({total:0, hoje:0, tecnicos:0, servicosAtivos:0});
  }
}

// ========== EVENTOS DE FILTRO ==========
document.getElementById('searchAlocacao').addEventListener('input', debounce(filtrarAlocacoes, 300));
document.getElementById('filterStatus').addEventListener('change', filtrarAlocacoes);

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', loadAlocacoes);
