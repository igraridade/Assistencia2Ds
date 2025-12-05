// ========== SISTEMA DE ALERTAS/FLASH MESSAGES ==========

document.addEventListener('DOMContentLoaded', function() {
  inicializarAlertas();
});

function inicializarAlertas() {
  // Fechar alertas ao clicar no botão X
  const botoesFechar = document.querySelectorAll('.alert .close, .alert .btn-close, .alert-close');

  botoesFechar.forEach(botao => {
    botao.addEventListener('click', function(e) {
      e.preventDefault();
      const alert = this.closest('.alert');
      if (alert) {
        fecharAlerta(alert);
      }
    });
  });

  // Auto-fechar alertas após 5 segundos (exceto erros)
  const alertas = document.querySelectorAll('.alert');
  alertas.forEach(alert => {
    // Não auto-fechar alertas de erro/danger
    if (!alert.classList.contains('alert-danger') && !alert.classList.contains('alert-error')) {
      setTimeout(() => {
        if (alert && alert.parentElement) {
          fecharAlerta(alert);
        }
      }, 5000);
    }
  });
}

function fecharAlerta(alertElement) {
  if (!alertElement) return;

  // Adicionar animação de saída
  alertElement.style.animation = 'slideOutRight 0.3s ease';

  setTimeout(() => {
    if (alertElement && alertElement.parentElement) {
      alertElement.remove();
    }
  }, 300);
}

// Função para criar alertas via JavaScript (SEM duplicar)
function mostrarAlerta(mensagem, tipo = 'info') {
  const container = document.querySelector('.flash-messages');
  if (!container) return;

  // Verificar se já existe um alerta com a mesma mensagem
  const alertasExistentes = container.querySelectorAll('.alert-message');
  for (let alerta of alertasExistentes) {
    if (alerta.textContent.trim() === mensagem.trim()) {
      return; // Não criar alerta duplicado
    }
  }

  const tipoClass = {
    'success': 'alert-success',
    'error': 'alert-danger',
    'danger': 'alert-danger',
    'warning': 'alert-warning',
    'info': 'alert-info'
  }[tipo] || 'alert-info';

  const icone = {
    'success': '✓',
    'error': '✗',
    'danger': '✗',
    'warning': '⚠',
    'info': 'ℹ'
  }[tipo] || 'ℹ';

  const alert = document.createElement('div');
  alert.className = `alert ${tipoClass}`;
  alert.innerHTML = `
    <span class="alert-icon">${icone}</span>
    <span class="alert-message">${mensagem}</span>
    <button class="alert-close">&times;</button>
  `;

  container.appendChild(alert);

  // Adicionar evento de fechar
  const btnClose = alert.querySelector('.alert-close');
  if (btnClose) {
    btnClose.addEventListener('click', function() {
      fecharAlerta(alert);
    });
  }

  // Auto-fechar após 5 segundos (exceto erros)
  if (tipo !== 'danger' && tipo !== 'error') {
    setTimeout(() => {
      if (alert && alert.parentElement) {
        fecharAlerta(alert);
      }
    }, 5000);
  }
}

// ===================== POPUP DE CONFIRMAÇÃO =====================
function mostrarPopup(mensagem, tipo = 'sucesso') {
  // Remove popup anterior se existir
  const popupAntigo = document.querySelector('.popup-overlay');
  if (popupAntigo) popupAntigo.remove();

  // Cria o popup
  const popup = document.createElement('div');
  popup.className = 'popup-overlay';

  const icone = tipo === 'sucesso' ? '✅' : tipo === 'erro' ? '⚠️' : 'ℹ️';
  const corBorda = tipo === 'sucesso' ? '#10b981' : tipo === 'erro' ? '#ef4444' : '#3b8cff';

  popup.innerHTML = `
    <div class="popup-content" style="border-color: ${corBorda}">
      <div class="popup-icon">${icone}</div>
      <p class="popup-message">${mensagem}</p>
      <button class="popup-btn" onclick="fecharPopup()">OK</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Fecha automaticamente após 3 segundos
  setTimeout(fecharPopup, 3000);
}

function fecharPopup() {
  const popup = document.querySelector('.popup-overlay');
  if (popup) {
    popup.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => popup.remove(), 200);
  }
}

// ===================== ENVIAR DÚVIDA (FAQ/AJUDA) =====================
function enviarDuvida(duvida) {
  // Aqui você pode fazer fetch para o backend se precisar
  // Por enquanto, só mostra sucesso

  mostrarPopup('Dúvida enviada com sucesso! Em breve entraremos em contato.', 'sucesso');

  // Limpa o formulário
  const textarea = document.querySelector('textarea');
  if (textarea) textarea.value = '';
}

