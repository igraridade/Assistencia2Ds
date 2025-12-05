// ===================== MÁSCARAS GLOBAIS =====================
// Este arquivo é carregado em TODAS as páginas automaticamente

document.addEventListener('DOMContentLoaded', function() {
  
  // Máscara de TELEFONE: (00) 00000-0000
  // Pega TODOS os inputs de telefone de TODAS as páginas
  const telefoneInputs = document.querySelectorAll('input[type="tel"], input[name="telefone"]');
  telefoneInputs.forEach(input => {
    IMask(input, {
      mask: [
        { mask: '(00) 0000-0000' },
        { mask: '(00) 00000-0000' }
      ]
    });
  });

  // Máscara de CNPJ: 00.000.000/0000-00
  const cnpjInputs = document.querySelectorAll('input[name="cnpj"]');
  cnpjInputs.forEach(input => {
    IMask(input, {
      mask: '00.000.000/0000-00'
    });
  });

  // Máscara de CPF: 000.000.000-00
  const cpfInputs = document.querySelectorAll('input[name="cpf"]');
  cpfInputs.forEach(input => {
    IMask(input, {
      mask: '000.000.000-00'
    });
  });

  // Máscara de CEP: 00000-000
  const cepInputs = document.querySelectorAll('input[name="cep"]');
  cepInputs.forEach(input => {
    IMask(input, {
      mask: '00000-000'
    });
  });

  // Máscara de DINHEIRO: R$ 0.000,00
  const dinheiroInputs = document.querySelectorAll('input[name="precohora"], input[type="number"][step="0.01"]');
  dinheiroInputs.forEach(input => {
    // Muda o tipo para text para aceitar a máscara
    input.type = 'text';
    IMask(input, {
      mask: 'R$ num',
      blocks: {
        num: {
          mask: Number,
          thousandsSeparator: '.',
          radix: ',',
          mapToRadix: ['.'],
          min: 0,
          max: 9999.99,
          scale: 2
        }
      }
    });
  });

});
