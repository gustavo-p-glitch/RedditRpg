import { useState, useEffect, useCallback } from "react";
import {
  login, cadastro, logout,
  salvarToken, removerToken, estaLogado,
  getMeuPerfil, getFeedGeral, getFeedAmigos,
  curtirPost, getNotificacoes, marcarNotificacoesLidas,
} from "./api";

const TODAS_TAGS = ["Mago", "Campanha", "DMs", "Homebrew", "Classes", "Fichas", "Raças"];

//  COMPONENTE: Avatar
//  Gera um círculo com as iniciais do usuário (sem precisar de foto)
//  Props: username (string), tamanho (número, padrão 36)

function Avatar({ username, tamanho = 36 }) {
  const iniciais = username.slice(0, 2).toUpperCase();
  // Escolhe uma cor baseada na primeira letra do nome
  const cores = ["#8b1a1a", "#1a4a8b", "#1a6b3a", "#7a3d8b", "#8b5a1a"];
  const cor = cores[username.charCodeAt(0) % cores.length];

  return (
    <div style={{
      width: tamanho, height: tamanho,
      borderRadius: "50%",
      background: cor,
      color: "#f5e6c8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cinzel', serif",
      fontSize: tamanho * 0.35,
      fontWeight: 700,
      flexShrink: 0,
      border: "2px solid #d4a843",
      letterSpacing: "0.03em",
    }}>
      {iniciais}
    </div>
  );
}

//  COMPONENTE: PostCard
//  Recebe um objeto "post" como prop e renderiza o card completo.
//  Props: post (objeto vindo do backend com autor, conteudo, tags, likes, curtido_por_mim)

function PostCard({ post }) {
  const [likes, setLikes]           = useState(post.likes);
  const [curtido, setCurtido]       = useState(post.curtido_por_mim ?? false);
  const [carregando, setCarregando] = useState(false);

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

  // backend manda autor: { username, role } — ?? garante fallback caso venha diferente
  const username = post.autor?.username ?? post.username ?? "?";
  const role     = post.autor?.role     ?? post.role     ?? "";

  return (
    <article className="post-card">
      <div className="post-header">
        <Avatar username={username} />
        <div className="post-user-info">
          <span className="post-username">{username}</span>
          <span className="post-badge-role">{role}</span>
        </div>
      </div>

      <div className="post-content">
        {/* backend usa "conteudo", mock usava "content" */}
        <p>{post.conteudo ?? post.content}</p>

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
    </article>
  );
}

//  COMPONENTE: Navbar
//  Props: paginaAtual (string), setPaginaAtual (função), onLogout (função), notifNaoLidas (número)

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
          <a href="#" onClick={e => { e.preventDefault(); onLogout(); }}
            style={{ color: "#D3230C" }}>
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
//  PÁGINA: Home

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

//  PÁGINA: Login

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
            {erro && <p style={{ color: "#D3230C", fontSize: "0.875rem", margin: "0" }}>{erro}</p>}
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

//  PÁGINA: Cadastro

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
            {erro && <p style={{ color: "#D3230C", fontSize: "0.875rem", margin: "0" }}>{erro}</p>}
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

//  PÁGINA: Notificações

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
          <div key={n.id} className="notificacao-item" style={{ fontWeight: n.lida ? "normal" : "bold" }}>
            <Avatar username={n.remetente?.username ?? "?"} tamanho={32} />
            <span><strong>{n.remetente?.username}</strong> {textoAcao(n.tipo)}</span>
          </div>
        ))}
      </main>
    </div>
  );
}

//  PÁGINA: Perfil

function PaginaPerfil() {
  const [usuario,    setUsuario]    = useState(null);
  const [posts,      setPosts]      = useState([]);
  const [carregando, setCarregando] = useState(true);

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
      <main className="feed-area feed-perfil">
        {/* Cabeçalho do perfil */}
        <div className="perfil-cabecalho parchment-box">
          <Avatar username={usuario.username} tamanho={76} />
          <div className="perfil-info">
            <p className="post-username">{usuario.username}</p>
            <span className="post-badge-role">{usuario.role}</span>
            <p>{usuario.bio || "Sem bio ainda."}</p>
            <small>Entrou em {usuario.data_entrada}</small>
          </div>
          <button className="btn-submit">EDITAR PERFIL</button>
        </div>

        {/* Estatísticas — valores reais do backend */}
        <div className="perfil-stats">
          {[
            ["POSTS",      posts.length],
            ["SEGUINDO",   usuario.seguindo   ?? 0],
            ["SEGUIDORES", usuario.seguidores ?? 0],
          ].map(([label, valor]) => (
            <div key={label} className="stat-box">
              <span className="stat-label">{label}</span>
              <span className="stat-valor">{valor}</span>
            </div>
          ))}
        </div>

        {/* Só os posts desse usuário */}
        <section className="posts-timeline">
          {posts.length > 0
            ? posts.map(post => <PostCard key={post.id} post={post} />)
            : <p className="feed-vazio">Ainda sem posts...</p>
          }
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

//  APP PRINCIPAL
//  Controla qual página está sendo exibida com useState.
//  (Futuramente isso seria trocado por react-router-dom)

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
      {/* Navbar só aparece fora das páginas de login/cadastro */}
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
      {paginaAtual === "home"         && <PaginaHome />}
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

