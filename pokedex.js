const API_URL = "https://pokeapi.co/api/v2";
const QUANTIDADE_POR_PAGINA = 24;
const LIMITE_PARTY = 6;

const nomesTipos = {
  normal: "Normal",
  fire: "Fogo",
  water: "Água",
  electric: "Elétrico",
  grass: "Grama",
  ice: "Gelo",
  fighting: "Lutador",
  poison: "Veneno",
  ground: "Terra",
  flying: "Voador",
  psychic: "Psíquico",
  bug: "Inseto",
  rock: "Pedra",
  ghost: "Fantasma",
  dragon: "Dragão",
  dark: "Sombrio",
  steel: "Aço",
  fairy: "Fada",
};

const coresTipos = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

const elementos = {
  grade: document.querySelector("#grade-pokemon"),
  campoPesquisa: document.querySelector("#campo-pesquisa"),
  listaTipos: document.querySelector("#lista-tipos"),
  quantidade: document.querySelector("#quantidade-resultados"),
  textoFiltro: document.querySelector("#texto-filtro"),
  textoPaginacao: document.querySelector("#texto-paginacao"),
  botaoCarregar: document.querySelector("#botao-carregar"),
  mensagemVazia: document.querySelector("#mensagem-vazia"),
  botaoFavoritos: document.querySelector("#botao-favoritos"),
  contadorFavoritos: document.querySelector("#contador-favoritos"),
  modal: document.querySelector("#modal-pokemon"),
  modalCorpo: document.querySelector("#modal-corpo"),
  modalFechar: document.querySelector("#modal-fechar"),
  aviso: document.querySelector("#aviso-toast"),
  tituloParty: document.querySelector("#titulo-party"),
  listaParty: document.querySelector("#party"),
  tituloCarvalho: document.querySelector("#titulo-carvalho"),
  carvalhoVazio: document.querySelector("#carvalho-vazio"),
  listaCarvalho: document.querySelector("#carvalho"),
  dialogoTroca: document.querySelector("#dialogo-troca"),
  textoTroca: document.querySelector("#texto-troca"),
  opcoesTroca: document.querySelector("#opcoes-troca"),
  cancelarCaptura: document.querySelector("#cancelar-captura"),
};

function carregarLista(chave) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(salvo) ? salvo : [];
  } catch (erro) {
    return [];
  }
}

let todosPokemon = [];
let pokemonExibidos = [];
let favoritos = JSON.parse(localStorage.getItem("pokedex-favoritos") || "[]");
let tipoSelecionado = "todos";
let somenteFavoritos = false;
let quantidadeVisivel = QUANTIDADE_POR_PAGINA;
let temporizadorAviso;

let party = carregarLista("pokedex-party");
let carvalho = carregarLista("pokedex-carvalho");
let pokemonAtual = null;
let pokemonPendente = null;

async function iniciarPokedex() {
  criarFiltrosDeTipo();
  atualizarContadorFavoritos();

  try {
    const resposta = await fetch(`${API_URL}/pokemon?limit=1025&offset=0`);

    if (!resposta.ok) {
      throw new Error("Não foi possível buscar a lista de Pokémon.");
    }

    const dados = await resposta.json();

    todosPokemon = dados.results.map((pokemon, indice) => ({
      nome: pokemon.name,
      id: indice + 1,
      url: pokemon.url,
    }));

    aplicarFiltros();
  } catch (erro) {
    elementos.grade.innerHTML = `
            <div class="estado-carregamento">
                <p>Não foi possível carregar a Pokédex.</p>
                <button class="botao-secundario" onclick="iniciarPokedex()">Tentar novamente</button>
            </div>
        `;
    console.error(erro);
  }
}

function criarFiltrosDeTipo() {
  elementos.listaTipos.innerHTML = `
        <button class="filtro-tipo selecionado" data-tipo="todos" type="button">Todos</button>
        ${Object.entries(nomesTipos)
          .map(
            ([tipo, nome]) => `
            <button class="filtro-tipo" data-tipo="${tipo}" type="button">${nome}</button>
        `
          )
          .join("")}
    `;
}

