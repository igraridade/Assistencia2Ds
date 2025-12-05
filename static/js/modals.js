(function () {
  window.openModal = function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.setAttribute('aria-hidden', 'false');
    m.classList.add('is-open');
    document.body.classList.add('modal-open'); // ← ADICIONADO
    const first = m.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) setTimeout(() => first.focus(), 100);
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function closeModal(m) {
    if (typeof m === 'string') {
      m = document.getElementById(m);
    }
    if (!m) return;
    m.setAttribute('aria-hidden', 'true');
    m.classList.remove('is-open');
    document.body.classList.remove('modal-open'); // ← ADICIONADO
    document.body.style.overflow = '';
  };

  window.dadosEmpresaAPI = null;

  function formatarCNPJ(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length <= 14) {
      valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
      valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    input.value = valor;
  }

  async function consultarCNPJ() {
    const cnpjInput = document.getElementById('cadastro_empresa_cnpj');
    const cnpjStatus = document.getElementById('cnpj_status');
    const campoNome = document.getElementById('campo_nome_empresa');
    const campoEmailEmpresa = document.getElementById('campo_email_empresa');
    const inputNome = document.getElementById('cadastro_empresa_nome');
    const dadosEncontrados = document.getElementById('dados_empresa_encontrada');
    const empresaInfo = document.getElementById('empresa_info');
    if (!cnpjInput || !cnpjStatus || !campoNome || !inputNome) return;

    const cnpj = cnpjInput.value.replace(/\D/g, '');
    cnpjStatus.innerHTML = '';
    campoNome.style.display = 'none';
    if (campoEmailEmpresa) campoEmailEmpresa.style.display = 'none';
    dadosEncontrados.style.display = 'none';
    empresaInfo.innerHTML = '';
    inputNome.required = false;
    inputNome.value = '';
    window.dadosEmpresaAPI = null;

    if (cnpj.length !== 14) {
      if (cnpj.length > 0) {
        cnpjStatus.innerHTML = '<span style="color: #ef4444;">⚠️ CNPJ deve ter 14 dígitos</span>';
      }
      return;
    }

    cnpjStatus.innerHTML = '<span style="color: #3b82f6;">🔍 Consultando CNPJ na CNPJá...</span>';
    cnpjInput.disabled = true;

    try {
      const response = await fetch(`https://open.cnpja.com/office/${cnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      const data = await response.json();

      window.dadosEmpresaAPI = data;
      const nomeEmpresa = data.company?.name || data.alias || '';
      const emailEmpresa = Array.isArray(data.emails) && data.emails.length > 0 ? data.emails[0].address : '';
      const telefoneEmpresa = Array.isArray(data.phones) && data.phones.length > 0 ? `${data.phones[0].area}${data.phones[0].number}` : '';

      if (nomeEmpresa) inputNome.value = nomeEmpresa;
      inputNome.required = true;

      cnpjStatus.innerHTML = '<span style="color: #10b981;">✅ Dados encontrados na Receita Federal!</span>';

      let infoHTML = '<strong>📌 ' + nomeEmpresa + '</strong><br>';
      infoHTML += '<strong>CNPJ:</strong> ' + cnpj + '<br>';
      if (emailEmpresa) {
        infoHTML += '<strong>📧 Email:</strong> ' + emailEmpresa + '<br>';
      } else {
        infoHTML += '<strong>📧 Email:</strong> <span style="color: orange;">Não encontrado - informe abaixo</span><br>';
        if (campoEmailEmpresa) campoEmailEmpresa.style.display = 'block';
      }
      if (telefoneEmpresa) infoHTML += '<strong>📞 Telefone:</strong> ' + telefoneEmpresa + '<br>';
      if (data.address) {
        infoHTML += '<strong>📍 Endereço:</strong> ' + (data.address.street || '') + ', ' + (data.address.number || '') + ' - ' + (data.address.district || '') + ' - ' + (data.address.city || '') + '/' + (data.address.state || '') + ' - CEP: ' + (data.address.zip || '') + '<br>';
      }
      dadosEncontrados.style.display = 'block';
      empresaInfo.innerHTML = infoHTML;
      campoNome.style.display = nomeEmpresa ? 'none' : 'block';

    } catch (error) {
      cnpjStatus.innerHTML = '<span style="color: #f59e0b;">ℹ️ CNPJ não encontrado. Informe os dados manualmente:</span>';
      campoNome.style.display = 'block';
      if (campoEmailEmpresa) campoEmailEmpresa.style.display = 'block';
      inputNome.required = true;
    } finally {
      cnpjInput.disabled = false;
    }
  }

  function validarFormularioCadastro(e) {
    const cnpjInput = document.getElementById('cadastro_empresa_cnpj');
    const inputNome = document.getElementById('cadastro_empresa_nome');
    if (!cnpjInput) return true;
    const cnpj = cnpjInput.value.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      e.preventDefault();
      alert('⚠️ CNPJ inválido! Deve conter 14 dígitos.');
      cnpjInput.focus();
      return false;
    }
    if (!inputNome.value.trim()) {
      e.preventDefault();
      alert('⚠️ Por favor, informe o nome da empresa.');
      inputNome.focus();
      return false;
    }
    
    if (window.dadosEmpresaAPI) {
      const formCadastro = document.getElementById('formCadastro');
      const data = window.dadosEmpresaAPI;
      
      formCadastro.querySelectorAll('.empresa-api-data').forEach(h => h.remove());
      
      const email = Array.isArray(data.emails) && data.emails.length > 0 ? data.emails[0].address : '';
      const telefone = Array.isArray(data.phones) && data.phones.length > 0 ? `${data.phones[0].area}${data.phones[0].number}` : '';
      
      let tipoLogradouro = 'Rua';
      let nomeLogradouro = data.address?.street || '';
      
      if (nomeLogradouro) {
        const tipos = ['Avenida', 'Rua', 'Travessa', 'Alameda', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo'];
        for (const tipo of tipos) {
          if (nomeLogradouro.startsWith(tipo + ' ')) {
            tipoLogradouro = tipo;
            nomeLogradouro = nomeLogradouro.substring(tipo.length + 1);
            break;
          }
        }
      }
      
      const fields = {
        'empresa_email': email,
        'empresa_telefone': telefone,
        'empresa_logradouro': tipoLogradouro,
        'empresa_nome_logradouro': nomeLogradouro,
        'empresa_numero': data.address?.number || '',
        'empresa_complemento': data.address?.details || '',
        'empresa_bairro': data.address?.district || '',
        'empresa_municipio': data.address?.city || '',
        'empresa_uf': data.address?.state || '',
        'empresa_cep': data.address?.zip?.replace(/\D/g, '') || ''
      };
      
      for (const [key, value] of Object.entries(fields)) {
        if (value) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          input.className = 'empresa-api-data';
          formCadastro.appendChild(input);
        }
      }
      
      console.log('✅ Dados de endereço enviados:', fields);
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.openModal(btn.getAttribute('data-open'));
      });
    });
    document.querySelectorAll('[data-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = btn.closest('.modal');
        const target = btn.getAttribute('data-switch');
        window.closeModal(current);
        window.openModal(target);
      });
    });
    document.querySelectorAll('.modal .close').forEach(btn => {
      btn.addEventListener('click', () => {
        window.closeModal(btn.closest('.modal'));
      });
    });
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) window.closeModal(m);
      });
      m.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeModal(m);
      });
    });

    const cnpjInput = document.getElementById('cadastro_empresa_cnpj');
    if (cnpjInput) {
      cnpjInput.addEventListener('input', (e) => formatarCNPJ(e.target));
      cnpjInput.addEventListener('blur', consultarCNPJ);
    }
    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
      formCadastro.addEventListener('submit', validarFormularioCadastro);
    }
  });
})();
