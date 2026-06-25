from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
import database as db
from auth import autenticar

postagens_bp = Blueprint("postagens", __name__, url_prefix="/postagens")

TAGS_VALIDAS = {"Mago", "Campanha", "DMs", "Homebrew", "Classes", "Fichas", "Raças"}


# Helpers


def enriquecer_post(post: dict, uid_logado: str) -> dict:
    """Adiciona dados do autor, curtidas e comentários ao post."""
    
    autor = db.usuarios.find_one({"id": post["autor_id"]})
    
    total_curtidas = db.curtidas.count_documents({"post_id": post["id"]})
    curtido = db.curtidas.find_one({"post_id": post["id"], "usuario_id": uid_logado}) is not None
    
    coments = []
    for c in db.comentarios.find({"post_id": post["id"]}):
        autor_comentario = db.usuarios.find_one({"id": c["autor_id"]})
        
        c.pop('_id', None) 
        
        c["autor"] = {
            "id": autor_comentario["id"],
            "nome": autor_comentario["nome"],
            "username": autor_comentario["username"]
        } if autor_comentario else None
        
        coments.append(c)

    post_limpo = post.copy()
    post_limpo.pop('_id', None)

    return {
        **post_limpo,
        "autor": {
            "id": autor["id"],
            "nome": autor["nome"],
            "username": autor["username"],
            "role": autor["role"],
        } if autor else None,
        "likes": total_curtidas,
        "curtido_por_mim": curtido,
        "comments": len(coments),
        "comentarios": coments,
    }


def criar_notificacao(destinatario_id, remetente_id, tipo, post_id=None):
    if destinatario_id == remetente_id:
        return
    db.notificacoes.append(
        {
            "id": str(uuid.uuid4()),
            "destinatario_id": destinatario_id,
            "remetente_id": remetente_id,
            "tipo": tipo,
            "post_id": post_id,
            "lida": False,
            "criado_em": datetime.now(timezone.utc).isoformat(),
        }
    )


# POST /postagens


@postagens_bp.post("/")
@autenticar
def criar_post():
    dados = request.get_json(silent=True) or {}
    conteudo = (dados.get("conteudo") or "").strip()
    tags = dados.get("tags", [])

    if not conteudo:
        return jsonify({"erro": "O conteúdo da postagem não pode ser vazio."}), 400

    if len(conteudo) > 500:
        return jsonify({"erro": "Conteúdo excede 500 caracteres."}), 400

    tags_filtradas = [t for t in tags if t in TAGS_VALIDAS]

    post = {
        "id": str(uuid.uuid4()),
        "autor_id": request.usuario_id,
        "conteudo": conteudo,
        "tags": tags_filtradas,
        "criado_em": datetime.now(timezone.utc).isoformat(),
    }
    db.postagens.insert_one(post)

    return jsonify(
        {
            "mensagem": "Postagem criada!",
            "postagem": enriquecer_post(post, request.usuario_id),
        }
    ), 201


# GET /postagens/feed/geral


@postagens_bp.get("/feed/geral")
@autenticar
def feed_geral():
    pagina = int(request.args.get("pagina", 1))
    limite = int(request.args.get("limite", 10))
    tag = request.args.get("tag", "")
    offset = (pagina - 1) * limite

    posts = sorted(db.postagens, key=lambda p: p["criado_em"], reverse=True)

    if tag:
        posts = [p for p in posts if tag in p.get("tags", [])]

    total = len(posts)
    posts_paginados = [
        enriquecer_post(p, request.usuario_id) for p in posts[offset : offset + limite]
    ]

    return jsonify(
        {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "postagens": posts_paginados,
        }
    )


# GET /postagens/feed/amigos


@postagens_bp.get("/feed/amigos")
@autenticar
def feed_amigos():
    pagina = int(request.args.get("pagina", 1))
    limite = int(request.args.get("limite", 10))
    tag = request.args.get("tag", "")
    offset = (pagina - 1) * limite

    seguindo_ids = {
        s["seguindo_id"]
        for s in db.seguidores
        if s["seguidor_id"] == request.usuario_id
    }
    seguindo_ids.add(request.usuario_id)  # inclui posts próprios

    posts = sorted(
        [p for p in db.postagens if p["autor_id"] in seguindo_ids],
        key=lambda p: p["criado_em"],
        reverse=True,
    )

    if tag:
        posts = [p for p in posts if tag in p.get("tags", [])]

    total = len(posts)
    posts_paginados = [
        enriquecer_post(p, request.usuario_id) for p in posts[offset : offset + limite]
    ]

    return jsonify(
        {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "postagens": posts_paginados,
        }
    )