async function buscarDetalhesPokemon(url) {
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os dados do Pokémon.");
  }

  return resposta.json();
}

async function aplicarFiltros() {
  quantidadeVisivel = QUANTIDADE_POR_PAGINA;
  elementos.grade.innerHTML = `
        <div class="estado-carregamento">
            <span class="spinner"></span>
            <p>Carregando Pokémon...</p>
        </div>
    `;

  let resultado = [...todosPokemon];
  const pesquisa = elementos.campoPesquisa.value.trim().toLowerCase();

  if (pesquisa) {
    resultado = resultado.filter(
      (pokemon) =>
        pokemon.nome.includes(pesquisa) ||
        String(pokemon.id) === pesquisa.replace(/^#/, "")
    );
  }

  if (somenteFavoritos) {
    resultado = resultado.filter((pokemon) => favoritos.includes(pokemon.id));
  }

  if (tipoSelecionado !== "todos") {
    try {
      const resposta = await fetch(`${API_URL}/type/${tipoSelecionado}`);

      if (!resposta.ok) {
        throw new Error("Não foi possível filtrar por tipo.");
      }

      const dadosTipo = await resposta.json();
      const idsDoTipo = new Set(
        dadosTipo.pokemon
          .map((item) => {
            const partes = item.pokemon.url.split("/").filter(Boolean);
            return Number(partes[partes.length - 1]);
          })
          .filter((id) => id <= 1025)
      );

      resultado = resultado.filter((pokemon) => idsDoTipo.has(pokemon.id));
    } catch (erro) {
      console.error(erro);
      mostrarAviso("Não foi possível aplicar o filtro de tipo.");
    }
  }

  pokemonExibidos = resultado;

  elementos.quantidade.textContent = resultado.length.toLocaleString("pt-BR");
  elementos.textoFiltro.textContent = montarTextoFiltro(pesquisa);
  renderizarPokemon();
}

function montarTextoFiltro(pesquisa) {
  const partes = [];

  if (somenteFavoritos) partes.push("Seus Pokémon favoritos");
  if (tipoSelecionado !== "todos")
    partes.push(`Tipo: ${nomesTipos[tipoSelecionado]}`);
  if (pesquisa) partes.push(`Pesquisa: "${pesquisa}"`);

  return partes.length ? partes.join(" • ") : "Todos os Pokémon";
}

async function renderizarPokemon() {
  const pokemonDaPagina = pokemonExibidos.slice(0, quantidadeVisivel);

  elementos.mensagemVazia.hidden = pokemonExibidos.length !== 0;
  elementos.grade.hidden = pokemonExibidos.length === 0;
  elementos.botaoCarregar.hidden = pokemonExibidos.length <= quantidadeVisivel;

  elementos.textoPaginacao.textContent = pokemonExibidos.length
    ? `Mostrando ${Math.min(quantidadeVisivel, pokemonExibidos.length)} de ${
        pokemonExibidos.length
      } Pokémon`
    : "";

  if (pokemonDaPagina.length === 0) {
    elementos.grade.innerHTML = "";
    return;
  }

  try {
    const dadosPokemon = await Promise.all(
      pokemonDaPagina.map((pokemon) => buscarDetalhesPokemon(pokemon.url))
    );

    elementos.grade.innerHTML = dadosPokemon.map(criarCardPokemon).join("");
    elementos.textoPaginacao.textContent = `Mostrando ${dadosPokemon.length} de ${pokemonExibidos.length} Pokémon`;
    elementos.botaoCarregar.hidden =
      dadosPokemon.length >= pokemonExibidos.length;
  } catch (erro) {
    elementos.grade.innerHTML = `
            <div class="estado-carregamento">
                <p>Ocorreu um erro ao carregar os Pokémon.</p>
                <button class="botao-secundario" onclick="renderizarPokemon()">Tentar novamente</button>
            </div>
        `;
    console.error(erro);
  }
}

function obterImagemPokemon(pokemon) {
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default ||
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png"
  );
}

