const API_URL = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
  verificarSessao();
  configurarFormularios();
});

// Checa se o usuário já tem um token salvo no navegador
function verificarSessao() {
  const token = localStorage.getItem("wms_token");
  const username = localStorage.getItem("wms_user");
  const role = localStorage.getItem("wms_role");

  if (token) {
    document.getElementById("tela-autenticacao").classList.add("hidden");
    document.getElementById("tela-painel").classList.remove("hidden");
    document.getElementById("user-display").innerText = username;
    document.getElementById("role-display").innerText = role;
    carregarDados();
  } else {
    document.getElementById("tela-autenticacao").classList.remove("hidden");
    document.getElementById("tela-painel").classList.add("hidden");
  }
}

// Configura os envios de Login e Cadastro de Mercadorias
function configurarFormularios() {
  // 1. Processamento de Login (Mantido)
  document
    .getElementById("form-login")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("login-username").value;
      const passwordInput = document.getElementById("login-password").value;

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usernameInput,
            password: passwordInput,
          }),
        });

        if (response.ok) {
          const dados = await response.json();
          localStorage.setItem("wms_token", dados.token);
          localStorage.setItem("wms_user", dados.usuario);
          localStorage.setItem("wms_role", dados.nivelAcesso);
          verificarSessao();
        } else {
          alert(
            "Credenciais inválidas! Tente criar um usuário de teste abaixo.",
          );
        }
      } catch (error) {
        alert("Erro de conexão com o servidor de autenticação.");
      }
    });

  // 🏢 Processamento de Cadastro de Nova Vaga Física
  document
    .getElementById("form-posicao")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = localStorage.getItem("wms_token");

      const novaPosicao = {
        corredor: document.getElementById("pos-corredor").value.toUpperCase(),
        prateleira: parseInt(document.getElementById("pos-prateleira").value),
        nivel: parseInt(document.getElementById("pos-nivel").value),
        ocupada: false,
      };

      try {
        const response = await fetch(`${API_URL}/posicoes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novaPosicao),
        });

        if (response.ok) {
          alert(
            `Vaga ${novaPosicao.corredor}-${novaPosicao.prateleira}-${novaPosicao.nivel} criada com sucesso!`,
          );
          document.getElementById("form-posicao").reset();

          // CORREÇÃO: Força a tabela a se re-renderizar imediatamente na tela
          carregarDados();
        } else {
          const erro = await response.text();
          alert(`Erro ao criar vaga: ${erro}`);
        }
      } catch (error) {
        alert("Falha na comunicação com o servidor.");
      }
    });

  // 3. Processamento de Entrada de Carga (Mantido)
  document
    .getElementById("form-produto")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = localStorage.getItem("wms_token");

      const novoProduto = {
        nome: document.getElementById("nome").value,
        sku: document.getElementById("sku").value,
        quantidade: parseInt(document.getElementById("quantidade").value),
        peso: parseFloat(document.getElementById("peso").value),
      };

      try {
        const response = await fetch(`${API_URL}/produtos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novoProduto),
        });

        if (response.ok) {
          document.getElementById("form-produto").reset();
          carregarDados();
        } else {
          const erro = await response.text();
          alert(`Erro na alocação: ${erro}`);
        }
      } catch (error) {
        alert("Falha na comunicação.");
      }
    });
}


