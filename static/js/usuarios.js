// static/js/usuarios.js

const API_BASE = '/api/usuarios';
let todosUsuarios = [];

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

function renderUsuariosTable(usuarios) {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;
  
  if (!usuarios || usuarios.length === 0) {
    tbody.innerHTML = `<tr class="empty-state">
      <td colspan="8">
        <div class="empty-message">
          <span class="empty-icon"></span>
          <p>Nenhum usuário encontrado</p>
          <button class="btn-empty-action" id="btnAddPrimeiroUsuario" type="button">Cadastrar Primeiro Usuário</button>
        </div>
      </td>
    </tr>`;
    document.getElementById('btnAddPrimeiroUsuario')?.addEventListener('click', () => openModal('modalUsuario'));
    return;
  }
  
  tbody.innerHTML = usuarios.map(u => `
    <tr data-user-id="${u.id}">
      <td>#${u.id}</td>
      <td><strong>${u.nome || ''}</strong></td>
      <td>${u.email || ''}</td>
      <td>${u.telefone || '-'}</td>
      <td><span class="perfil-badge perfil-${u.perfil}">${u.perfil === 'admin' ? 'Administrador' : 'Usuário Comum'}</span></td>
      <td><span class="status-badge status-${u.status || 'ativo'}">${u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Ativo'}</span></td>
      <td>${formatarData(u.ultimoAcesso)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-edit" data-id="${u.id}">Editar</button>
          <button class="btn-action btn-delete" data-id="${u.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
  
  conectarEventosBotoes();
}

function conectarEventosBotoes() {
  document.querySelectorAll('.btn-edit').forEach(btn =>
    btn.onclick = () => editarUsuario(btn.getAttribute('data-id')));
  document.querySelectorAll('.btn-delete').forEach(btn =>
    btn.onclick = () => excluirUsuario(btn.getAttribute('data-id')));
}

async function editarUsuario(id) {
  try {
    const resp = await fetchWithRetry(`${API_BASE}/${id}`);
    
    if (resp.success && resp.usuario) {
      const u = resp.usuario;
      
      document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuário';
      document.getElementById('usuarioNome').value = u.nome || '';
      document.getElementById('usuarioEmail').value = u.email || '';
      document.getElementById('usuarioTelefone').value = u.telefone || '';
      document.getElementById('usuarioSenha').value = '';
      document.getElementById('usuarioAdmin').checked = u.perfil === 'admin' || u.admin == 1;
      document.getElementById('formUsuario').dataset.id = u.id;
      
      openModal('modalUsuario');
    }
  } catch (error) {
    console.error('❌ Erro ao editar usuário:', error);
    alert('Erro ao carregar dados do usuário');
  }
}

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

async function carregarUsuarios() {
  try {
    const payload = await fetchWithRetry(API_BASE);
    todosUsuarios = Array.isArray(payload) ? payload : payload.usuarios || [];
    renderUsuariosTable(todosUsuarios);
    atualizarResumo(todosUsuarios);
  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    alert('Erro ao carregar lista de usuários');
  }
}

function atualizarResumo(usuarios) {
  document.getElementById('total-usuarios').textContent = usuarios.length;
  document.getElementById('usuarios-admin').textContent = usuarios.filter(u => u.perfil === 'admin').length;
  document.getElementById('usuarios-normais').textContent = usuarios.filter(u => u.perfil === 'usuario').length;
  document.getElementById('usuarios-ativos').textContent = usuarios.filter(u => u.status === 'ativo').length;
  document.getElementById('tableCountUsuarios').textContent = `${usuarios.length} usuários encontrados`;
}

document.addEventListener('DOMContentLoaded', () => {
  carregarUsuarios();
  
  document.getElementById('btnAddUsuario').onclick = () => {
    document.getElementById('formUsuario').reset();
    document.getElementById('formUsuario').removeAttribute('data-id');
    document.getElementById('modalUsuarioTitle').textContent = 'Cadastrar Usuário';
    openModal('modalUsuario');
  };
  
  document.getElementById('btnCancelUsuario').onclick = () => closeModal('modalUsuario');
  
  document.getElementById('formUsuario').onsubmit = async function(e) {
    e.preventDefault();
    
    const idEdit = this.dataset.id;
    const payload = {
      nome: document.getElementById('usuarioNome').value.trim(),
      email: document.getElementById('usuarioEmail').value.trim(),
      telefone: document.getElementById('usuarioTelefone').value.trim(),
      senha: document.getElementById('usuarioSenha').value,
      admin: document.getElementById('usuarioAdmin').checked
    };
    
    try {
      if (idEdit) {
        await fetchWithRetry(`${API_BASE}/${idEdit}`, { 
          method: 'PUT', 
          body: JSON.stringify(payload) 
        });
      } else {
        await fetchWithRetry(`${API_BASE}/novo`, { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        });
      }
      
      closeModal('modalUsuario');
      await carregarUsuarios();
    } catch (error) {
      console.error('❌ Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    }
  };
  
  // Filtros
  document.getElementById('searchUsuario').addEventListener('input', function() {
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
  
  document.getElementById('filterPerfil').addEventListener('change', function() {
    const v = this.value;
    let list = todosUsuarios;
    if (v) list = list.filter(u => u.perfil === v);
    renderUsuariosTable(list);
  });
  
  document.getElementById('filterStatus').addEventListener('change', function() {
    const v = this.value;
    let list = todosUsuarios;
    if (v) list = list.filter(u => u.status === v);
    renderUsuariosTable(list);
  });
});
