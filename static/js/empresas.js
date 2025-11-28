// ========== UTIL ==========
const $ = (sel) => document.querySelector(sel);
const API_BASE_EMPRESAS = '/api/empresas';
let todasEmpresas = [];

// Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ======= Máscaras =======
function mascaraCEP(valor) {
  valor = valor.replace(/\D/g, '');
  if (valor.length > 5) valor = valor.substring(0, 5) + '-' + valor.substring(5, 8);
  return valor;
}

function mascaraCNPJ(valor) {
  valor = valor.replace(/\D/g, '');
  if (valor.length <= 14) {
    valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
    valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
  }
  return valor;
}

function mascaraTelefone(valor) {
  valor = valor.replace(/\D/g, '');
  if (valor.length <= 10) {
    valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
    valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    valor = valor.replace(/^(\d{2})(\d)/, '($1) $2');
    valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
  }
  return valor;
}

// ========== API ==========
async function fetchWithRetry(url, options = {}, attempts = 2, backoff = 400) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, backoff * (i + 1)));
    }
  }
  throw lastErr;
}

// ======= Carregar Empresas =======
async function carregarEmpresas() {
  try {
    const data = await fetchWithRetry(API_BASE_EMPRESAS);
    todasEmpresas = Array.isArray(data?.empresas) ? data.empresas : [];
    aplicarFiltrosERender();
  } catch (err) {
    console.error('Erro ao carregar empresas:', err);
    alert('Erro ao carregar empresas: ' + err.message);
  }
}

function filtrarEmpresas() {
  const q = ($('#searchEmpresa')?.value || '').trim().toLowerCase();
  const contrato = $('#filterContrato')?.value || '';
  let lista = todasEmpresas.slice();
  
  if (q) {
    lista = lista.filter(e => {
      const nome = (e?.nome || '').toLowerCase();
      const cnpj = (e?.cnpj || '').toLowerCase();
      const email = (e?.email || '').toLowerCase();
      const endereco = e?.nome_logradouro ? `${e.logradouro} ${e.nome_logradouro} ${e.numero} ${e.cidade}`.toLowerCase() : '';
      return nome.includes(q) || cnpj.includes(q) || email.includes(q) || endereco.includes(q);
    });
  }
  
  if (contrato) {
    if (contrato === 'ativo') lista = lista.filter(e => Number(e?.contratos || 0) > 0);
    else if (contrato === 'inativo') lista = lista.filter(e => Number(e?.contratos || 0) === 0);
  }
  
  return lista;
}

function aplicarFiltrosERender() {
  const filtradas = filtrarEmpresas();
  renderEmpresasTable(filtradas);
  atualizarResumo();
}

function renderEmpresasTable(empresas) {
  const tbody = $('#empresasTableBody');
  if (!tbody) return;
  
  if (!empresas || empresas.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">Nenhuma empresa cadastrada ainda</td>
      </tr>
    `;
    $('#tableCountEmpresas').textContent = '0 empresas encontradas';
    return;
  }

  tbody.innerHTML = '';
  empresas.forEach(emp => {
    const tr = document.createElement('tr');
    tr.dataset.id = emp.id_empresa_cliente;
    
    const endereco = emp.nome_logradouro 
      ? `${emp.logradouro || ''} ${emp.nome_logradouro}, ${emp.numero || 'S/N'} - ${emp.cidade || ''}/${emp.estado || ''}`.trim()
      : '-';
    
    tr.innerHTML = `
      <td>#${emp.id_empresa_cliente}</td>
      <td>${emp.nome || '-'}</td>
      <td>${emp.cnpj || '-'}</td>
      <td>${emp.telefone || '-'}</td>
      <td>${endereco}</td>
      <td>${emp.contratos ?? 0}</td>
      <td class="td-actions">
        <div class="table-actions">
          <button type="button" class="btn-action btn-edit" data-id="${emp.id_empresa_cliente}" title="Editar">Editar</button>
          <button type="button" class="btn-action btn-delete" data-id="${emp.id_empresa_cliente}" title="Excluir">Excluir</button>
          <button type="button" class="btn-action btn-usuarios" data-id="${emp.id_empresa_cliente}" title="Usuários">Usuários</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  $('#tableCountEmpresas').textContent = `${empresas.length} empresa${empresas.length !== 1 ? 's' : ''} encontrad${empresas.length === 1 ? 'a' : 'as'}`;
}

// ========== Resumo =======
function atualizarResumo() {
  const total = todasEmpresas.length;
  const comContrato = todasEmpresas.filter(e => Number(e?.contratos || 0) > 0).length;
  const semContrato = total - comContrato;
  const ativas = todasEmpresas.filter(e =>
    e?.ativa === 1 || e?.ativa === true ||
    String(e?.status || '').toLowerCase().includes('ativa') ||
    String(e?.status || '').toLowerCase().includes('ativo')
  ).length || total;
  
  $('#total-empresas').textContent = total;
  $('#empresas-contratos').textContent = comContrato;
  $('#empresas-sem-contrato').textContent = semContrato;
  $('#empresas-ativas').textContent = ativas;
}

// ========== MODAL ==========
function openModal() {
  const modal = $('#modalEmpresa');
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = $('#modalEmpresa');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  limparFormulario();
}

function limparFormulario() {
  const form = $('#formEmpresa');
  if (form) {
    form.reset();
    delete form.dataset.empresaId;
  }
  $('#modalEmpresaTitle').textContent = 'Cadastrar Empresa';
  const err = $('#empresaError');
  if (err) err.textContent = '';
}

// ========== CRUD ==========
async function buscarCEP(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) throw new Error('CEP inválido! Digite os 8 dígitos.');
  const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  const data = await response.json();
  if (data.erro) throw new Error('CEP não encontrado!');
  return data;
}