# DELETE /postagens/<id_post>


@postagens_bp.delete("/<id_post>")
@autenticar
def deletar_post(id_post):
    post = db.postagens.find_one({"id": payload["id_post"]})
    if not post:
        return jsonify({"erro": "Postagem não encontrada."}), 404

    if post["autor_id"] != request.usuario_id:
        return jsonify({"erro": "Sem permissão para excluir esta postagem."}), 403

    db.postagens.remove(post)
    db.curtidas[:] = [c for c in db.curtidas if c["post_id"] != id_post]
    db.comentarios[:] = [c for c in db.comentarios if c["post_id"] != id_post]

    return jsonify({"mensagem": "Postagem excluída."})


# POST /postagens/<id_post>/curtir


@postagens_bp.post("/<id_post>/curtir")
@autenticar
def curtir(id_post):
    post = db.postagens.find_one({"id": payload["id_post"]})
    if not post:
        return jsonify({"erro": "Postagem não encontrada."}), 404

    curtida = next(
        (
            c
            for c in db.curtidas
            if c["post_id"] == id_post and c["usuario_id"] == request.usuario_id
        ),
        None,
    )

    if curtida:
        db.curtidas.remove(curtida)
        total = db.curtidas.count_documents({"post_id": id_post})
        return jsonify(
            {"mensagem": "Curtida removida.", "curtido": False, "total_curtidas": total}
        )

    db.curtidas.append(
        {
            "id": str(uuid.uuid4()),
            "post_id": id_post,
            "usuario_id": request.usuario_id,
            "criado_em": datetime.now(timezone.utc).isoformat(),
        }
    )
    criar_notificacao(post["autor_id"], request.usuario_id, "curtiu", id_post)

    total = db.curtidas.count_documents({"post_id": id_post})
    return jsonify(
        {"mensagem": "Postagem curtida!", "curtido": True, "total_curtidas": total}
    ), 201


# POST /postagens/<id_post>/comentario


@postagens_bp.post("/<id_post>/comentario")
@autenticar
def comentar(id_post):
    post = db.postagens.find_one({"id": payload["id_post"]})
    if not post:
        return jsonify({"erro": "Postagem não encontrada."}), 404

    dados = request.get_json(silent=True) or {}
    texto = (dados.get("texto") or "").strip()

    if not texto:
        return jsonify({"erro": "O comentário não pode ser vazio."}), 400

    if len(texto) > 300:
        return jsonify({"erro": "Comentário excede 300 caracteres."}), 400

    comentario = {
        "id": str(uuid.uuid4()),
        "post_id": id_post,
        "autor_id": request.usuario_id,
        "texto": texto,
        "criado_em": datetime.now(timezone.utc).isoformat(),
    }
    db.comentarios.append(comentario)
    criar_notificacao(post["autor_id"], request.usuario_id, "comentou", id_post)

    autor = db.usuarios.find_one({"id": request.usuario_id})
    return jsonify(
        {
            "mensagem": "Comentário adicionado.",
            "comentario": {
                **comentario,
                "autor": {
                    "id": autor["id"],
                    "nome": autor["nome"],
                    "username": autor["username"],
                }
                if autor
                else None,
            },
        }
    ), 201


# DELETE /postagens/<id_post>/comentario


@postagens_bp.delete("/<id_post>/comentario")
@autenticar
def deletar_comentario(id_post):
    dados = request.get_json(silent=True) or {}
    comentario_id = dados.get("comentario_id")

    if not comentario_id:
        return jsonify({"erro": "Informe o comentario_id no body."}), 400

    comentario = next(
        (
            c
            for c in db.comentarios
            if c["id"] == comentario_id and c["post_id"] == id_post
        ),
        None,
    )
    if not comentario:
        return jsonify({"erro": "Comentário não encontrado."}), 404

    post = db.postagens.find_one({"id": payload["id_post"]})
    autor_do_post = post["autor_id"] if post else None

    if (
        comentario["autor_id"] != request.usuario_id
        and autor_do_post != request.usuario_id
    ):
        return jsonify({"erro": "Sem permissão para excluir este comentário."}), 403

    db.comentarios.remove(comentario)
    return jsonify({"mensagem": "Comentário excluído."})
