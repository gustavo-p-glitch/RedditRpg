import { useState, useEffect, useCallback } from "react";
import {
  login, cadastro, logout,
  salvarToken, removerToken, estaLogado,
  getMeuPerfil, getFeedGeral, getFeedAmigos,
  curtirPost, criarPost, deletarPost, getNotificacoes, marcarNotificacoesLidas,
  atualizarPerfil, seguirUsuario, getSeguindo, comentar, getAmigos, getPostsUsuario,
  getPerfilUsuario, deletarComentario, deletarConta
} from "./api";

import extraIcon from "./assets/extra.svg";
import commentIcon from "./assets/comment.svg";
import likeOutlineIcon from "./assets/btn-action.svg";
import likeFilledIcon from "./assets/btn-action-curtido.svg";
import btnTrocarFoto from "./assets/btn-trocar-foto.svg";
import imagem0 from "./assets/Imagem0.png";
import imagem1 from "./assets/Imagem1.png";
import imagem2 from "./assets/Imagem2.png";
import imagem3 from "./assets/Imagem3.png";
import imagem4 from "./assets/Imagem4.png";
import imagem5 from "./assets/Imagem5.png";
import imagem6 from "./assets/Imagem6.png";
import ornamentoBorda from "./assets/ornamentos_borda.png";
import molduraDividida from "./assets/moldura_dividida.png";
import cavaleiro from "./assets/cavaleiro.png";
import divisoria from "./assets/divisoria-posts.png"

const TODAS_TAGS = ["Regras", "Campanha", "DMs", "Homebrew", "Classes", "Raças", "Monstros", "Itens", "Combate"];

const FOTOS = [imagem1, imagem2, imagem3, imagem4, imagem5, imagem6];
function srcFoto(numeroFoto) {
  if (!numeroFoto) return imagem0;
  return FOTOS[Number(numeroFoto) - 1] ?? imagem0;
}

// Componentes reutilizáveis 

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
  const [visibilidade,     setVisibilidade]     = useState("publico");
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
    const { ok, dados } = await criarPost(conteudo, tagsSelecionadas, visibilidade);
    if (ok) {
      setConteudo("");
      setTagsSelecionadas([]);
      setVisibilidade("publico");
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
        
        <div style={{ display: 'flex', gap: '0.2cm' }}>
          <button
            type="button"
            className={`btn-submit ${visibilidade === "amigos" ? 'following' : ''}`}
            onClick={() => setVisibilidade(prev => prev === "publico" ? "amigos" : "publico")}
          >
            {visibilidade === "publico" ? "PÚBLICO" : "AMIGOS"}
          </button>

          <button className="btn-submit" onClick={handlePublicar} disabled={carregando}>
            {carregando ? "PUBLICAR" : "PUBLICAR"}
          </button>
        </div>

      </div>
    </aside>
  );
}

