let categoriaSelecionada = '';
let tecnicoSelecionado = null;
let cepListenersAdded = false;

async function buscarCEP() {
    const cepInput = document.getElementById('cepServico');
    const cepStatus = document.getElementById('cepStatus');
    let cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) {
        cepStatus.textContent = '⚠️ CEP deve ter 8 dígitos';
        cepStatus.style.color = 'var(--amarelo-alerta)';
        limparEndereco();
        return;
    }

    cepStatus.textContent = '🔍 Buscando CEP...';
    cepStatus.style.color = 'var(--azul-eletrico)';

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            cepStatus.textContent = '❌ CEP não encontrado';
            cepStatus.style.color = '#ef4444';
            limparEndereco();
            return;
        }

        if (!data.logradouro || !data.bairro || !data.localidade || !data.uf) {
            cepStatus.textContent = '⚠️ CEP encontrado mas com dados incompletos';
            cepStatus.style.color = 'var(--amarelo-alerta)';
        } else {
            cepStatus.textContent = '✅ Endereço encontrado!';
            cepStatus.style.color = 'var(--verde-sucesso)';
        }

        document.getElementById('logradouro').value = data.logradouro || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = data.localidade || '';
        document.getElementById('estado').value = data.uf || '';
        document.getElementById('numero').focus();

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        cepStatus.textContent = '❌ Erro ao buscar CEP. Tente novamente.';
        cepStatus.style.color = '#ef4444';
        limparEndereco();
    }
}

function limparEndereco() {
    document.getElementById('logradouro').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('estado').value = '';
}

function formatarCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5, 8);
    }
    input.value = valor;
}

async function abrirModalTecnicos(categoria) {
    categoriaSelecionada = categoria;
    const modal = document.getElementById('modalTecnicos');
    const titulo = document.getElementById('modalTitulo');
    const lista = document.getElementById('tecnicosLista');

    titulo.textContent = `Técnicos de ${categoria}`;
    lista.innerHTML = '<div class="loading-spinner">⏳ Carregando técnicos...</div>';
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/tecnicos-por-servico/${categoria}`);
        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Técnicos recebidos:', data.tecnicos);
            data.tecnicos.forEach(t => {
                console.log(`Técnico: ${t.nome} - Preço: ${t.preco_hora} (tipo: ${typeof t.preco_hora})`);
            });
            renderizarTecnicos(data.tecnicos);
        } else {
            lista.innerHTML = '<div class="empty-state">❌ Erro ao carregar técnicos</div>';
        }
    } catch (error) {
        console.error('Erro:', error);
        lista.innerHTML = '<div class="empty-state">❌ Erro ao conectar com o servidor</div>';
    }
}

function renderizarTecnicos(tecnicos) {
    const lista = document.getElementById('tecnicosLista');

    if (!lista) return;

    if (tecnicos.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <p>😔 Nenhum técnico disponível nesta categoria.</p>
                <p style="font-size: 0.9rem; margin-top: 6px;">
                    Tente novamente mais tarde ou escolha outra categoria.
                </p>
            </div>
        `;
        return;
    }

    lista.innerHTML = '';

    tecnicos.forEach(tec => {
        const card = document.createElement('div');
        card.className = 'tecnico-card';
        card.onclick = () => selecionarTecnico(tec);

        const avaliacaoNum = parseFloat(tec.avaliacao) || 0.0;
        const estrelas = gerarEstrelas(avaliacaoNum);
        const nivelExp = tec.nivel_experiencia && tec.nivel_experiencia.trim()
            ? escapeHtml(tec.nivel_experiencia)
            : 'Novo';
        const precoHora = parseFloat(tec.preco_hora) || 100.00;
        const precoFormatado = precoHora.toFixed(2);
        const servicosConcluidos = parseInt(tec.servicos_concluidos) || 0;
        const totalAvaliacoes = parseInt(tec.total_avaliacoes) || 0;

        const textoAvaliacoes =
            totalAvaliacoes === 0
                ? '0 avaliações'
                : totalAvaliacoes === 1
                    ? '1 avaliação'
                    : `${totalAvaliacoes} avaliações`;

        card.innerHTML = `
            <div class="tecnico-info">
                <div class="tecnico-nome">${escapeHtml(tec.nome)}</div>
                <div class="tecnico-detalhes">
                    <span class="tecnico-badge badge-nivel">${nivelExp}</span>
                    <span class="tecnico-badge badge-servicos">
                        ${servicosConcluidos} serviço${servicosConcluidos !== 1 ? 's' : ''} concluído${servicosConcluidos !== 1 ? 's' : ''}
                    </span>
                    <span class="tecnico-badge badge-avaliacoes">
                        ${textoAvaliacoes}
                    </span>
                </div>
                <div class="tecnico-avaliacao">
                    <span class="estrelas">${estrelas}</span>
                    ${
                        totalAvaliacoes > 0
                            ? `<span>${avaliacaoNum.toFixed(1)} / 5.0</span>`
                            : `<span>Sem avaliações</span>`
                    }
                </div>
            </div>
            <div class="tecnico-preco-box">
                <div class="preco-label">Preço por hora</div>
                <div class="preco-valor">
                    R$ ${precoFormatado}<span class="preco-unidade">/h</span>
                </div>
            </div>
        `;

        lista.appendChild(card);
    });
}


