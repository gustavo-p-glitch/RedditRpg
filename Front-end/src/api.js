const BASE = "http://localhost:5000";

//  Funções

function getToken() {
  return localStorage.getItem("token");
}

function authHeader() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}


async function request(path, options = {}) {
  try {
    const response = await fetch(`${BASE}${path}`, options);
    const dados = await response.json();
    return { dados, ok: response.ok, status: response.status };
  } catch (erro) {
    console.error("Erro de rede:", erro);
    return { dados: { erro: "Sem conexão com o servidor." }, ok: false, status: 0 };
  }
}

//  Token

export function salvarToken(token) {
  localStorage.setItem("token", token);
}

export function removerToken() {
  localStorage.removeItem("token");
}

export function estaLogado() {
  return !!localStorage.getItem("token");
}

//  Usuários

// POST /usuarios/login
export async function login(email, senha) {
  return request("/usuarios/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
}

// POST /usuarios/cadastro

export async function cadastro(nome, email, senha, username, role = "Aventureiro") {
  return request("/usuarios/cadastro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha, username, role }),
  });
}

// GET /usuarios/meu-perfil
export async function getMeuPerfil() {
  return request("/usuarios/meu-perfil", {
    headers: authHeader(),
  });
}

// PUT /usuarios/meu-perfil
export async function atualizarPerfil(campos) {
  return request("/usuarios/meu-perfil", {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify(campos),
  });
}

// DELETE /usuarios/meu-perfil
export async function deletarConta() {
  return request("/usuarios/meu-perfil", {
    method: "DELETE",
    headers: authHeader(),
  });
}

// POST /usuarios/sair

export async function logout() {
  return request("/usuarios/sair", {
    method: "POST",
    headers: authHeader(),
  });
}

// POST /usuarios/<id>/seguir

export async function seguirUsuario(id) {
  return request(`/usuarios/${id}/seguir`, {
    method: "POST",
    headers: authHeader(),
  });
}

//  Postagens

// GET /postagens/feed/geral
export async function getFeedGeral(pagina = 1, tag = "", limite = 10) {
  const params = new URLSearchParams({ pagina, limite });
  if (tag) params.append("tag", tag);

  return request(`/postagens/feed/geral?${params}`, {
    headers: authHeader(),
  });
}

// GET /postagens/feed/amigos
export async function getFeedAmigos(pagina = 1, tag = "", limite = 10) {
  const params = new URLSearchParams({ pagina, limite });
  if (tag) params.append("tag", tag);

  return request(`/postagens/feed/amigos?${params}`, {
    headers: authHeader(),
  });
}

// POST /postagens/
export async function criarPost(conteudo, tags = [], visibilidade = "publico") {
  return request("/postagens/", {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ conteudo, tags, visibilidade }),
  });
}

// DELETE /postagens/<id>
export async function deletarPost(id) {
  return request(`/postagens/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}

// POST /postagens/<id>/curtir
export async function curtirPost(id) {
  return request(`/postagens/${id}/curtir`, {
    method: "POST",
    headers: authHeader(),
  });
}

// POST /postagens/<id>/comentario
export async function comentar(idPost, texto) {
  return request(`/postagens/${idPost}/comentario`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({ texto }),
  });
}


//  Notificações

// GET /notificacoes/
export async function getNotificacoes() {
  return request("/notificacoes/", {
    headers: authHeader(),
  });
}

// PATCH /notificacoes/marcar-lidas
export async function marcarNotificacoesLidas() {
  return request("/notificacoes/marcar-lidas", {
    method: "PATCH",
    headers: authHeader(),
  });
}

// GET /usuarios/seguindo
export async function getSeguindo() {
  return request("/usuarios/seguindo", {
    headers: authHeader(),
  });
}

// GET /usuarios/amigos
export async function getAmigos() {
  return request("/usuarios/amigos", {
    headers: authHeader(),
  });
}

// GET /postagens/usuario/<idUsuario>
export async function getPostsUsuario(idUsuario, pagina = 1) {
  return request(`/postagens/usuario/${idUsuario}?pagina=${pagina}`, {
    headers: authHeader(),
  });
}

// GET /usuarios/<idUsuario>
export async function getPerfilUsuario(idUsuario) {
  return request(`/usuarios/${idUsuario}`, {
    headers: authHeader(),
  });
}


export async function deletarComentario(idPost, idComentario) {
  return request(`/postagens/${idPost}/comentario`, {
    method: "DELETE",
    headers: authHeader(),
    body: JSON.stringify({ comentario_id: idComentario }),
  });
}