function ComentarioItem({ comentario, onVerPerfil, onDeletar }) {
  const [menuAberto, setMenuAberto] = useState(false); 

  const username   = comentario.autor?.username   ?? "?";
  const role       = comentario.autor?.role       ?? "Aventureiro";
  const numeroFoto = comentario.autor?.numero_foto ?? null;
  const autorId    = comentario.autor?.id        ?? null;

  return (
    <div className="comentario-item">
      <div className="comentario-layout">
        <div className="post-col-esq">
          <button 
            className="btn-perfil" 
            onClick={() => onVerPerfil && autorId && onVerPerfil(autorId, username)}
          >
            <Avatar username={username} numeroFoto={numeroFoto} className="avatar-comentario" />
          </button>
        </div>
        
        <div className="comentario-col-dir">
          <div className="post-user-info">
            <button 
              className="btn-perfil" 
              onClick={() => onVerPerfil && autorId && onVerPerfil(autorId, username)}
            >
              <span className="comentario-username">{username}</span>
            </button>
            <span className="post-badge-role comentario-role">{role}</span>

            {comentario.meu_comentario && (
              <div className="post-menu">
                <button 
                  className="btn-post-menu" 
                  onClick={() => setMenuAberto(v => !v)}
                >
                  <img src={extraIcon} alt="opções" className="post-menu-icon"/>
                </button>
                
                {menuAberto && (
                  <button 
                    className="post-menu-opcao post-menu-excluir" 
                    onClick={() => {
                      setMenuAberto(false);
                      onDeletar(comentario.id);
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}

          </div>
          
          <div className="comentario-conteudo">
            <p>{comentario.texto}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, podeExcluir = false, onExcluir, onVerPerfil }) {
  const [likes, setLikes]           = useState(post.likes);
  const [curtido, setCurtido]       = useState(post.curtido_por_mim ?? false);
  const [carregando, setCarregando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [comentarios, setComentarios]               = useState(post.comentarios ?? []);
  const [novoComentario, setNovoComentario]         = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

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

  async function handleComentar() {
    if (!novoComentario.trim() || enviandoComentario) return;
    setEnviandoComentario(true);

    const { dados, ok } = await comentar(post.id, novoComentario);
    if (ok) {
      setComentarios(prev => [...prev, dados.comentario]);
      setNovoComentario(""); 
    }
    setEnviandoComentario(false);
  }

  async function handleDeletarComentario(idComentario) {    
    const { ok } = await deletarComentario(post.id, idComentario);
    if (ok) {
      setComentarios(prev => prev.filter(c => c.id !== idComentario));
    }
  }
  

  const username   = post.autor?.username   ?? post.username ?? "?";
  const role       = post.autor?.role       ?? post.role     ?? "";
  const numeroFoto = post.autor?.numero_foto ?? null;
  const autorId    = post.autor?.id        ?? null;

  function irParaPerfil() {
    if (onVerPerfil && autorId) onVerPerfil(autorId, username);
  }

  return (
    <article className="post-card">
      <div className="post-layout">
        <div className="post-col-esq">
          <button className="btn-perfil" onClick={irParaPerfil}>
            <Avatar username={username} numeroFoto={numeroFoto} />
          </button>
        </div>

        <div className="post-col-dir">
          <div className="post-header">
            <div className="post-user-info">
              <button className="btn-perfil" onClick={irParaPerfil}>
                <span className="post-username">{username}</span>
              </button>
              <span className="post-badge-role">{role}</span>
              {post.visibilidade === "amigos" && (
                <span className="post-badge-role" title="Apenas amigos podem ver">Amigo</span>
              )}
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
              <img 
                src={curtido ? likeFilledIcon : likeOutlineIcon} 
                alt={curtido ? "Descurtir" : "Curtir"} 
                className="action-icon" 
              />
              <span>{likes}</span>
            </button>
            <button 
              className={`btn-action ${comentariosAbertos ? "ativo" : ""}`}
              onClick={() => setComentariosAbertos(v => !v)}
            >
              <img 
                src={commentIcon} 
                alt="Comentários" 
                className="action-icon" 
              />
              <span>{comentarios.length}</span>
            </button>
          </div>

          {comentariosAbertos && (
            <div className="post-comentarios-section">
              <div className="comentarios-lista">
                {comentarios.map(c => (
                  <ComentarioItem 
                    key={c.id} 
                    comentario={c} 
                    onVerPerfil={onVerPerfil}
                    onDeletar={handleDeletarComentario}
                  />
                ))}
              </div>
              
              <div className="form-novo-comentario">
                <textarea 
                  className="textarea-comentario"
                  placeholder="Deixe uma resposta..." 
                  value={novoComentario}
                  onChange={e => setNovoComentario(e.target.value)}
                  onKeyDown={e => { if(e.key === "Enter") handleComentar() }}
                />
                <button 
                  className="btn-submit" 
                  onClick={handleComentar} 
                  disabled={enviandoComentario || !novoComentario.trim()}
                >
                  {enviandoComentario ? "RESPONDER" : "RESPONDER"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </article>
  );
}

// Barra de navegação

function Navbar({ paginaAtual, setPaginaAtual, onLogout, notifNaoLidas = 0 }) {
  const links = [
    { id: "home",         label: "Início"       },
    { id: "notificacoes", label: `Notificações${notifNaoLidas > 0 ? ` (${notifNaoLidas})` : ""}` },
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
      </nav>
      {paginaAtual === "home" && (
        <div className="brand-banner">
          <h1>Dados & Discussões</h1>
        </div>
      )}
    </header>
  );
}

// Páginas

function PaginaHome({ onVerPerfil, filtroTag, setFiltroTag, setPaginaAtual }) {
  const [filtroFeed, setFiltroFeed] = useState("para-voce");
  const [posts,      setPosts]      = useState([]);
  const [carregando, setCarregando] = useState(true);

  const buscarPosts = useCallback(async () => {
    setCarregando(true);
    
    const { dados, ok } = filtroFeed === "amigos"
      ? await getFeedAmigos(1, filtroTag)
      : await getFeedGeral(1, filtroTag);

    if (!ok) {
      removerToken();
      setPaginaAtual("login");
      return;                  
    }

    setPosts(dados.postagens ?? []);
    setCarregando(false);
  }, [filtroFeed, filtroTag, setPaginaAtual]);

  useEffect(() => { buscarPosts(); }, [buscarPosts]);

  return (
    <div className="main-container">
      <aside className="sidebar-left">
        <div className="parchment-box">
          <h2>Sobre nós</h2>
          <p>Somos um grupo de estudantes de Sistemas de Informação que decidiu transformar nosso gosto por Dungeons & Dragons em um site para nosso trabalho final de Programação Web! A ideia foi criar um ambiente para todos aqueles fãns de RPG que queriam um lugar para falar sobre suas campanhas, personagens ou tirar dúvidas com a comunidade. É um DM e já quis conversar sobre sua nova mecânica Homebrew com alguém, mas não pode dar spoilers pros jogadores? Ou quer saber quais os melhores itens mágicos para dar ao seu bárbaro? Aqui é o lugar! O site ainda vai estar se desenvolvendo e ganhando novas funções com o tempo, então venham com a gente nessa jornada para fazer o Dados & Discussões (hehe) um lugar seguro para todos os jogadores! Esperamos que gostem e que os dados estejam ao seu favor ;)</p>
        </div>
      </aside>

      <main className="feed-area">
        <div className="feed-header">
          <select className="custom-select" value={filtroFeed} onChange={e => setFiltroFeed(e.target.value)}>
            <option value="para-voce">PARA VOCÊ</option>
            <option value="amigos">AMIGOS</option>
          </select>

          <select className="custom-select select-small" value={filtroTag} onChange={e => setFiltroTag(e.target.value)}>
            <option value="">TAG</option>
            {TODAS_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <section className="posts-timeline">
          {carregando && <p className="feed-vazio">Carregando posts...</p>}
          {!carregando && posts.length === 0 && <p className="feed-vazio">Nenhum post encontrado.</p>}
          {!carregando && posts.map(post => <PostCard key={post.id} post={post} onVerPerfil={onVerPerfil} />)}
        </section>
      </main>

      <aside className="sidebar-right">
        <div className="parchment-box">
          <h2>Tags populares</h2>
          <ul className="tags-list">
            {TODAS_TAGS.map(tag => (
              <li key={tag}>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setFiltroTag(tag);
                  }}
                >
                  {tag}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

// Tela de login

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
    <div className="auth-page-dividida">
      <img src={molduraDividida} alt="Moldura Dividida" className="moldura-dividida-bg" />
      
      <div className="auth-conteudo-dividido">
        <aside className="auth-metade esquerda">
          <div className="banner-content">
            <h1>Dados & Discussões</h1>
            <p>Somos um grupo de estudantes de Sistemas de Informação que decidiu transformar nosso gosto por Dungeons & Dragons em um site para nosso trabalho final de Programação Web! A ideia foi criar um ambiente para todos aqueles fãns de RPG que queriam um lugar para falar sobre suas campanhas, personagens ou tirar dúvidas com a comunidade. É um DM e já quis conversar sobre sua nova mecânica Homebrew com alguém, mas não pode dar spoilers pros jogadores? Ou quer saber quais os melhores itens mágicos para dar ao seu bárbaro? Aqui é o lugar! O site ainda vai estar se desenvolvendo e ganhando novas funções com o tempo, então venham com a gente nessa jornada para fazer o Dados & Discussões (hehe) um lugar seguro para todos os jogadores! Esperamos que gostem e que os dados estejam ao seu favor ;)</p>
          </div>
          <img src={cavaleiro} alt="Cavaleiro" className="cavaleiro-img" />
        </aside>

        <main className="auth-metade direita">
          <div className="form-card form-sem-borda">
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
    </div>
  );
}

// Tela de cadastro

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
    <div className="auth-page-dividida">
      <img src={molduraDividida} alt="Moldura Dividida" className="moldura-dividida-bg" />
      
      <div className="auth-conteudo-dividido">
        <aside className="auth-metade esquerda">
          <div className="banner-content">
            <h1>Dados & Discussões</h1>
            <p>Somos um grupo de estudantes de Sistemas de Informação que decidiu transformar nosso gosto por Dungeons & Dragons em um site para nosso trabalho final de Programação Web! A ideia foi criar um ambiente para todos aqueles fãns de RPG que queriam um lugar para falar sobre suas campanhas, personagens ou tirar dúvidas com a comunidade. É um DM e já quis conversar sobre sua nova mecânica Homebrew com alguém, mas não pode dar spoilers pros jogadores? Ou quer saber quais os melhores itens mágicos para dar ao seu bárbaro? Aqui é o lugar! O site ainda vai estar se desenvolvendo e ganhando novas funções com o tempo, então venham com a gente nessa jornada para fazer o Dados & Discussões (hehe) um lugar seguro para todos os jogadores! Esperamos que gostem e que os dados estejam ao seu favor ;)</p>
          </div>
          <img src={cavaleiro} alt="Cavaleiro" className="cavaleiro-img" />
        </aside>

        <main className="auth-metade direita">
          <div className="form-card form-sem-borda">
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
    </div>
  );
}

function ItemNotificacao({ n, onVerPerfil, textoAcao, onToggleSeguir }) {
  const [seguindo, setSeguindo] = useState(n.remetente?.seguindo_eu ?? false);

  useEffect(() => {
    setSeguindo(n.remetente?.seguindo_eu ?? false);
  }, [n.remetente?.seguindo_eu]);

  async function handleSeguir() {
    if (!n.remetente?.id) return;
    const { dados, ok } = await seguirUsuario(n.remetente.id);
    if (ok) {
      setSeguindo(dados.seguindo);
      if (onToggleSeguir) {
        onToggleSeguir(n.remetente.id, dados.seguindo, n.remetente);
      }
    }
  }

  return (
    <div className={`notificacao-item ${n.lida ? "" : "nao-lida"}`}>
      <div className="notificacao-info">
        <button className="btn-perfil" onClick={() => onVerPerfil && n.remetente?.id && onVerPerfil(n.remetente.id, n.remetente.username)}>
          <Avatar username={n.remetente?.username ?? "?"} numeroFoto={n.remetente?.numero_foto ?? null} />
        </button>
        <span>
          <button className="btn-perfil" onClick={() => onVerPerfil && n.remetente?.id && onVerPerfil(n.remetente.id, n.remetente.username)}>
            <span className="post-username">{n.remetente?.username}</span>
          </button>
          {" "}{textoAcao(n.tipo)}
        </span>
      </div>

      {n.tipo === "seguiu" && (
        <button
          className={`btn-submit ${seguindo ? "following" : ""}`}
          onClick={handleSeguir}
        >
          {seguindo ? "UNFOLLOW" : "FOLLOW"}
        </button>
      )}
    </div>
  );
}

// Tela de notificações

function PaginaNotificacoes({ onVerPerfil }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [seguindo, setSeguindo] = useState([]);
  const [amigos, setAmigos]     = useState([]);
  const [carregando,   setCarregando]   = useState(true);

  useEffect(() => {
    async function buscar() {
      const { dados, ok } = await getNotificacoes();
      if (ok) {
        setNotificacoes(dados.notificacoes ?? []);
        await marcarNotificacoesLidas();
      }
      
      const { dados: dadosSeguindo, ok: okSeguindo } = await getSeguindo();
      if (okSeguindo) {
        setSeguindo(dadosSeguindo.seguindo ?? []);
      }

      const { dados: dadosAmigos, ok: okAmigos } = await getAmigos();
      if (okAmigos) {
        setAmigos(dadosAmigos.amigos ?? []);
      }

      setCarregando(false);
    }
    buscar();
  }, []);

  function handleToggleSeguir(idUsuario, isSeguindo, dadosRemetente) {
    if (isSeguindo) {
      setSeguindo(prev => {
        if (prev.some(u => u.id === idUsuario)) return prev;
        return [...prev, {
          id: idUsuario,
          username: dadosRemetente.username,
          role: "Aventureiro"
        }];
      });

      setAmigos(prev => {
        if (prev.some(u => u.id === idUsuario)) return prev;
        return [...prev, {
          id: idUsuario,
          username: dadosRemetente.username,
          role: "Aventureiro" 
        }];
      });

    } else {
      setSeguindo(prev => prev.filter(user => user.id !== idUsuario));
      setAmigos(prev => prev.filter(user => user.id !== idUsuario));
    }
  }
  function textoAcao(tipo) {
    if (tipo === "curtiu")   return "curtiu seu post";
    if (tipo === "comentou") return "comentou no seu post";
    if (tipo === "seguiu")   return "começou a seguir você";
    return tipo;
  }

  return (
    <div className="main-container notificacoes-main-container">
      <main className="notificacoes-box">
        <h1 className="page-title">Notificações</h1>
        {!carregando && notificacoes.length === 0 && <p className="feed-vazio">Nenhuma notificação.</p>}
        {notificacoes.map(n => (
          <ItemNotificacao
            key={n.id}
            n={n}
            onVerPerfil={onVerPerfil}
            textoAcao={textoAcao}
            onToggleSeguir={handleToggleSeguir}
          />
        ))}
      </main>
      <aside className="box-seguindo">
        <div className="parchment-box">
          <h2>Seguindo</h2>
          <ul className="lista-seguindo-notif">
            {seguindo.length > 0 ? (
              seguindo.map(user => (
                <li key={user.id}>
                  <div className="post-user-info">
                    <a 
                      href="#" 
                      className="post-username"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onVerPerfil) onVerPerfil(user.id, user.username);
                      }}
                    >
                      {user.username}
                    </a>
                    <span className="post-badge-role">{user.role}</span>
                  </div>
                </li>
              ))
            ) : (
              <li><p>Ninguém ainda...</p></li>
            )}
          </ul>
        </div>

        <div className="parchment-box">
          <h2>Amigos</h2>
          <ul className="lista-seguindo-notif">
            {amigos.length > 0 ? (
              amigos.map(user => (
                <li key={user.id}>
                  <div className="post-user-info">
                    <a 
                      href="#" 
                      className="post-username"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onVerPerfil) onVerPerfil(user.id, user.username);
                      }}
                    >
                      {user.username}
                    </a>
                    <span className="post-badge-role">{user.role}</span>
                  </div>
                </li>
              ))
            ) : (
              <li><p>Nenhum amigo ainda...</p></li>
            )}
          </ul>
        </div>

      </aside>
    </div>
  );
}