function gerarEstrelas(avaliacao) {
    const nota = parseFloat(avaliacao) || 0;
    const cheias = Math.floor(nota);
    const meia = (nota % 1) >= 0.5 ? 1 : 0;
    const vazias = 5 - cheias - meia;

    let resultado = '★'.repeat(cheias);
    if (meia) resultado += '⭐';
    resultado += '☆'.repeat(vazias);

    return resultado;
}



function selecionarTecnico(tecnico) {
    // ✅ GARANTIR que preco_hora seja número antes de passar
    let precoHora = parseFloat(tecnico.preco_hora);
    if (isNaN(precoHora) || precoHora <= 0) {
        precoHora = 100.00;
        console.warn(`⚠️ Preço corrigido para técnico ${tecnico.nome}: R$ 100,00`);
    }

    tecnicoSelecionado = {
        ...tecnico,
        preco_hora: precoHora // Sobrescrever com número válido
    };

    console.log('✅ Técnico selecionado:', tecnicoSelecionado);

    fecharModal();
    abrirModalContratacao();
}

function abrirModalContratacao() {
    const modal = document.getElementById('modalContratacao');
    const infoBox = document.getElementById('tecnicoSelecionadoInfo');

    if (!tecnicoSelecionado) return;

    const precoFormatado = tecnicoSelecionado.preco_hora.toFixed(2);
    infoBox.innerHTML = `<strong>${escapeHtml(tecnicoSelecionado.nome)}</strong> - ${escapeHtml(categoriaSelecionada)} - R$ ${precoFormatado}/hora`;

    // Limpar formulário
    document.getElementById('cepServico').value = '';
    document.getElementById('logradouro').value = '';
    document.getElementById('numero').value = '';
    document.getElementById('complemento').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('estado').value = '';
    document.getElementById('descricaoProblema').value = '';
    document.getElementById('prioridadeServico').value = 'media';
    document.getElementById('cepStatus').textContent = 'Digite o CEP para buscar o endereço automaticamente';
    document.getElementById('cepStatus').style.color = 'var(--cinza-medio)';

    // ✅ Adicionar listeners apenas uma vez
    if (!cepListenersAdded) {
        const cepInput = document.getElementById('cepServico');
        cepInput.addEventListener('input', (e) => formatarCEP(e.target));
        cepInput.addEventListener('blur', buscarCEP);
        cepListenersAdded = true;
    }

    modal.style.display = 'flex';
}

async function confirmarContratacao(event) {
    event.preventDefault();

    const cep = document.getElementById('cepServico').value.trim();
    const logradouro = document.getElementById('logradouro').value.trim();
    const numero = document.getElementById('numero').value.trim();
    const complemento = document.getElementById('complemento').value.trim();
    const bairro = document.getElementById('bairro').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim();
    const descricao = document.getElementById('descricaoProblema').value.trim();
    const prioridade = document.getElementById('prioridadeServico').value;

    const endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''} - ${bairro} - ${cidade}/${estado} - CEP: ${cep}`;

    if (!cep || !logradouro || !numero || !bairro || !cidade || !estado || !descricao || !tecnicoSelecionado) {
        alert('⚠️ Por favor, preencha todos os campos obrigatórios!');
        return;
    }

    if (descricao.length < 20) {
        alert('⚠️ Por favor, descreva o problema com mais detalhes (mínimo 20 caracteres).');
        document.getElementById('descricaoProblema').focus();
        return;
    }

    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '⏳ Processando...';

    try {
        const response = await fetch('/api/contratar-tecnico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_tecnico: tecnicoSelecionado.id_tecnico,
                categoria: categoriaSelecionada,
                descricao: descricao,
                prioridade: prioridade,
                endereco: endereco
            })
        });

        const data = await response.json();

        if (response.status === 401 && data.error === 'not_authenticated') {
            alert('🔒 Você precisa estar logado para contratar um serviço!\n\nVocê será redirecionado para a página de login.');
            window.location.href = '/';
            return;
        }

        if (response.ok && data.success) {
            alert(`✅ Serviço contratado com sucesso!\n\n📋 Protocolo: ${data.protocolo}\n📍 Endereço: ${endereco}\n\nO técnico entrará em contato em breve.`);
            fecharModalContratacao();
            window.location.href = '/meus-servicos';
        } else {
            alert('❌ Erro ao contratar serviço:\n\n' + (data.error || 'Erro desconhecido'));
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao conectar com o servidor.\n\nVerifique sua conexão e tente novamente.');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textoOriginal;
    }
}

function fecharModal() {
    document.getElementById('modalTecnicos').style.display = 'none';
}

function fecharModalContratacao() {
    document.getElementById('modalContratacao').style.display = 'none';
    tecnicoSelecionado = null;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.onclick = function(event) {
    const modalTecnicos = document.getElementById('modalTecnicos');
    const modalContratacao = document.getElementById('modalContratacao');

    if (event.target === modalTecnicos) {
        fecharModal();
    }
    if (event.target === modalContratacao) {
        fecharModalContratacao();
    }
}