function criarCardPokemon(pokemon) {
  const tipoPrincipal = pokemon.types[0].type.name;
  const imagem = obterImagemPokemon(pokemon);
  const estaFavoritado = favoritos.includes(pokemon.id);

  return `
        <article class="card-pokemon" data-id="${
          pokemon.id
        }" tabindex="0" role="button"
            aria-label="Ver detalhes de ${pokemon.name}">
            <div class="card-topo">
                <span class="numero-pokemon">#${String(pokemon.id).padStart(
                  4,
                  "0"
                )}</span>
                <button class="botao-favoritar-card ${
                  estaFavoritado ? "favorito" : ""
                }"
                    data-favorito="${pokemon.id}" type="button"
                    aria-label="${
                      estaFavoritado ? "Remover dos" : "Adicionar aos"
                    } favoritos"
                    aria-pressed="${estaFavoritado}">${
    estaFavoritado ? "♥" : "♡"
  }</button>
            </div>
            <div class="imagem-pokemon" style="--fundo-tipo: ${
              coresTipos[tipoPrincipal]
            }20">
                <img src="${imagem}" alt="${pokemon.name}" loading="lazy">
            </div>
            <h3 class="nome-pokemon">${pokemon.name}</h3>
            <div class="tipos-pokemon">
                ${pokemon.types
                  .map((item) => criarTagTipo(item.type.name))
                  .join("")}
            </div>
        </article>
    `;
}

function criarTagTipo(tipo) {
  return `<span class="tag-tipo" style="background: ${
    coresTipos[tipo] || "#999"
  }">${nomesTipos[tipo] || tipo}</span>`;
}

function carregarMaisPokemon() {
  quantidadeVisivel += QUANTIDADE_POR_PAGINA;
  renderizarPokemon();
}

function alternarFavorito(id) {
  if (favoritos.includes(id)) {
    favoritos = favoritos.filter((favorito) => favorito !== id);
    mostrarAviso("Pokémon removido dos favoritos.");
  } else {
    favoritos.push(id);
    mostrarAviso("Pokémon adicionado aos favoritos!");
  }

  localStorage.setItem("pokedex-favoritos", JSON.stringify(favoritos));
  atualizarContadorFavoritos();

  if (somenteFavoritos) {
    aplicarFiltros();
  } else {
    atualizarBotoesFavoritos();
  }

  const botaoModal = document.querySelector("#favorito-modal");
  if (botaoModal) {
    const estaFavoritado = favoritos.includes(id);
    botaoModal.textContent = estaFavoritado
      ? "♥ Remover dos favoritos"
      : "♡ Adicionar aos favoritos";
  }
}

function atualizarBotoesFavoritos() {
  document.querySelectorAll("[data-favorito]").forEach((botao) => {
    const id = Number(botao.dataset.favorito);
    const estaFavoritado = favoritos.includes(id);

    botao.classList.toggle("favorito", estaFavoritado);
    botao.textContent = estaFavoritado ? "♥" : "♡";
    botao.setAttribute("aria-pressed", String(estaFavoritado));
    botao.setAttribute(
      "aria-label",
      estaFavoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"
    );
  });
}

function atualizarContadorFavoritos() {
  elementos.contadorFavoritos.textContent = favoritos.length;
  elementos.botaoFavoritos.classList.toggle("ativo", somenteFavoritos);
  elementos.botaoFavoritos.setAttribute(
    "aria-pressed",
    String(somenteFavoritos)
  );
}

function alternarVisualizacaoFavoritos() {
  somenteFavoritos = !somenteFavoritos;
  atualizarContadorFavoritos();
  aplicarFiltros();
  document.querySelector("#colecao").scrollIntoView({ behavior: "smooth" });
}

