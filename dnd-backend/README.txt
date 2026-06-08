# DnD — Backend Flask

API REST para a rede social temática de D&D. Banco em memória (dados somem ao reiniciar).

## Instalação e execução

pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

---

## Autenticação

Todos os endpoints (exceto `/usuarios/cadastro` e `/usuarios/login`) exigem o header:

```
Authorization: Bearer <token>
```

O token é retornado no login e no cadastro.

---

## Endpoints

### 👤 Usuários

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/usuarios/cadastro` | ❌ | Cria conta |
| POST | `/usuarios/login` | ❌ | Retorna token JWT |
| GET | `/usuarios/meu-perfil` | ✅ | Dados + stats do usuário logado |
| PUT | `/usuarios/meu-perfil` | ✅ | Edita nome, bio, role, username, senha |
| DELETE | `/usuarios/meu-perfil` | ✅ | Exclui conta e todos os dados |
| GET | `/usuarios/fotos` | ✅ | Fotos do usuário logado |
| POST | `/usuarios/sair` | ✅ | Logout (descarte o token no cliente) |
| POST | `/usuarios/<id>/seguir` | ✅ | Seguir/deixar de seguir (toggle) |

#### POST /usuarios/cadastro
```json
{
  "nome": "Arthera",
  "email": "arthera@dnd.com",
  "senha": "minhasena123",
  "username": "arthera_elfa",
  "role": "Jogadora"
}
```

#### POST /usuarios/login
```json
{ "email": "arthera@dnd.com", "senha": "minhasena123" }
```

#### PUT /usuarios/meu-perfil
```json
{
  "nome": "Novo Nome",
  "bio": "Elfa arqueira do plano astral",
  "role": "DM Veterana",
  "username": "novo_username",
  "senha_atual": "minhasena123",
  "nova_senha": "senhaforte456"
}
```
> Todos os campos são opcionais. `nova_senha` só funciona se `senha_atual` estiver correto.

---

### 📜 Postagens

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/postagens/` | ✅ | Cria post |
| GET | `/postagens/feed/geral` | ✅ | Feed de todos (paginado) |
| GET | `/postagens/feed/amigos` | ✅ | Feed de quem você segue |
| DELETE | `/postagens/<id>` | ✅ | Exclui post próprio |

#### POST /postagens/
```json
{
  "conteudo": "Finalmente matei o dragão! 🐉",
  "tags": ["Campanha", "Classes"]
}
```
Tags válidas: `Mago`, `Campanha`, `DMs`, `Homebrew`, `Classes`, `Fichas`, `Raças`

#### GET /postagens/feed/geral
```
?pagina=1&limite=10&tag=Campanha
```

---

### ❤️ Interações

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/postagens/<id>/curtir` | ✅ | Curtir/descurtir (toggle) |
| POST | `/postagens/<id>/comentario` | ✅ | Adiciona comentário |
| DELETE | `/postagens/<id>/comentario` | ✅ | Remove comentário |

#### POST /postagens/<id>/comentario
```json
{ "texto": "Que sessão épica! 🎲" }
```

#### DELETE /postagens/<id>/comentario
```json
{ "comentario_id": "uuid-do-comentario" }
```

---

### 🔍 Pesquisa

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/pesquisar/` | ✅ | Busca usuários e/ou posts |

```
?q=dragao&tipo=tudo&pagina=1&limite=10
```
`tipo`: `usuarios` | `postagens` | `tudo`

---

### 🔔 Notificações

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/notificacoes/` | ✅ | Lista notificações do usuário |
| PATCH | `/notificacoes/marcar-lidas` | ✅ | Marca todas como lidas |

Notificações são geradas automaticamente quando alguém curte, comenta ou segue.

---

## Estrutura de arquivos

```
dnd-backend/
├── app.py            ← Servidor Flask + registro de blueprints
├── auth.py           ← JWT, bcrypt, decorator @autenticar
├── database.py       ← Listas em memória (substitua por DB real)
├── requirements.txt
└── routes/
    ├── usuarios.py   ← /usuarios/*
    ├── postagens.py  ← /postagens/*
    └── extras.py     ← /pesquisar e /notificacoes
```

---

## Para produção

- Troque `database.py` por **PostgreSQL** (SQLAlchemy) ou **MongoDB** (PyMongo)
- Troque `JWT_SECRET` por uma variável de ambiente
- Use **gunicorn** como servidor WSGI: `gunicorn app:app`
- Restrinja o CORS para o domínio do seu frontend
- Para upload de fotos, use **AWS S3** ou similar
