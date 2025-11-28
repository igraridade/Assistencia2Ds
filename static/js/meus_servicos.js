// ===================== MEUS SERVIÇOS =====================
// Gerencia filtros, modal de avaliação e envio de feedback

// ===================== FILTROS =====================
function filtrarServicos() {
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroCategoria = document.getElementById('filtroCategoria');
    
    if (!filtroStatus || !filtroCategoria) return;
    
    const statusValue = filtroStatus.value;
    const categoriaValue = filtroCategoria.value;
    const cards = document.querySelectorAll('.servico-card');
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const status = card.dataset.status;
        const categoria = card.dataset.categoria;
        
        const matchStatus = statusValue === 'todos' || status === statusValue;
        const matchCategoria = categoriaValue === 'todos' || categoria === categoriaValue;
        
        if (matchStatus && matchCategoria) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    const lista = document.getElementById('servicosLista');
    if (!lista) return;
    
    let emptyMsg = lista.querySelector('.filter-empty');
    
    if (visibleCount === 0 && !emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-state filter-empty';
        emptyMsg.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <h2 class="empty-state-title">Nenhum serviço encontrado</h2>
            <p class="empty-state-text">Não há serviços que correspondam aos filtros selecionados.</p>
        `;
        lista.appendChild(emptyMsg);
    } else if (visibleCount > 0 && emptyMsg) {
        emptyMsg.remove();
    }
}

// ===================== MODAL DE AVALIAÇÃO =====================
let protocoloAtualAvaliacao = null;

function abrirModalAvaliacao(protocolo, nomeTecnico, notaExistente) {
    protocoloAtualAvaliacao = protocolo;
    
    const protocoloInput = document.getElementById('protocoloAvaliacao');
    const nomeTecnicoEl = document.getElementById('nomeTecnicoAvaliacao');
    const notaInput = document.getElementById('notaAvaliacao');
    const comentarioInput = document.getElementById('comentarioAvaliacao');
    const modal = document.getElementById('modalAvaliacao');
    
    if (protocoloInput) protocoloInput.value = protocolo;
    if (nomeTecnicoEl) nomeTecnicoEl.textContent = nomeTecnico;
    
    if (notaExistente && notaInput) {
        notaInput.value = notaExistente;
        atualizarEstrelasAvaliacao(notaExistente);
    } else if (notaInput) {
        notaInput.value = 5;
        atualizarEstrelasAvaliacao(5);
    }
    
    if (comentarioInput) comentarioInput.value = '';
    if (modal) modal.style.display = 'flex';
}

function fecharModalAvaliacao() {
    const modal = document.getElementById('modalAvaliacao');
    if (modal) modal.style.display = 'none';
    protocoloAtualAvaliacao = null;
}

function atualizarEstrelasAvaliacao(nota) {
    const notaNum = parseFloat(nota);
    const estrelasVisuais = document.getElementById('estrelasVisuais');
    const notaTexto = document.getElementById('notaTexto');
    
    if (!estrelasVisuais || !notaTexto) return;
    
    const cheias = Math.floor(notaNum);
    const meia = (notaNum % 1) >= 0.5 ? 1 : 0;
    const vazias = 5 - cheias - meia;
    
    let resultado = '★'.repeat(cheias);
    if (meia) resultado += '⭐';
    resultado += '☆'.repeat(vazias);
    
    estrelasVisuais.textContent = resultado;
    notaTexto.textContent = notaNum.toFixed(1);
}

async function enviarAvaliacao(event) {
    event.preventDefault();
    
    const protocoloInput = document.getElementById('protocoloAvaliacao');
    const notaInput = document.getElementById('notaAvaliacao');
    const comentarioInput = document.getElementById('comentarioAvaliacao');
    
    if (!protocoloInput || !notaInput) return;
    
    const protocolo = protocoloInput.value;
    const nota = parseFloat(notaInput.value);
    const comentario = comentarioInput ? comentarioInput.value.trim() : '';
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    if (!btnSubmit) return;
    
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '⏳ Enviando...';
    
    try {
        const response = await fetch('/api/avaliar-servico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                protocolo: protocolo,
                nota: nota,
                comentario: comentario
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('✅ Avaliação enviada com sucesso! Obrigado pelo feedback.');
            fecharModalAvaliacao();
            location.reload();
        } else {
            alert('❌ Erro: ' + (data.error || 'Erro desconhecido'));
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao enviar avaliação');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
}

// ===================== EVENT LISTENERS =====================
document.addEventListener('DOMContentLoaded', function() {
    // Fechar modal de avaliação ao clicar fora
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalAvaliacao');
        if (modal && event.target === modal) {
            fecharModalAvaliacao();
        }
    });
});
