// static/js/usuarios.js

// URL base da API de usuários
const API_BASE = '/api/usuarios';

// Array global que armazena todos os usuários carregados
let todosUsuarios = [];

// ========== FORMATAÇÃO ==========
function formatarData(dataISO) {
  if (!dataISO) return '-';
  try {
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  } catch (e) {
    return dataISO;
  }
}

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

// ========== FETCH COM RETRY ==========
async function fetchWithRetry(url, options = {}, attempts = 2, backoff = 400) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...options
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      } else {
        return null;
      }
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, backoff * (i + 1)));
      }
    }
  }
  throw lastErr;
}

// ========== TABELA DE USUÁRIOS ==========
function renderUsuariosTable(usuarios) {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;

  if (!usuarios || usuarios.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="8">
          <div class="empty-message">
            <span class="empty-icon"></span>
            <p>Nenhum usuário encontrado</p>
            <button class="btn-empty-action" id="btnAddPrimeiroUsuario" type="button">
              Cadastrar Primeiro Usuário
            </button>
          </div>
        </td>
      </tr>`;
    const btnPrimeiro = document.getElementById('btnAddPrimeiroUsuario');
    if (btnPrimeiro) {
      btnPrimeiro.addEventListener('click', () => {
        const form = document.getElementById('formUsuario');
        form.reset();
        form.removeAttribute('data-id');
        document.getElementById('modalUsuarioTitle').textContent = 'Cadastrar Usuário';
        window.openModal('modalUsuario');
      });
    }
    return;
  }

  tbody.innerHTML = usuarios.map(u => `
    <tr data-user-id="${u.id}">
      <td>#${u.id}</td>
      <td><strong>${u.nome || ''}</strong></td>
      <td>${u.email || ''}</td>
      <td>${mascaraTelefone(u.telefone || '') || '-'}</td>
      <td>
        <span class="perfil-badge perfil-${u.perfil}">
          ${u.perfil === 'admin' ? 'Administrador' : 'Usuário Comum'}
        </span>
      </td>
      <td>
        <span class="status-badge status-${u.status || 'ativo'}">
          ${u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Ativo'}
        </span>
      </td>
      <td>${formatarData(u.ultimoAcesso)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-edit" data-id="${u.id}" type="button"
                  aria-label="Editar usuário">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-action btn-delete" data-id="${u.id}" type="button"
                  aria-label="Excluir usuário">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  conectarEventosBotoes();
}

// ========== AÇÕES DA TABELA ==========
function conectarEventosBotoes() {
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => editarUsuario(btn.getAttribute('data-id'));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => excluirUsuario(btn.getAttribute('data-id'));
  });
}

// Busca dados do usuário e abre modal para edição
async function editarUsuario(id) {
  try {
    const resp = await fetchWithRetry(`${API_BASE}/${id}`);
    if (resp && resp.success && resp.usuario) {
      const u = resp.usuario;

      document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuário';
      document.getElementById('usuarioNome').value = u.nome || '';
      document.getElementById('usuarioEmail').value = u.email || '';
      document.getElementById('usuarioTelefone').value = mascaraTelefone(u.telefone || '');
      document.getElementById('usuarioSenha').value = '';
      document.getElementById('usuarioAdmin').checked =
        u.perfil === 'admin' || u.admin == 1;
      document.getElementById('formUsuario').dataset.id = u.id;

      window.openModal('modalUsuario');
    }
  } catch (error) {
    console.error('❌ Erro ao editar usuário:', error);
    alert('Erro ao carregar dados do usuário');
  }
}

// Exclui usuário após confirmação
async function excluirUsuario(id) {
  if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
  try {
    await fetchWithRetry(`${API_BASE}/${id}`, { method: 'DELETE' });
    await carregarUsuarios();
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    alert('Erro ao excluir usuário');
  }
}

// ========== CARREGAR / RESUMO ==========
async function carregarUsuarios() {
  try {
    const payload = await fetchWithRetry(API_BASE);
    todosUsuarios = Array.isArray(payload) ? payload : (payload?.usuarios || []);
    renderUsuariosTable(todosUsuarios);
    atualizarResumo(todosUsuarios);
  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    alert('Erro ao carregar lista de usuários');
  }
}

function atualizarResumo(usuarios) {
  document.getElementById('total-usuarios').textContent = usuarios.length;
  document.getElementById('usuarios-admin').textContent =
    usuarios.filter(u => u.perfil === 'admin').length;
  document.getElementById('usuarios-normais').textContent =
    usuarios.filter(u => u.perfil === 'usuario').length;
  document.getElementById('usuarios-ativos').textContent =
    usuarios.filter(u => u.status === 'ativo').length;
  document.getElementById('tableCountUsuarios').textContent =
    `${usuarios.length} usuários encontrados`;
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  carregarUsuarios();

  document.getElementById('btnAddUsuario').onclick = () => {
    const form = document.getElementById('formUsuario');
    form.reset();
    form.removeAttribute('data-id');
    document.getElementById('modalUsuarioTitle').textContent = 'Cadastrar Usuário';
    window.openModal('modalUsuario');
  };

  document.getElementById('btnCancelUsuario').onclick = () => window.closeModal('modalUsuario');
  document.getElementById('closeModalUsuario').onclick = () => window.closeModal('modalUsuario');

  // máscara no input de telefone
  document.getElementById('usuarioTelefone')
    ?.addEventListener('input', e => {
      e.target.value = mascaraTelefone(e.target.value);
    });

  // submit do formulário
  document.getElementById('formUsuario').onsubmit = async function (e) {
    e.preventDefault();

    const idEdit = this.dataset.id;
    const payload = {
      nome: document.getElementById('usuarioNome').value.trim(),
      email: document.getElementById('usuarioEmail').value.trim(),
      telefone: document.getElementById('usuarioTelefone').value.replace(/\D/g, ''), // só dígitos
      senha: document.getElementById('usuarioSenha').value,
      admin: document.getElementById('usuarioAdmin').checked
    };

    try {
      let resp;
      if (idEdit) {
        resp = await fetchWithRetry(`${API_BASE}/${idEdit}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        resp = await fetchWithRetry('/api/admin/usuarios/novo', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (resp && resp.success === false) {
        alert(resp.error || 'Erro ao salvar usuário (API retornou falha).');
        return;
      }

      window.closeModal('modalUsuario');
      await carregarUsuarios();
    } catch (error) {
      console.error('❌ Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    }
  };

  document.getElementById('searchUsuario').addEventListener('input', function () {
    const q = (this.value + '').toLowerCase().trim();
    let list = todosUsuarios;

    if (q) {
      list = list.filter(u =>
        (u.nome || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.perfil || '').toLowerCase().includes(q)
      );
    }
    renderUsuariosTable(list);
  });

  document.getElementById('filterPerfil').addEventListener('change', function () {
    const v = this.value;
    let list = todosUsuarios;
    if (v) list = list.filter(u => u.perfil === v);
    renderUsuariosTable(list);
  });

  document.getElementById('filterStatus').addEventListener('change', function () {
    const v = this.value;
    let list = todosUsuarios;
    if (v) list = list.filter(u => u.status === v);
    renderUsuariosTable(list);
  });
});