async function salvarEmpresa(formData) {
  const empresaId = $('#formEmpresa')?.dataset.empresaId;
  const url = empresaId ? `${API_BASE_EMPRESAS}/${empresaId}` : `${API_BASE_EMPRESAS}/novo`;
  const method = empresaId ? 'PUT' : 'POST';
  
  await fetchWithRetry(url, {
    method,
    body: JSON.stringify(formData)
  });
}

async function excluirEmpresa(id) {
  await fetchWithRetry(`${API_BASE_EMPRESAS}/${id}`, { method: 'DELETE' });
}

// Modal Usuários
async function abrirModalUsuariosEmpresa(idEmpresa) {
  const modal = $('#modalUsuariosEmpresa');
  const wrapper = $('#usuariosEmpresaCardBody');
  wrapper.innerHTML = '<div class="loading-state">Carregando usuários...</div>';
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  try {
    const resp = await fetch(`/api/empresa/${idEmpresa}/usuarios`);
    const data = await resp.json();
    if (data.success && data.usuarios?.length > 0) {
      wrapper.innerHTML = data.usuarios.map(u => `
        <div class="usuario-card">
          <div class="user-title">#${u.id_usuario} — ${u.nome || '-'}</div>
          <div class="user-info">
            <div><span class="user-label">Email:</span> ${u.email || '-'}</div>
            <div><span class="user-label">Telefone:</span> ${u.telefone || '-'}</div>
            <div><span class="user-label">Perfil:</span> <span class="perfil-badge ${u.admin?'admin':'usuario'}">${u.admin?'Administrador':'Usuário'}</span></div>
          </div>
        </div>
      `).join('');
    } else {
      wrapper.innerHTML = '<div class="loading-state">Nenhum usuário cadastrado nesta empresa</div>';
    }
  } catch {
    wrapper.innerHTML = '<div class="loading-state">Erro ao carregar usuários</div>';
  }
}

