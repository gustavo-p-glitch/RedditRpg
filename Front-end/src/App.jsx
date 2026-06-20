import { useState } from "react";

// DADOS MOCK - tem que substituir por fetch() quando o backend existir
// POSTS_MOCK - tem que trocar por isso aqui quando tiver backend:
//    const [posts, setPosts] = useState([]);
//    useEffect(() => {
//      fetch('/api/posts')
//        .then(r => r.json())
//        .then(data => setPosts(data));
//    }, []);

const POSTS_MOCK = [
  {
    id: 1,
    username: "Mordecai_Sábio",
    role: "Dungeon Master",
    content: "Socorro, mago tem feitiço demais pra administrar! Esqueci de usar Fireball de novo na última sessão, o grupo quase morreu por minha causa",
    tags: ["Mago"],
    likes: 42,
    comments: 7,
  },
  {
    id: 2,
    username: "Arthera_Elfa",
    role: "Jogadora",
    content: "Finalmente matei o dragão! Levou 6 meses de sessões toda semana, mas valeu cada segundo. Campanha épica!",
    tags: ["Campanha"],
    likes: 128,
    comments: 23,
  },
  {
    id: 3,
    username: "Grimbold_DM",
    role: "DM Veterano",
    content: "Alguém tem dicas de homebrew para campanha no fundo do mar? Quero criar criaturas novas mas tô sem inspiração...",
    tags: ["Homebrew", "DMs"],
    likes: 15,
    comments: 44,
  },
  {
    id: 4,
    username: "Sorraia_Barda",
    role: "Jogadora",
    content: "Meu bardo rolou um 1 natural numa Performance pra distrair o guarda...",
    tags: ["Classes"],
    likes: 87,
    comments: 31,
  },
  {
    id: 5,
    username: "Aventureiro",
    role: "Jogador",
    content: "Primeira sessão como jogador hoje! Criei um paladino meio torto mas com muito carisma.",
    tags: ["Classes"],
    likes: 5,
    comments: 2,
  },
  {
    id: 6,
    username: "Aventureiro",
    role: "Jogador",
    content: "Alguém tem dicas de como montar uma ficha de paladino pra iniciante? Tô me perdendo nas proficiências...",
    tags: ["Fichas"],
    likes: 3,
    comments: 8,
  },
];

const TODAS_TAGS = ["Mago", "Campanha", "DMs", "Homebrew", "Classes", "Fichas", "Raças"];

const NOTIFICACOES_MOCK = [
  { id: 1, user: "Arthera_Elfa", acao: "curtiu seu post" },
  { id: 2, user: "Grimbold_DM", acao: "comentou no seu post" },
  { id: 3, user: "Mordecai_Sábio", acao: "começou a seguir você" },
];

//  COMPONENTE: Avatar
//  Gera um círculo com as iniciais do usuário (sem precisar de foto) DELETAR
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
//  useState gerencia o like localmente dentro do componente.
//  Props: post (objeto com id, username, role, content, tags, likes, comments)

function PostCard({ post }) {
  // useState retorna [valorAtual, funçãoParaAtualizar]
  const [likes, setLikes] = useState(post.likes);
  const [curtido, setCurtido] = useState(false);

  function handleCurtir() {
    setLikes(curtido ? likes - 1 : likes + 1);
    setCurtido(!curtido);
  }

  return (
    <article className="post-card">
      <div className="post-header">
        <Avatar username={post.username} />
        <div className="post-user-info">
          <span className="post-username">{post.username}</span>
          <span className="post-badge-role">{post.role}</span>
        </div>
      </div>

      <div className="post-content">
        {/* {post.content} injeta o texto do objeto no JSX */}
        <p>{post.content}</p>

        <div className="post-tags-container">
          {/* .map() nas tags também: cada string vira um link */}
          {post.tags.map(tag => (
            <a key={tag} href="#" className="post-tag">#{tag}</a>
          ))}
        </div>
      </div>

      <div className="post-actions">
        <button
          className={`btn-action ${curtido ? "curtido" : ""}`}
          onClick={handleCurtir}
        >
          ❤️ {likes}
        </button>
        <button className="btn-action">
          💬 {post.comments}
        </button>
      </div>
    </article>
  );
}

//  COMPONENTE: Navbar
//  Props: paginaAtual (string), setPaginaAtual (função)

