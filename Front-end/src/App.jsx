import { useState, useEffect, useCallback } from "react";
import {
  login, cadastro, logout,
  salvarToken, removerToken, estaLogado,
  getMeuPerfil, getFeedGeral, getFeedAmigos,
  curtirPost, criarPost, deletarPost, getNotificacoes, marcarNotificacoesLidas,
  atualizarPerfil,
} from "./api";

import extraIcon from "./assets/extra.svg";

import imagem1 from "./assets/imagem1.png";
import imagem2 from "./assets/imagem2.png";
import imagem3 from "./assets/imagem3.png";
import imagem4 from "./assets/imagem4.png";
import imagem5 from "./assets/imagem5.png";
import imagem6 from "./assets/imagem6.png";
import imagem0 from "./assets/imagem0.png";

const TODAS_TAGS = ["Regras", "Campanha", "DMs", "Homebrew", "Classes", "Raças", "Monstros", "Itens", "Combate"];

const FOTOS = [imagem1, imagem2, imagem3, imagem4, imagem5, imagem6];
function srcFoto(numeroFoto) {
  if (!numeroFoto) return imagem0;
  return FOTOS[Number(numeroFoto) - 1] ?? imagem0;
}

function Avatar({ username = "?", numeroFoto = null, className = "avatar-img" }) {
  return (
    <img
      src={srcFoto(numeroFoto)}
      alt={username}
      className={className}
    />
  );
}

function SeletorFoto({ fotoAtual, onEscolher }) {
  return (
    <div className="seletor-foto-container">
      {FOTOS.map((src, i) => {
        const numero = i + 1;
        const selecionada = Number(fotoAtual) === numero;
        return (
          <img
            key={numero}
            src={src}
            alt={`Foto ${numero}`}
            onClick={() => onEscolher(numero)}
            className={`seletor-foto-img ${selecionada ? "selecionada" : ""}`}
          />
        );
      })}
    </div>
  );
}

