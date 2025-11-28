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