function Navbar({ paginaAtual, setPaginaAtual }) {
  const links = [
    { id: "home",         label: "Início"       },
    { id: "notificacoes", label: "Notificações"  },
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

  // Filtra o array de posts pela tag selecionada
  const postsFiltrados = POSTS_MOCK.filter(post =>
    filtroTag === "" || post.tags.includes(filtroTag)
  );

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
          {/*
            postsFiltrados.map() transforma cada objeto do array
            num componente <PostCard>, passando o objeto como prop "post".
            A prop "key" é obrigatória quando se usa .map() — React usa
            ela internamente pra saber qual item mudou.
          */}
          {postsFiltrados.length > 0
            ? postsFiltrados.map(post => <PostCard key={post.id} post={post} />)
            : <p className="feed-vazio">Nenhum post com essa tag ainda...</p>
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

//  PÁGINA: Login

function PaginaLogin({ setPaginaAtual }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function handleEntrar() {
    // Futuramente: fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, senha }) })
    setPaginaAtual("home");
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
          <h2>Bem-vindo de volta!</h2>
          <div className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
            </div>
            <button className="btn-submit" onClick={handleEntrar}>ENTRAR</button>
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

function PaginaCadastro({ setPaginaAtual }) {
  const [nome,           setNome]           = useState("");
  const [email,          setEmail]          = useState("");
  const [senha,          setSenha]          = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  function handleCriarConta() {
    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }
    // Futuramente: fetch('/api/register', { method: 'POST', ... })
    setPaginaAtual("home");
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
            <button className="btn-submit" onClick={handleCriarConta}>CRIAR CONTA</button>
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
  return (
    <div className="main-container">
      <main className="feed-area feed-centro">
        <h1 className="page-title">Notificações</h1>
        {NOTIFICACOES_MOCK.map(n => (
          <div key={n.id} className="notificacao-item">
            <Avatar username={n.user} tamanho={32} />
            <span><strong>{n.user}</strong> {n.acao}</span>
          </div>
        ))}
      </main>
    </div>
  );
}

//  PÁGINA: Perfil

function PaginaPerfil() {
  // Futuramente esses dados virão do backend (usuário logado)
  const usuario = {
    username:    "Aventureiro",
    role:        "Jogador",
    bio:         "Aqui é onde a biografia da pessoa vai ficar e ela vai colocar umas coisas sobre si.",
    dataEntrada: "31/05/2026",
    seguindo:    12,
    seguidores:  8,
  };

  // Filtra apenas os posts que pertencem a esse usuário
  const postsDoPerfil = POSTS_MOCK.filter(post => post.username === usuario.username);

  return (
    <div className="main-container">
      <main className="feed-area feed-perfil">
        {/* Cabeçalho do perfil */}
        <div className="perfil-cabecalho">
          <Avatar username={usuario.username} tamanho={76} />
          <div className="perfil-info">
            <p className="post-username">{usuario.username}</p>
            <span className="post-badge-role">{usuario.role}</span>
            <p>{usuario.bio}</p>
            <small>Entrou em {usuario.dataEntrada}</small>
          </div>
          <button className="btn-submit">EDITAR PERFIL</button>
        </div>

        {/* Estatísticas — posts usa o tamanho do array filtrado */}
        <div className="perfil-stats">
          {[["POSTS", postsDoPerfil.length], ["SEGUINDO", usuario.seguindo], ["SEGUIDORES", usuario.seguidores]].map(
            ([label, valor]) => (
              <div key={label} className="stat-box">
                <span className="stat-label">{label}</span>
                <span className="stat-valor">{valor}</span>
              </div>
            )
          )}
        </div>

        {/* Só os posts desse usuário */}
        <section className="posts-timeline">
          {postsDoPerfil.length > 0
            ? postsDoPerfil.map(post => <PostCard key={post.id} post={post} />)
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
  const [paginaAtual, setPaginaAtual] = useState("login");

  const paginasAuth = ["login", "signup"];
  const ehPaginaAuth = paginasAuth.includes(paginaAtual);

  return (
    <>
      {/* Navbar só aparece fora das páginas de login/cadastro */}
      {!ehPaginaAuth && (
        <Navbar paginaAtual={paginaAtual} setPaginaAtual={setPaginaAtual} />
      )}

      {paginaAtual === "login"        && <PaginaLogin        setPaginaAtual={setPaginaAtual} />}
      {paginaAtual === "signup"       && <PaginaCadastro     setPaginaAtual={setPaginaAtual} />}
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