// Perfil do usuário

function PaginaPerfil({ setPaginaAtual, setFiltroTag }) {
  const [usuario,      setUsuario]      = useState(null);
  const [posts,        setPosts]        = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [editando,     setEditando]     = useState(false);
  const [salvando,     setSalvando]     = useState(false);
  const [formPerfil,   setFormPerfil]   = useState({ username: "", role: "", bio: "", numero_foto: null });
  const [editandoFoto, setEditandoFoto] = useState(false); 
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

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

  const buscarPostsDoPerfil = useCallback(async () => {
    if (!usuario) return;
    const { dados: feed, ok } = await getFeedGeral(1, "", 50);
    if (ok) setPosts((feed.postagens ?? []).filter(p => p.autor_id === usuario.id));
  }, [usuario]);

  function handleExcluirPost(idPost) {
    setPosts(prev => prev.filter(p => p.id !== idPost));
  }

  function iniciarEdicao() {
    setFormPerfil({
      username: usuario.username,
      role: usuario.role || "",
      bio: usuario.bio || "",
      numero_foto: usuario.numero_foto
    });
    setEditando(true);
  }

  async function handleExcluirConta() {
    const { ok } = await deletarConta();
    if (ok) {
      removerToken();
      setPaginaAtual("login");
    } else {
      alert("Erro ao excluir conta. Tente novamente.");
    }
  }

  async function handleSalvarEdicao() {
    setSalvando(true);
    const { dados, ok } = await atualizarPerfil(formPerfil);
    if (ok) {
      setUsuario(prev => ({ ...prev, ...formPerfil }));
      setEditando(false);
      setEditandoFoto(false); 
    } else {
      alert("Falha ao salvar as alterações.");
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
    <div className="main-container perfil-main-container">
      <aside className="sidebar-left">
        <div className="perfil-cabecalho">
          
          <div className="avatar-wrapper">
            <Avatar
              username={editando ? formPerfil.username : usuario.username}
              numeroFoto={editando ? formPerfil.numero_foto : usuario.numero_foto}
              className="avatar-perfil"
            />
            {editando && (
              <button className="btn-trocar-foto"
                onClick={() => setEditandoFoto(v => !v)}
                title="Trocar foto"
              >
                <img src={btnTrocarFoto} alt="Trocar foto" />
              </button>
            )}
          </div>

          {editando && editandoFoto && (
            <div>
              <p className="seletor-foto-title">Escolha sua foto:</p>
              <SeletorFoto 
                fotoAtual={formPerfil.numero_foto} 
                onEscolher={(num) => setFormPerfil({ ...formPerfil, numero_foto: num })} 
              />
            </div>
          )}

          <div className="perfil-info">
            {editando ? (
              <div>
                <div>
                  <label>Username</label>
                  <input
                    className ="editar-perfil"
                    type="text"
                    value={formPerfil.username}
                    maxLength={20}
                    onChange={e => setFormPerfil({ ...formPerfil, username: e.target.value })}
                  />
                </div>
                <div>
                  <label>Cargo</label>
                  <select
                    className="editar-perfil"
                    value={formPerfil.role || "Aventureiro"}
                    onChange={e => setFormPerfil({ ...formPerfil, role: e.target.value })}
                  >
                    <option value="Aventureiro">Aventureiro</option>
                    <option value="Jogador">Jogador</option>
                    <option value="DM">DM</option>
                  </select>
                </div>
                <div>
                  <label>Biografia (Máx 160)</label>
                  <textarea
                    className ="editar-perfil"
                    value={formPerfil.bio}
                    onChange={e => setFormPerfil({ ...formPerfil, bio: e.target.value })}
                    maxLength={160}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="post-user-info">
                  <span className="post-username-perfil">{usuario.username}</span>
                  <span className="post-badge-role">{usuario.role}</span>
                </div>
                <p className="description">{usuario.bio || "Escreva algo sobre você"}</p>
                <p className="description">Entrou em {usuario.data_entrada}</p>
              </>
            )}
          </div>
          
          <button 
            className="btn-submit" 
            onClick={editando ? handleSalvarEdicao : iniciarEdicao}
            disabled={salvando}
          >
            {salvando ? "SALVANDO..." : editando ? "CONFIRMAR" : "EDITAR PERFIL"}
          </button>
          {editando && !confirmarExclusao && (
            <button type="button" className="btn-excluir" onClick={() => setConfirmarExclusao(true)}>
              EXCLUIR CONTA
            </button>
          )}  

          {confirmarExclusao && (
            <div className="confirmacao-exclusao">
              <p>Certeza que você quer excluir sua conta? essa ação não pode ser desfeita</p>
              <button type="button" className="btn-submit" onClick={handleExcluirConta}>
                CONFIRMAR
              </button>
              <button type="button" className="btn-submit" onClick={() => setConfirmarExclusao(false)}>
                CANCELAR
              </button>
            </div>
          )}
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
                <li key={tag}>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setFiltroTag(tag);
                      setPaginaAtual("home");
                    }}
                  >
                    {tag}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

// Perfil de outro usuário

function PaginaPerfilOutro({ idUsuario, usernameUsuario, onVerPerfil, setPaginaAtual, setFiltroTag }) {
  const [usuario,    setUsuario]    = useState(null);
  const [posts,      setPosts]      = useState([]);
  const [seguindo,   setSeguindo]   = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscar() {
      setCarregando(true);
      
      const resPerfil = await getPerfilUsuario(idUsuario);
      if (resPerfil.ok) {
        setUsuario(resPerfil.dados);
        setSeguindo(resPerfil.dados.seguindo_eu ?? false);
      }
      
      const resPosts = await getPostsUsuario(idUsuario);
      if (resPosts.ok) {
        setPosts(resPosts.dados.postagens ?? []);
      }
      
      setCarregando(false);
    }
    
    if (idUsuario) buscar();
  }, [idUsuario]);

  async function handleSeguir() {
    const { dados, ok } = await seguirUsuario(idUsuario);
    if (ok) {
      setSeguindo(dados.seguindo);
      setUsuario(prev => ({
        ...prev, 
        seguidores: dados.seguindo ? (prev.seguidores + 1) : (prev.seguidores - 1)
      }));
    }
  }

  if (carregando) return (
    <div className="main-container perfil-main-container">
      <main className="feed-area feed-perfil">
        <p className="feed-vazio">Carregando perfil...</p>
      </main>
    </div>
  );

  if (!usuario) return (
    <div className="main-container">
      <main className="feed-area feed-perfil">
        <p className="feed-vazio">Usuário não encontrado.</p>
      </main>
    </div>
  );

  return (
    <div className="main-container perfil-main-container">
      
      <aside className="sidebar-left">
        <div className="perfil-cabecalho">
          <Avatar
            username={usuario.username}
            numeroFoto={usuario.numero_foto ?? null}
            className="avatar-perfil"
          />
          <div className="perfil-info">
            <div className="post-user-info">
              <span className="post-username-perfil">{usuario.username}</span>
              <span className="post-badge-role">{usuario.role}</span>
            </div>
            <p className="description">{usuario.bio || "Sem bio ainda."}</p>
            <p className="description">Entrou em {usuario.data_entrada}</p>
          </div>
          <button 
            className={`btn-submit ${seguindo ? "following" : ""}`} 
            onClick={handleSeguir}
          >
            {seguindo ? "UNFOLLOW" : "FOLLOW"}
          </button>
        </div>
      </aside>

      <div className="perfil-centro">
        <div className="perfil-stats-container">
          {[
            ["POSTS",      posts.length],
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
                  <PostCard key={post.id} post={post} onVerPerfil={onVerPerfil} />
                ))
              : <p className="feed-vazio">Ainda sem posts...</p>
            }
          </section>
        </main>
      </div>

      <aside className="coluna-direita-perfil">
        <div className="perfil-sidebar-tags">
          <div className="parchment-box">
            <h2>Tags populares</h2>
            <ul className="tags-list">
              {TODAS_TAGS.map(tag => (
                <li key={tag}>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setFiltroTag(tag);
                      setPaginaAtual("home");
                    }}
                  >
                    {tag}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function App() {
  const [paginaAtual,    setPaginaAtual]    = useState(estaLogado() ? "home" : "login");
  const [notifNaoLidas,  setNotifNaoLidas]  = useState(0);
  const [sessaoKey,      setSessaoKey]      = useState(0);
  const [perfilVisitado, setPerfilVisitado] = useState(null);
  const [meuId,          setMeuId]          = useState(null); 
  const [filtroTag,      setFiltroTag]      = useState("");

  function handleVerPerfil(id, username) {
    if (meuId && id === meuId) {
      setPaginaAtual("perfil");
    } else {
      setPerfilVisitado({ id, username });
      setPaginaAtual("perfil-outro");
    }
  }

  function onLoginSucesso(usuario) {
    setSessaoKey(k => k + 1);
    if (usuario?.id) setMeuId(usuario.id); 
    setPaginaAtual("home");
  }

  async function handleLogout() {
    await logout();
    removerToken();
    setMeuId(null); 
    setPaginaAtual("login");
  }

  useEffect(() => {
    if (!estaLogado()) {
      setMeuId(null);
      return;
    }

    getNotificacoes().then(({ dados, ok }) => {
      if (ok) setNotifNaoLidas(dados.nao_lidas ?? 0);
    });

    if (!meuId) {
      getMeuPerfil().then(({ dados, ok }) => {
        if (ok) setMeuId(dados.id);
      });
    }
  }, [paginaAtual, meuId]);

  const paginasAuth = ["login", "signup"];
  const ehPaginaAuth = paginasAuth.includes(paginaAtual);

  return (
    <>
      {!ehPaginaAuth && (
        <>
          <img src={ornamentoBorda} alt="borda" className="ornamento-borda esquerda" />
          <img src={ornamentoBorda} alt="borda" className="ornamento-borda direita" />
          <Navbar
            paginaAtual={paginaAtual}
            setPaginaAtual={setPaginaAtual}
            onLogout={handleLogout}
            notifNaoLidas={notifNaoLidas}
          />
        </>
      )}

      {paginaAtual === "login"        && <PaginaLogin        setPaginaAtual={setPaginaAtual} onLoginSucesso={onLoginSucesso} />}
      {paginaAtual === "signup"       && <PaginaCadastro     setPaginaAtual={setPaginaAtual} onLoginSucesso={onLoginSucesso} />}
      {paginaAtual === "home"         && <PaginaHome key={sessaoKey} onVerPerfil={handleVerPerfil} filtroTag={filtroTag} setFiltroTag={setFiltroTag} setPaginaAtual={setPaginaAtual} />}
      {paginaAtual === "notificacoes" && <PaginaNotificacoes onVerPerfil={handleVerPerfil} />}
      {paginaAtual === "perfil"       && <PaginaPerfil setPaginaAtual={setPaginaAtual} setFiltroTag={setFiltroTag} />}
      {paginaAtual === "perfil-outro" && perfilVisitado && (
        <PaginaPerfilOutro
          idUsuario={perfilVisitado.id}
          usernameUsuario={perfilVisitado.username}
          onVerPerfil={handleVerPerfil}
          setPaginaAtual={setPaginaAtual}
          setFiltroTag={setFiltroTag}
        />
      )}
    </>
  );
}