function FormPost({ onPostar, usuario }) {
  const [conteudo,         setConteudo]         = useState("");
  const [tagsSelecionadas, setTagsSelecionadas] = useState([]);
  const [carregando,       setCarregando]       = useState(false);
  const [erro,             setErro]             = useState("");

  function toggleTag(tag) {
    setTagsSelecionadas(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handlePublicar() {
    if (!conteudo.trim()) { setErro("O conteúdo não pode ser vazio."); return; }
    setCarregando(true);
    setErro("");
    const { ok, dados } = await criarPost(conteudo, tagsSelecionadas);
    if (ok) {
      setConteudo("");
      setTagsSelecionadas([]);
      onPostar();
    } else {
      setErro(dados.erro ?? "Erro ao publicar.");
    }
    setCarregando(false);
  }

  return (
    <aside className="post-form-container">
      <div className="parchment-box">
        {usuario && (
          <div className="post-user-info">
            <span className="post-username">{usuario.username}</span>
            <span className="post-badge-role">{usuario.role}</span>
          </div>
        )}
        <textarea
          className="form-post-textarea"
          placeholder="O que está acontecendo na sua campanha?"
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
          maxLength={500}
        />
        <div className="form-post-tags">
          {TODAS_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              className={`tag-btn ${tagsSelecionadas.includes(tag) ? 'selected' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {erro && <p className="form-erro">{erro}</p>}
        <button className="btn-submit" onClick={handlePublicar} disabled={carregando}>
          {carregando ? "Publicando..." : "PUBLICAR"}
        </button>
      </div>
    </aside>
  );
}

function PostCard({ post, podeExcluir = false, onExcluir }) {
  const [likes, setLikes]           = useState(post.likes);
  const [curtido, setCurtido]       = useState(post.curtido_por_mim ?? false);
  const [carregando, setCarregando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  async function handleCurtir() {
    if (carregando) return;
    setCarregando(true);
    const { dados, ok } = await curtirPost(post.id);
    if (ok) {
      setCurtido(dados.curtido);
      setLikes(dados.total_curtidas);
    }
    setCarregando(false);
  }

  async function handleExcluir() {
    setMenuAberto(false);
    const { ok } = await deletarPost(post.id);
    if (ok && onExcluir) onExcluir(post.id);
  }

  const username   = post.autor?.username   ?? post.username ?? "?";
  const role       = post.autor?.role       ?? post.role     ?? "";
  const numeroFoto = post.autor?.numero_foto ?? null;

  return (
    <article className="post-card">
      <div className="post-layout">
        <div className="post-col-esq">
          <Avatar username={username} numeroFoto={numeroFoto} />
        </div>

        <div className="post-col-dir">
          <div className="post-user-info">
            <span className="post-username">{username}</span>
            <span className="post-badge-role">{role}</span>
          </div>

          <div className="post-content">
            <p>{post.conteudo}</p>
            <div className="post-tags-container">
              {(post.tags ?? []).map(tag => (
                <a key={tag} href="#" className="post-tag">#{tag}</a>
              ))}
            </div>
          </div>

          <div className="post-actions">
            <button
              className={`btn-action ${curtido ? "curtido" : ""}`}
              onClick={handleCurtir}
              disabled={carregando}
            >
              ❤️ {likes}
            </button>
            <button className="btn-action">
              💬 {post.comments ?? 0}
            </button>
          </div>

          {podeExcluir && (
            <div className="post-menu">
              <button className="btn-post-menu" onClick={() => setMenuAberto(v => !v)}>
                <img src={extraIcon} alt="opções" className="post-menu-icon" />
              </button>
              {menuAberto && (
                <button className="post-menu-opcao post-menu-excluir" onClick={handleExcluir}>
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Navbar({ paginaAtual, setPaginaAtual, onLogout, notifNaoLidas = 0 }) {
  const links = [
    { id: "home",         label: "Início"       },
    { id: "notificacoes", label: `Notificações${notifNaoLidas > 0 ? ` (${notifNaoLidas})` : ""}` },
    { id: "dnd",          label: "DnD"           },
    { id: "regras",       label: "Regras"        },
    { id: "perfil",       label: "Perfil"        },
  ];

  return (
    <header className="main-header">
      <nav className="navbar">
        <div className="nav-links">
          {links.map(link => (
            <a
              key={link.id}
              href="#"
              className={paginaAtual === link.id ? "active" : ""}
              onClick={e => { e.preventDefault(); setPaginaAtual(link.id); }}
            >
              {link.label}
            </a>
          ))}
          <a href="#" onClick={e => { e.preventDefault(); onLogout(); }}>
            Sair
          </a>
        </div>
        <div className="nav-search">
          <input type="text" placeholder="Pesquisar..." />
        </div>
      </nav>
      {paginaAtual === "home" && (
        <div className="brand-banner">
          <h1>Nome Foda</h1>
        </div>
      )}
    </header>
  );
}

function PaginaHome() {
  const [filtroFeed, setFiltroFeed] = useState("para-voce");
  const [filtroTag,  setFiltroTag]  = useState("");
  const [posts,      setPosts]      = useState([]);
  const [carregando, setCarregando] = useState(true);

  const buscarPosts = useCallback(async () => {
    setCarregando(true);
    const { dados, ok } = filtroFeed === "amigos"
      ? await getFeedAmigos(1, filtroTag)
      : await getFeedGeral(1, filtroTag);
    if (ok) setPosts(dados.postagens ?? []);
    setCarregando(false);
  }, [filtroFeed, filtroTag]);

  useEffect(() => { buscarPosts(); }, [buscarPosts]);

  return (
    <div className="main-container">
      <aside className="sidebar-left">
        <div className="parchment-box">
          <h2>Sobre nós</h2>
          <p>Uma taverna virtual para aventureiros de D&amp;D! Compartilhe campanhas, personagens e histórias épicas.</p>
        </div>
      </aside>

      <main className="feed-area">
        <div className="feed-header">
          <select className="custom-select" value={filtroFeed} onChange={e => setFiltroFeed(e.target.value)}>
            <option value="para-voce">Para Você</option>
            <option value="amigos">Amigos</option>
          </select>

          <select className="custom-select select-small" value={filtroTag} onChange={e => setFiltroTag(e.target.value)}>
            <option value="">+ Tag</option>
            {TODAS_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <section className="posts-timeline">
          {carregando && <p className="feed-vazio">Carregando posts...</p>}
          {!carregando && posts.length === 0 && <p className="feed-vazio">Nenhum post encontrado.</p>}
          {!carregando && posts.map(post => <PostCard key={post.id} post={post} />)}
        </section>
      </main>

      <aside className="sidebar-right">
        <div className="parchment-box">
          <h2>Tags populares</h2>
          <ul className="tags-list">
            {TODAS_TAGS.map(tag => (
              <li key={tag}><a href="#">{tag}</a></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function PaginaLogin({ setPaginaAtual, onLoginSucesso }) {
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [erro, setErro]             = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleEntrar() {
    if (!email || !senha) { setErro("Preencha e-mail e senha."); return; }
    setCarregando(true);
    setErro("");
    const { dados, ok } = await login(email, senha);
    if (ok) {
      salvarToken(dados.token);
      onLoginSucesso(dados.usuario);
    } else {
      setErro(dados.erro ?? "Erro ao fazer login.");
    }
    setCarregando(false);
  }

  function handleKeyDown(e) { if (e.key === "Enter") handleEntrar(); }

  return (
    <div className="auth-page">
      <aside className="auth-banner">
        <div className="banner-content">
          <h1>Nome Foda</h1>
          <p>Texto sobre nós e o website</p>
        </div>
      </aside>
      <main className="auth-form-area">
        <div className="form-card">
          <h2>Bem-vindo de volta!</h2>
          <div className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
            {erro && <p className="form-erro">{erro}</p>}
            <button className="btn-submit" onClick={handleEntrar} disabled={carregando}>
              {carregando ? "Entrando..." : "ENTRAR"}
            </button>
          </div>
          <div className="form-footer">
            Ainda não tem uma conta?{" "}
            <a href="#" onClick={e => { e.preventDefault(); setPaginaAtual("signup"); }}>Clique aqui</a>
          </div>
        </div>
      </main>
    </div>
  );
}

function PaginaCadastro({ setPaginaAtual, onLoginSucesso }) {
  const [nome,           setNome]           = useState("");
  const [email,          setEmail]          = useState("");
  const [username,       setUsername]       = useState("");
  const [senha,          setSenha]          = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro,           setErro]           = useState("");
  const [carregando,     setCarregando]     = useState(false);

  async function handleCriarConta() {
    if (!nome || !email || !username || !senha) { setErro("Todos os campos são obrigatórios."); return; }
    if (senha !== confirmarSenha) { setErro("As senhas não coincidem."); return; }
    if (senha.length < 6) { setErro("Senha deve ter no mínimo 6 caracteres."); return; }
    setCarregando(true);
    setErro("");
    const { dados, ok } = await cadastro(nome, email, senha, username);
    if (ok) {
      salvarToken(dados.token);
      onLoginSucesso(dados.usuario);
    } else {
      setErro(dados.erro ?? "Erro ao criar conta.");
    }
    setCarregando(false);
  }

  return (
    <div className="auth-page">
      <aside className="auth-banner">
        <div className="banner-content">
          <h1>Nome Foda</h1>
          <p>Texto sobre nós e o website</p>
        </div>
      </aside>
      <main className="auth-form-area">
        <div className="form-card">
          <h2>Role iniciativa!</h2>
          <div className="auth-form">
            <div className="input-group">
              <label>Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Confirmar Senha</label>
              <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} />
            </div>
            {erro && <p className="form-erro">{erro}</p>}
            <button className="btn-submit" onClick={handleCriarConta} disabled={carregando}>
              {carregando ? "Criando conta..." : "CRIAR CONTA"}
            </button>
          </div>
          <div className="form-footer">
            Já tem uma conta?{" "}
            <a href="#" onClick={e => { e.preventDefault(); setPaginaAtual("login"); }}>Clique aqui</a>
          </div>
        </div>
      </main>
    </div>
  );
}

function PaginaNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando,   setCarregando]   = useState(true);

  useEffect(() => {
    async function buscar() {
      const { dados, ok } = await getNotificacoes();
      if (ok) {
        setNotificacoes(dados.notificacoes ?? []);
        await marcarNotificacoesLidas();
      }
      setCarregando(false);
    }
    buscar();
  }, []);

  function textoAcao(tipo) {
    if (tipo === "curtiu")   return "curtiu seu post";
    if (tipo === "comentou") return "comentou no seu post";
    if (tipo === "seguiu")   return "começou a seguir você";
    return tipo;
  }

  return (
    <div className="main-container">
      <main className="feed-area feed-centro">
        <h1 className="page-title">Notificações</h1>
        {carregando && <p className="feed-vazio">Carregando...</p>}
        {!carregando && notificacoes.length === 0 && <p className="feed-vazio">Nenhuma notificação.</p>}
        {notificacoes.map(n => (
          <div key={n.id} className={`notificacao-item ${n.lida ? "" : "nao-lida"}`}>
            <Avatar username={n.remetente?.username ?? "?"} numeroFoto={n.remetente?.numero_foto ?? null} />
            <span><strong>{n.remetente?.username}</strong> {textoAcao(n.tipo)}</span>
          </div>
        ))}
      </main>
    </div>
  );
}

function PaginaPerfil() {
  const [usuario,      setUsuario]      = useState(null);
  const [posts,        setPosts]        = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [salvando,     setSalvando]     = useState(false);

  useEffect(() => {
    async function buscar() {
      const { dados, ok } = await getMeuPerfil();
      if (ok) {
        setUsuario(dados);
        const { dados: feed, ok: okFeed } = await getFeedGeral(1, "", 50);
        if (okFeed) {
          setPosts((feed.postagens ?? []).filter(p => p.autor_id === dados.id));
        }
      }
      setCarregando(false);
    }
    buscar();
  }, []);

  // Recarrega só os posts do perfil — chamado pelo FormPost após publicar
  const buscarPostsDoPerfil = useCallback(async () => {
    if (!usuario) return;
    const { dados: feed, ok } = await getFeedGeral(1, "", 50);
    if (ok) setPosts((feed.postagens ?? []).filter(p => p.autor_id === usuario.id));
  }, [usuario]);

  // Remove o post da lista local após exclusão bem-sucedida
  function handleExcluirPost(idPost) {
    setPosts(prev => prev.filter(p => p.id !== idPost));
  }

  async function handleEscolherFoto(numero) {
    setSalvando(true);
    const { dados, ok } = await atualizarPerfil({ numero_foto: numero });
    if (ok) {
      setUsuario(u => ({ ...u, numero_foto: numero }));
      setEditandoFoto(false);
    }
    setSalvando(false);
  }

  if (carregando) return (
    <div className="main-container">
      <main className="feed-area feed-perfil">
        <p className="feed-vazio">Carregando perfil...</p>
      </main>
    </div>
  );

  if (!usuario) return (
    <div className="main-container">
      <main className="feed-area feed-perfil">
        <p className="feed-vazio">Erro ao carregar perfil.</p>
      </main>
    </div>
  );

  return (
    <div className="main-container">
      <aside className="sidebar-left">
        <div className="perfil-cabecalho">
          <div className="avatar-wrapper">
            <Avatar
              username={usuario.username}
              numeroFoto={usuario.numero_foto ?? null}
              className="avatar-perfil"
            />
            <button className="btn-trocar-foto"
              onClick={() => setEditandoFoto(v => !v)}
              title="Trocar foto"
            >📷</button>
          </div>

          {editandoFoto && (
            <div>
              <p className="seletor-foto-title">Escolha sua foto:</p>
              <SeletorFoto fotoAtual={usuario.numero_foto} onEscolher={handleEscolherFoto} />
              {salvando && <p className="salvando-texto">Salvando...</p>}
            </div>
          )}

          <div className="perfil-info">
            <div className="post-user-info">
              <span className="post-username-perfil">{usuario.username}</span>
              <span className="post-badge-role">{usuario.role}</span>
            </div>
            <p className="description">{usuario.bio || "Aqui é onde a biografia da pessoa vai ficar..."}</p>
            <p className="description">Entrou em {usuario.data_entrada}</p>
          </div>
          <button className="btn-submit">EDITAR PERFIL</button>
        </div>
      </aside>

      <div className="perfil-centro">
        <div className="perfil-stats-container">
          {[
            ["POSTS",      posts.length],
            ["SEGUINDO",   usuario.seguindo   ?? 0],
            ["SEGUIDORES", usuario.seguidores ?? 0],
          ].map(([label, valor]) => (
            <div key={label} className="stat-box">
              <span className="stat-label">{label}</span>
              <span className="stat-num">{valor}</span>
            </div>
          ))}
        </div>

        <main className="feed-area feed-perfil-ajustado">
          <section className="posts-timeline">
            {posts.length > 0
              ? posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    podeExcluir={true}
                    onExcluir={handleExcluirPost}
                  />
                ))
              : <p className="feed-vazio">Ainda sem posts...</p>
            }
          </section>
        </main>
      </div>
      <aside className="coluna-direita-perfil">
        <FormPost onPostar={buscarPostsDoPerfil} usuario={usuario} />
        <div className="perfil-sidebar-tags">
          <div className="parchment-box">
            <h2>Tags populares</h2>
            <ul className="tags-list">
              {TODAS_TAGS.map(tag => (
                <li key={tag}><a href="#">{tag}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function App() {
  const [paginaAtual,   setPaginaAtual]   = useState(estaLogado() ? "home" : "login");
  const [notifNaoLidas, setNotifNaoLidas] = useState(0);
  const [sessaoKey,     setSessaoKey]     = useState(0);

  function onLoginSucesso() {
    setSessaoKey(k => k + 1);
    setPaginaAtual("home");
  }

  async function handleLogout() {
    await logout();
    removerToken();
    setPaginaAtual("login");
  }

  useEffect(() => {
    if (!estaLogado()) return;
    getNotificacoes().then(({ dados, ok }) => {
      if (ok) setNotifNaoLidas(dados.nao_lidas ?? 0);
    });
  }, [paginaAtual]);

  const paginasAuth = ["login", "signup"];
  const ehPaginaAuth = paginasAuth.includes(paginaAtual);

  return (
    <>
      {!ehPaginaAuth && (
        <Navbar
          paginaAtual={paginaAtual}
          setPaginaAtual={setPaginaAtual}
          onLogout={handleLogout}
          notifNaoLidas={notifNaoLidas}
        />
      )}

      {paginaAtual === "login"        && <PaginaLogin        setPaginaAtual={setPaginaAtual} onLoginSucesso={onLoginSucesso} />}
      {paginaAtual === "signup"       && <PaginaCadastro     setPaginaAtual={setPaginaAtual} onLoginSucesso={onLoginSucesso} />}
      {paginaAtual === "home"         && <PaginaHome key={sessaoKey} />}
      {paginaAtual === "notificacoes" && <PaginaNotificacoes />}
      {paginaAtual === "perfil"       && <PaginaPerfil />}
      {(paginaAtual === "dnd" || paginaAtual === "regras") && (
        <div className="main-container">
          <main className="feed-area feed-centro">
            <h1 className="page-title">{paginaAtual === "dnd" ? "DnD" : "Regras"}</h1>
            <p>Página em construção...</p>
          </main>
        </div>
      )}
    </>
  );
}