// ========== EVENTOS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Carregar empresas
  carregarEmpresas();

  // Filtros
  $('#searchEmpresa')?.addEventListener('input', debounce(aplicarFiltrosERender, 300));
  $('#filterContrato')?.addEventListener('change', aplicarFiltrosERender);

  // Botão Nova Empresa
  $('#btnAddEmpresa')?.addEventListener('click', () => {
    limparFormulario();
    $('#modalEmpresaTitle').textContent = 'Cadastrar Empresa';
    openModal();
  });

  // Fechar modais
  $('#closeModalEmpresa')?.addEventListener('click', closeModal);
  $('#btnCancelEmpresa')?.addEventListener('click', closeModal);
  $('#closeModalUsuariosEmpresa')?.addEventListener('click', () => {
    const modal = $('#modalUsuariosEmpresa');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  });

  // Clique fora do modal
  $('#modalEmpresa')?.addEventListener('click', (e) => {
    if (e.target?.id === 'modalEmpresa') closeModal();
  });

  // ESC para fechar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modalEmpresa')?.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });

  // Delegação de eventos na tabela
  $('#empresasTableBody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const empresa = todasEmpresas.find(x => String(x.id_empresa_cliente) === String(id));
    if (!empresa) return;

    // Botão EDITAR
    if (btn.classList.contains('btn-edit')) {
      $('#empresaNome').value = empresa.nome || '';
      $('#empresaCnpj').value = empresa.cnpj || '';
      $('#empresaEmail').value = empresa.email || '';
      $('#empresaTelefone').value = empresa.telefone || '';
      $('#empresaCep').value = empresa.cep || '';
      $('#empresaTipoLogradouro').value = empresa.logradouro || '';
      $('#empresaNomeLogradouro').value = empresa.nome_logradouro || '';
      $('#empresaNumero').value = empresa.numero || '';
      $('#empresaComplemento').value = empresa.complemento || '';
      $('#empresaBairro').value = empresa.bairro || '';
      $('#empresaCidade').value = empresa.cidade || '';
      $('#empresaEstado').value = empresa.estado || '';
      $('#formEmpresa').dataset.empresaId = empresa.id_empresa_cliente;
      $('#modalEmpresaTitle').textContent = 'Editar Empresa';
      openModal();
    }
    // Botão EXCLUIR
    else if (btn.classList.contains('btn-delete')) {
      if (!confirm(`Tem certeza que deseja excluir a empresa "${empresa.nome}"?`)) return;
      try {
        await excluirEmpresa(id);
        await carregarEmpresas();
      } catch (err) {
        alert('Erro ao excluir empresa: ' + err.message);
      }
    }
    // Botão USUÁRIOS
    else if (btn.classList.contains('btn-usuarios')) {
      abrirModalUsuariosEmpresa(id);
    }
  });

  // Submit do formulário
  $('#formEmpresa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      nome: $('#empresaNome').value.trim(),
      cnpj: $('#empresaCnpj').value.trim(),
      email: $('#empresaEmail').value.trim(),
      telefone: $('#empresaTelefone').value.trim(),
      tipo_logradouro: $('#empresaTipoLogradouro').value,
      nome_logradouro: $('#empresaNomeLogradouro').value.trim(),
      numero: $('#empresaNumero').value.trim(),
      complemento: $('#empresaComplemento').value.trim(),
      bairro: $('#empresaBairro').value.trim(),
      cidade: $('#empresaCidade').value.trim(),
      estado: $('#empresaEstado').value,
      cep: $('#empresaCep').value.replace(/\D/g, '')
    };

    try {
      await salvarEmpresa(formData);
      await carregarEmpresas();
      closeModal();
    } catch (err) {
      const errEl = $('#empresaError');
      if (errEl) errEl.textContent = 'Erro ao salvar: ' + err.message;
    }
  });

  // Máscaras
  $('#empresaCnpj')?.addEventListener('input', e => e.target.value = mascaraCNPJ(e.target.value));
  $('#empresaCep')?.addEventListener('input', e => e.target.value = mascaraCEP(e.target.value));
  $('#empresaTelefone')?.addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));

  // Buscar CEP
  $('#btnBuscarCep')?.addEventListener('click', async () => {
    const cep = $('#empresaCep').value;
    try {
      const data = await buscarCEP(cep);
      if (data.logradouro) {
        let tipo = '';
        let nome = data.logradouro;
        const tipos = ['Avenida', 'Rua', 'Travessa', 'Alameda', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo'];
        for (const t of tipos) {
          if (data.logradouro.startsWith(t + ' ')) {
            tipo = t;
            nome = data.logradouro.substring(tipo.length + 1);
            break;
          }
        }
        $('#empresaTipoLogradouro').value = tipo;
        $('#empresaNomeLogradouro').value = nome;
      }
      $('#empresaBairro').value = data.bairro || '';
      $('#empresaCidade').value = data.localidade || '';
      $('#empresaEstado').value = data.uf || '';
      $('#empresaNumero')?.focus();
    } catch (err) {
      alert('Erro ao buscar CEP: ' + err.message);
    }
  });
});
