const API_URL = "http://localhost:5000/api";

// Executa automaticamente assim que a página carrega
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  configurarFormulario();
});

// Busca os produtos e os dados do dashboard na API do C#
async function carregarDados() {
  try {
    // 1. Atualiza a listagem de produtos
    const resProdutos = await fetch(`${API_URL}/produtos`);
    const produtos = await resProdutos.json();
    renderizarProdutos(produtos);

    // 2. Atualiza os dados do Dashboard no topo da tela
    const resDashboard = await fetch(`${API_URL}/dashboard`);
    const dashData = await resDashboard.json();

    if (dashData.taxaOcupacaoPercentual) {
      document.getElementById("taxa-percentual").innerText =
        dashData.taxaOcupacaoPercentual;
    }
  } catch (error) {
    console.error("Erro ao conectar com a API de Logística:", error);
    alert(
      "Não foi possível conectar à API .NET. Certifique-se de que ela está rodando com dotnet run!",
    );
  }
}

// Monta as linhas da tabela HTML com base nos dados do banco SQLite
function renderizarProdutos(produtos) {
  const tbody = document.getElementById("tabela-produtos");
  tbody.innerHTML = "";

  if (produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 24px;">Nenhum produto alocado no armazém.</td></tr>`;
    return;
  }

  produtos.forEach((p) => {
    const estoqueCritico = p.quantidade <= p.estoqueMinimo;
    const endereco = p.posicao
      ? `${p.posicao.corredor}-${p.posicao.prateleira}-${p.posicao.nivel}`
      : "Sem vaga";
    const badgeClasse = estoqueCritico
      ? "badge badge-critical"
      : "badge badge-success";

    tbody.innerHTML += `
            <tr>
                <td>
                    <span class="sku-title">${p.sku}</span>
                    <span class="product-name">${p.nome}</span>
                </td>
                <td>
                    <span class="${badgeClasse}">
                        ${p.quantidade} un
                    </span>
                </td>
                <td style="font-size: 14px;">${p.peso} kg</td>
                <td class="font-mono">${endereco}</td>
                <td style="text-align: right;">
                    <button onclick="despacharCarga('${p.sku}')" class="btn-danger">
                        Despachar
                    </button>
                </td>
            </tr>
        `;
  });
}

// Envia os dados do formulário via POST para a API
function configurarFormulario() {
  const form = document.getElementById("form-produto");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const novoProduto = {
      nome: document.getElementById("nome").value,
      sku: document.getElementById("sku").value,
      quantidade: parseInt(document.getElementById("quantidade").value),
      peso: parseFloat(document.getElementById("peso").value),
      estoqueMinimo: parseInt(document.getElementById("estoqueMinimo").value),
    };

    try {
      const response = await fetch(`${API_URL}/produtos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoProduto),
      });

      if (response.ok) {
        form.reset();
        carregarDados(); // Recarrega a tela para exibir o item novo
      } else {
        const erroTexto = await response.text();
        alert(`Falha na Operação: ${erroTexto}`);
      }
    } catch (error) {
      alert("Erro de conexão com o servidor.");
    }
  });
}

// Aciona a rota de Saída de Estoque para remover o produto e liberar a vaga
async function despacharCarga(sku) {
  if (!confirm(`Confirmar o despacho físico e saída do SKU ${sku}?`)) return;

  try {
    const response = await fetch(`${API_URL}/produtos/saida/${sku}`, {
      method: "POST",
    });
    if (response.ok) {
      carregarDados();
    } else {
      alert("Não foi possível despachar a carga.");
    }
  } catch (error) {
    console.error(error);
  }
}