async function abrirDetalhesPokemon(id) {
  elementos.modal.classList.add("aberto");
  elementos.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  pokemonAtual = null;
  elementos.modalCorpo.innerHTML = `
        <div class="estado-carregamento">
            <span class="spinner"></span>
            <p>Carregando detalhes...</p>
        </div>
    `;

  try {
    const pokemon = await buscarDetalhesPokemon(`${API_URL}/pokemon/${id}`);
    const especie = await buscarDetalhesPokemon(
      `${API_URL}/pokemon-species/${id}`
    );

    const descricaoEncontrada =
      especie.flavor_text_entries.find((item) => item.language.name === "pt") ||
      especie.flavor_text_entries.find((item) => item.language.name === "en");

    const descricao = descricaoEncontrada
      ? descricaoEncontrada.flavor_text.replace(/[\n\f]/g, " ")
      : "Não há descrição disponível para este Pokémon.";

    elementos.modalCorpo.innerHTML = criarDetalhesPokemon(
      pokemon,
      especie,
      descricao
    );
    pokemonAtual = pokemon;

    document
      .querySelector("#favorito-modal")
      .addEventListener("click", () => alternarFavorito(pokemon.id));
    document
      .querySelector("#botao-capturar")
      .addEventListener("click", capturarPokemonAtual);
  } catch (erro) {
    elementos.modalCorpo.innerHTML = `
            <div class="estado-carregamento">
                <p>Não foi possível carregar os detalhes deste Pokémon.</p>
            </div>
        `;
    console.error(erro);
  }
}

function criarDetalhesPokemon(pokemon, especie, descricao) {
  const imagem = obterImagemPokemon(pokemon);
  const tipoPrincipal = pokemon.types[0].type.name;
  const estaFavoritado = favoritos.includes(pokemon.id);

  const estatisticas = pokemon.stats
    .map(
      (item) => `
        <div class="linha-status">
            <span>${traduzirStatus(item.stat.name)}</span>
            <div class="barra-status">
                <span style="width: ${Math.min(
                  (item.base_stat / 255) * 100,
                  100
                )}%"></span>
            </div>
            <strong>${item.base_stat}</strong>
        </div>
    `
    )
    .join("");

  const habilidades = pokemon.abilities
    .map(
      (item) => `
        <span class="habilidade">${item.ability.name.replaceAll("-", " ")}${
        item.is_hidden ? " (oculta)" : ""
      }</span>
    `
    )
    .join("");

  const movimentos = pokemon.moves
    .slice(0, 12)
    .map(
      (item) => `
        <span class="movimento">${item.move.name.replaceAll("-", " ")}</span>
    `
    )
    .join("");

  return `
        <div class="modal-cabecalho">
            <div class="modal-imagem" style="--fundo-tipo: ${
              coresTipos[tipoPrincipal]
            }20">
                <img src="${imagem}" alt="${pokemon.name}">
            </div>
            <div class="modal-identificacao">
                <span class="numero-pokemon">Nº ${String(pokemon.id).padStart(
                  4,
                  "0"
                )}</span>
                <h2 id="modal-nome">${pokemon.name}</h2>
                <div class="tipos-pokemon">${pokemon.types
                  .map((item) => criarTagTipo(item.type.name))
                  .join("")}</div>
                <div class="modal-acoes">
                    <button class="botao-favorito-modal" id="favorito-modal" type="button">
                        ${
                          estaFavoritado
                            ? "♥ Remover dos favoritos"
                            : "♡ Adicionar aos favoritos"
                        }
                    </button>
                    <button class="botao-capturar" id="botao-capturar" type="button">Capturar</button>
                </div>
            </div>
        </div>

        <p class="modal-descricao">${descricao}</p>

        <div class="modal-bloco">
            <h3>Informações básicas</h3>
            <div class="dados-basicos">
                <div class="dado-basico"><strong>${(
                  pokemon.height / 10
                ).toFixed(1)} m</strong><span>Altura</span></div>
                <div class="dado-basico"><strong>${(
                  pokemon.weight / 10
                ).toFixed(1)} kg</strong><span>Peso</span></div>
                <div class="dado-basico"><strong>${
                  pokemon.base_experience ?? "—"
                }</strong><span>Experiência base</span></div>
            </div>
        </div>

        <div class="modal-bloco">
            <h3>Habilidades</h3>
            <div class="lista-habilidades">${habilidades}</div>
        </div>

        <div class="modal-bloco">
            <h3>Estatísticas</h3>
            ${estatisticas}
        </div>

        <div class="modal-bloco">
            <h3>Movimentos</h3>
            <div class="lista-movimentos">${movimentos}</div>
        </div>

        <div class="modal-bloco">
            <h3>Classificação</h3>
            <div class="dados-basicos">
                <div class="dado-basico"><strong>${
                  especie.is_legendary ? "Sim" : "Não"
                }</strong><span>Lendário</span></div>
                <div class="dado-basico"><strong>${
                  especie.is_mythical ? "Sim" : "Não"
                }</strong><span>Mítico</span></div>
                <div class="dado-basico"><strong>${
                  especie.capture_rate
                }</strong><span>Taxa de captura</span></div>
            </div>
        </div>
    `;
}