// Atalho rápido na tela para registrar um usuário administrador direto no SQLite
async function registrarUsuarioTeste() {
  try {
    const response = await fetch(`${API_URL}/auth/registrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "leonardo",
        passwordHash: "senha123",
        role: "Gerente",
      }),
    });

    if (response.ok) {
      alert(
        "Conta de teste criada! Usuário: leonardo | Senha: senha123. Agora clique em entrar.",
      );
      document.getElementById("login-username").value = "leonardo";
      document.getElementById("login-password").value = "senha123";
    } else {
      alert("A conta de teste já está cadastrada no banco. Basta entrar!");
    }
  } catch (error) {
    alert("Erro ao conectar com a API para registrar.");
  }
}

// Busca a tabela de produtos enviando o token Bearer
// ATUALIZAR: Modifique a função carregarDados para buscar os dois relatórios
async function carregarDados() {
    const token = localStorage.getItem('wms_token');
    try {
        // 1. Busca e Renderiza os Produtos
        const resProdutos = await fetch(`${API_URL}/produtos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resProdutos.status === 401) { logout(); return; }
        const produtos = await resProdutos.json();
        renderizarTabela(produtos);

        // 🏢 2. NOVO: Busca e Renderiza as Vagas Físicas
        // Nota: Certifique-se de que seu Program.cs possui a rota app.MapGet("/api/posicoes") mapeada
        const resPosicoes = await fetch(`${API_URL}/posicoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resPosicoes.ok) {
            const vagas = await resPosicoes.json();
            renderizarVagas(vagas);
        }

    } catch (error) {
        console.error('Erro de integração:', error);
    }
}

// 🏢 NOVA FUNÇÃO: Renderiza as vagas físicas do galpão na tela
function renderizarVagas(vagas) {
  const tbody = document.getElementById("tabela-vagas");
  tbody.innerHTML = "";

  if (!vagas || vagas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #9ca3af; padding: 16px;">Nenhum espaço físico cadastrado.</td></tr>`;
    return;
  }

  vagas.forEach((v) => {
    // CORREÇÃO: Garante a leitura independente se o C# mandar minúsculo (padrão JSON do .NET)
    const corredor = v.corredor || v.Corredor || "";
    const prateleira = v.prateleira || v.Prateleira || 0;
    const nivel = v.nivel || v.Nivel || 0;
    const ocupada = v.ocupada !== undefined ? v.ocupada : v.Ocupada;

    const endereco = `${corredor}-${prateleira}-${nivel}`;
    const badgeClasse = ocupada
      ? "badge badge-critical"
      : "badge badge-success";
    const statusTexto = ocupada
      ? "🚨 Ocupado (Com Carga)"
      : "🟢 Disponível (Livre)";

    tbody.innerHTML += `
            <tr>
                <td class="font-mono" style="font-size: 16px; padding: 12px 0;">${endereco}</td>
                <td style="padding: 12px 0;">
                    <span class="${badgeClasse}">
                        ${statusTexto}
                    </span>
                </td>
            </tr>
        `;
  });
}

function renderizarTabela(produtos) {
  const tbody = document.getElementById("tabela-produtos");
  tbody.innerHTML = "";

  if (!produtos || produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 24px;">Nenhum produto alocado.</td></tr>`;
    return;
  }

  produtos.forEach((p) => {
    const sku = p.sku || p.Sku || "";
    const nome = p.nome || p.Nome || "";
    const quantidade = p.quantidade || p.Quantidade || 0;
    const peso = p.peso || p.Peso || 0;
    const estoqueMinimo = p.estoqueMinimo || p.EstoqueMinimo || 5;

    const posicao = p.posicao || p.Posicao;
    let endereco = "Docas";
    if (posicao) {
      const c = posicao.corredor || posicao.Corredor || "";
      const pr = posicao.prateleira || posicao.Prateleira || 0;
      const n = posicao.nivel || posicao.Nivel || 0;
      endereco = `${c}-${pr}-${n}`;
    }

    const estoqueCritico = quantidade <= estoqueMinimo;
    const badgeClasse = estoqueCritico
      ? "badge badge-critical"
      : "badge badge-success";

    tbody.innerHTML += `
            <tr>
                <td><strong style="color:#111827;">${sku}</strong><br><span style="font-size:12px;color:#9ca3af;">${nome}</span></td>
                <td><span class="${badgeClasse}">${quantidade} un</span></td>
                <td style="font-size: 14px;">${peso} kg</td>
                <td class="font-mono">${endereco}</td>
                <td style="text-align: right;"><button onclick="despachar('${sku}')" class="btn-danger">Despachar</button></td>
            </tr>
        `;
  });
}

async function despachar(sku) {
  if (!confirm(`Confirmar o despacho físico e saída do SKU ${sku}?`)) return;

  const token = localStorage.getItem("wms_token");

  try {
    const response = await fetch(`${API_URL}/produtos/saida/${sku}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // Envia o token para a API liberar a ação
    });

    if (response.ok) {
      // Recarrega os dados para sumir com o produto e liberar a vaga na tela
      carregarDados();
    } else {
      alert("Não foi possível despachar a carga.");
    }
  } catch (error) {
    console.error("Erro ao despachar:", error);
  }
}


function logout() {
  localStorage.clear();
  verificarSessao();
}