function traduzirStatus(nome) {
  const traducoes = {
    hp: "Vida",
    attack: "Ataque",
    defense: "Defesa",
    "special-attack": "Atq. especial",
    "special-defense": "Def. especial",
    speed: "Velocidade",
  };

  return traducoes[nome] || nome;
}

function fecharModal() {
  elementos.modal.classList.remove("aberto");
  elementos.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function mostrarAviso(mensagem, alerta = false) {
  clearTimeout(temporizadorAviso);
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.toggle("alerta", alerta);
  elementos.aviso.classList.add("visivel");

  temporizadorAviso = setTimeout(() => {
    elementos.aviso.classList.remove("visivel");
  }, 2500);
}

function limparPesquisa() {
  elementos.campoPesquisa.value = "";
  aplicarFiltros();
  elementos.campoPesquisa.focus();
}

function limparFiltros() {
  elementos.campoPesquisa.value = "";
  tipoSelecionado = "todos";
  somenteFavoritos = false;

  document.querySelectorAll(".filtro-tipo").forEach((botao) => {
    botao.classList.toggle("selecionado", botao.dataset.tipo === "todos");
  });

  atualizarContadorFavoritos();
  aplicarFiltros();
}

function criarItemPokemon(pokemon, textoBotao, aoClicar) {
  const li = document.createElement("li");
  li.className = "slot-pokemon";

  const imagem = document.createElement("img");
  imagem.src = pokemon.imagem;
  imagem.alt = pokemon.nome;

  const nome = document.createElement("span");
  nome.className = "slot-nome";
  nome.textContent = pokemon.nome;

  li.append(imagem, nome);

  if (textoBotao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-enviar";
    botao.textContent = textoBotao;
    botao.addEventListener("click", () => aoClicar(pokemon.codigo));
    li.appendChild(botao);
  }

  return li;
}

function desenharParty() {
  elementos.listaParty.innerHTML = "";

  for (let i = 0; i < LIMITE_PARTY; i++) {
    const pokemon = party[i];

    if (pokemon === undefined) {
      const vazio = document.createElement("li");
      vazio.className = "vazio";
      vazio.textContent = "Vazio";
      elementos.listaParty.appendChild(vazio);
    } else {
      elementos.listaParty.appendChild(
        criarItemPokemon(pokemon, "Enviar ao Prof. Carvalho", enviarAoCarvalho)
      );
    }
  }

  elementos.tituloParty.textContent = `Minha party (${party.length}/${LIMITE_PARTY})`;
}

function desenharCarvalho() {
  elementos.listaCarvalho.innerHTML = "";

  carvalho.forEach((pokemon) => {
    elementos.listaCarvalho.appendChild(criarItemPokemon(pokemon));
  });

  elementos.tituloCarvalho.textContent = `Com o Professor Carvalho (${carvalho.length})`;
  elementos.carvalhoVazio.hidden = carvalho.length > 0;
}

function salvarEDesenhar() {
  localStorage.setItem("pokedex-party", JSON.stringify(party));
  localStorage.setItem("pokedex-carvalho", JSON.stringify(carvalho));
  desenharParty();
  desenharCarvalho();
}

function capturarPokemonAtual() {
  if (!pokemonAtual) return;

  const novo = {
    codigo: Date.now(),
    id: pokemonAtual.id,
    nome: pokemonAtual.name,
    imagem:
      pokemonAtual.sprites.front_default || obterImagemPokemon(pokemonAtual),
  };

  if (party.length < LIMITE_PARTY) {
    party.push(novo);
    salvarEDesenhar();
    mostrarAviso(`Você capturou ${novo.nome}!`);
  } else {
    pedirSubstituicao(novo);
  }
}

function enviarAoCarvalho(codigo, avisar = true) {
  const pokemon = party.find((p) => p.codigo === codigo);
  if (!pokemon) return;

  party = party.filter((p) => p.codigo !== codigo);
  carvalho.push(pokemon);
  salvarEDesenhar();

  if (avisar) {
    mostrarAviso(`${pokemon.nome} foi enviado ao Professor Carvalho.`);
  }
}

function pedirSubstituicao(novoPokemon) {
  pokemonPendente = novoPokemon;

  elementos.textoTroca.textContent = `Quem vai para o Professor Carvalho para abrir espaço para ${novoPokemon.nome}?`;
  elementos.opcoesTroca.innerHTML = "";

  party.forEach((pokemon) => {
    elementos.opcoesTroca.appendChild(
      criarItemPokemon(pokemon, `Enviar ${pokemon.nome}`, trocarPokemon)
    );
  });

  elementos.dialogoTroca.showModal();
}

function trocarPokemon(codigo) {
  if (!pokemonPendente) return;

  const capturado = pokemonPendente;

  enviarAoCarvalho(codigo, false);2
  party.push(capturado);
  salvarEDesenhar();

  pokemonPendente = null;
  elementos.dialogoTroca.close();

  mostrarAviso(`Você capturou ${capturado.nome}!`);
}

elementos.dialogoTroca.addEventListener("close", () => {
  if (pokemonPendente) {
    mostrarAviso(`Captura cancelada. ${pokemonPendente.nome} fugiu!`, true);
    pokemonPendente = null;
  }
});

elementos.cancelarCaptura.addEventListener("click", () => {
  elementos.dialogoTroca.close();
});

elementos.campoPesquisa.addEventListener("input", aplicarFiltros);
elementos.botaoCarregar.addEventListener("click", carregarMaisPokemon);
elementos.botaoFavoritos.addEventListener(
  "click",
  alternarVisualizacaoFavoritos
);
document
  .querySelector("#limpar-filtros")
  .addEventListener("click", limparFiltros);
document
  .querySelector("#limpar-busca")
  .addEventListener("click", limparPesquisa);

elementos.listaTipos.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-tipo]");

  if (!botao) return;

  tipoSelecionado = botao.dataset.tipo;

  document.querySelectorAll(".filtro-tipo").forEach((item) => {
    item.classList.toggle("selecionado", item === botao);
  });

  aplicarFiltros();
});

elementos.grade.addEventListener("click", (evento) => {
  const botaoFavorito = evento.target.closest("[data-favorito]");

  if (botaoFavorito) {
    evento.stopPropagation();
    alternarFavorito(Number(botaoFavorito.dataset.favorito));
    return;
  }

  const card = evento.target.closest("[data-id]");

  if (card) {
    abrirDetalhesPokemon(Number(card.dataset.id));
  }
});

elementos.grade.addEventListener("keydown", (evento) => {
  if (evento.key !== "Enter" && evento.key !== " ") return;

  const card = evento.target.closest("[data-id]");

  if (card && evento.target === card) {
    evento.preventDefault();
    abrirDetalhesPokemon(Number(card.dataset.id));
  }
});

elementos.modalFechar.addEventListener("click", fecharModal);
elementos.modal.addEventListener("click", (evento) => {
  if (evento.target.matches("[data-fechar-modal]")) {
    fecharModal();
  }
});

document.addEventListener("keydown", (evento) => {

  if (elementos.dialogoTroca.open) return;

  if (evento.key === "Escape" && elementos.modal.classList.contains("aberto")) {
    fecharModal();
  }
});

desenharParty();
desenharCarvalho();
iniciarPokedex();