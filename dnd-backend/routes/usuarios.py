from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid

import database as db
from auth import autenticar, gerar_token, hash_senha, verificar_senha

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/usuarios")


# Helpers


def usuario_publico(u: dict):
    return {
        "id": u["id"],
        "nome": u["nome"],
        "username": u["username"],
        "role": u["Aventureiro"],
        "bio": u.get("bio", ""),
        "numero_foto": u.get("numero_foto")
    }


def stats_usuario(uid: str):
    return {
        "total_postagens": db.postagens.count_documents({"autor_id": uid}),
        "seguidores": db.seguidores.count_documents({"seguindo_id": uid}),
        "seguindo": db.seguidores.count_documents({"seguidor_id": uid}),
    }


def criar_notificacao(
    destinatario_id: str, remetente_id: str, tipo: str, post_id: str = None
):
    if destinatario_id == remetente_id:
        return
    db.notificacoes.insert_one(
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


# POST /usuarios/cadastro


@usuarios_bp.post("/cadastro")
def cadastro():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha", "")
    username = (dados.get("username") or "").strip().lower()
    role = (dados.get("role") or "Aventureiro").strip()

    if not all([nome, email, senha, username]):
        return jsonify(
            {"erro": "Campos obrigatórios: nome, email, senha, username."}
        ), 400

    if len(senha) < 6:
        return jsonify({"erro": "Senha deve ter no mínimo 6 caracteres."}), 400

    if db.usuarios.find_one({"email": email}):
        return jsonify({"erro": "E-mail já cadastrado."}), 409

    if db.usuarios.find_one({"username": username}):
        return jsonify({"erro": "Username já em uso."}), 409

    novo = {
        "id": str(uuid.uuid4()),
        "nome": nome,
        "email": email,
        "username": username,
        "senha_hash": hash_senha(senha),
        "role": role,
        "bio": "",
        "data_entrada": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "criado_em": datetime.now(timezone.utc).isoformat(),
    }
    db.usuarios.insert_one(novo)

    novo.pop('_id', None)

    token = gerar_token(novo["id"])
    return jsonify(
        {"mensagem": "Conta criada!", "token": token, "usuario": usuario_publico(novo)}
    ), 201


# POST /usuarios/login


@usuarios_bp.post("/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha", "")

    if not email or not senha:
        return jsonify({"erro": "E-mail e senha são obrigatórios."}), 400

    usuario = db.usuarios.find_one({"email": email})
    if not usuario or not verificar_senha(senha, usuario["senha_hash"]):
        return jsonify({"erro": "Credenciais inválidas."}), 401

    token = gerar_token(usuario["id"])
    usuario.pop('_id', None)
    return jsonify(
        {
            "token": token,
            "mensagem": "Login realizado."
        }
    )


# GET /usuarios/meu-perfil


@usuarios_bp.get("/meu-perfil")
@autenticar
def meu_perfil_get():
    usuario = db.usuarios.find_one({"id": request.usuario_id})
    if usuario:
        usuario.pop('_id', None)
    return jsonify({**usuario_publico(usuario), **stats_usuario(request.usuario_id)})


# PUT /usuarios/meu-perfil


@usuarios_bp.put("/meu-perfil")
@autenticar
def meu_perfil_put():
    dados = request.get_json(silent=True) or {}
    usuario = db.usuarios.find_one({"id": request.usuario_id})

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    campos_atualizacao = {}

    if "nome" in dados and dados["nome"].strip():
        campos_atualizacao["nome"] = dados["nome"].strip()

    if "bio" in dados:
        campos_atualizacao["bio"] = dados["bio"].strip()

    if "role" in dados and dados["role"].strip():
        campos_atualizacao["role"] = dados["role"].strip()

    if "username" in dados:
        novo_username = dados["username"].strip().lower()
        if novo_username != usuario["username"]:
            if db.usuarios.find_one({"username": novo_username, "id": {"$ne": request.usuario_id}}):
                return jsonify({"erro": "Username já em uso."}), 409
            campos_atualizacao["username"] = novo_username

    if "nova_senha" in dados:
        if not verificar_senha(dados.get("senha_atual", ""), usuario["senha_hash"]):
            return jsonify({"erro": "Senha atual incorreta."}), 401
        if len(dados["nova_senha"]) < 6:
            return jsonify({"erro": "Nova senha deve ter no mínimo 6 caracteres."}), 400
        campos_atualizacao["senha_hash"] = hash_senha(dados["nova_senha"])

    if campos_atualizacao:
        db.usuarios.update_one({"id": request.usuario_id}, {"$set": campos_atualizacao})
        usuario = db.usuarios.find_one({"id": request.usuario_id})

    usuario.pop('_id', None)
    return jsonify(
        {"mensagem": "Perfil atualizado.", "usuario": usuario_publico(usuario)}
    )


# DELETE /usuarios/meu-perfil


@usuarios_bp.delete("/meu-perfil")
@autenticar
def meu_perfil_delete():
    uid = request.usuario_id
    posts_do_usuario = db.postagens.find({"autor_id": uid}, {"id": 1})
    posts_ids = [p["id"] for p in posts_do_usuario]

    db.usuarios.delete_one({"id": uid})
    db.postagens.delete_many({"autor_id": uid})
    db.curtidas.delete_many({
        "$or": [
            {"usuario_id": uid},
            {"post_id": {"$in": posts_ids}}
        ]
    })
    db.comentarios.delete_many({
        "$or": [
            {"autor_id": uid},
            {"post_id": {"$in": posts_ids}}
        ]
    })
    db.seguidores.delete_many({
        "$or": [
            {"seguidor_id": uid},
            {"seguindo_id": uid}
        ]
    })
    db.notificacoes.delete_many({
        "$or": [
            {"destinatario_id": uid},
            {"remetente_id": uid}
        ]
    })
    
    return jsonify({"mensagem": "Conta excluída com sucesso."})


# GET /usuarios/fotos

@usuarios_bp.get("/fotos")
@autenticar
def listar_fotos():
    cursor_fotos = db.postagens.find({
        "autor_id": request.usuario_id, 
        "tem_foto": True
    })

    fotos = [
        {
            "id": p["id"],
            "url": f"/static/fotos/{p['id']}.jpg",
            "criado_em": p["criado_em"],
        }
        for p in cursor_fotos 
    ]
    
    return jsonify({"fotos": fotos})


# POST /usuarios/sair


@usuarios_bp.post("/sair")
@autenticar
def sair():
    # JWT é stateless. Em produção adicione o token a uma blocklist (Redis).
    return jsonify({"mensagem": "Logout realizado. Descarte o token no cliente."})


# POST /usuarios/<id_pessoa>/seguir


@usuarios_bp.post("/<id_pessoa>/seguir")
@autenticar
def seguir(id_pessoa):
    if id_pessoa == request.usuario_id:
        return jsonify({"erro": "Você não pode seguir a si mesmo."}), 400

    alvo = db.usuarios.find_one({"id": id_pessoa})
    if not alvo:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    vinculo = db.seguidores.find_one({"seguidor_id": request.usuario_id, "seguindo_id": id_pessoa})

    if vinculo:
        db.seguidores.delete_one({"_id": vinculo["_id"]})
        return jsonify(
            {
                "mensagem": f"Você deixou de seguir @{alvo['username']}.",
                "seguindo": False,
            }
        )

    db.seguidores.insert_one(
        {
            "id": str(uuid.uuid4()),
            "seguidor_id": request.usuario_id,
            "seguindo_id": id_pessoa,
            "criado_em": datetime.now(timezone.utc).isoformat(),
        }
    )
    criar_notificacao(id_pessoa, request.usuario_id, "seguiu")
    return jsonify(
        {"mensagem": f"Você começou a seguir @{alvo['username']}.", "seguindo": True}
    ), 201


# GET /usuarios/seguindo


@usuarios_bp.get("/seguindo")
@autenticar
def listar_seguindo():
    cursor_seguindo = db.seguidores.find({"seguidor_id": request.usuario_id})
    seguindo_ids = [s["seguindo_id"] for s in cursor_seguindo]
    if not seguindo_ids:
        return jsonify({"seguindo": []})
    cursor_usuarios = db.usuarios.find({"id": {"$in": seguindo_ids}})

    lista_seguindo = []
    for u in cursor_usuarios:
        lista_seguindo.append({
            "id": u["id"],
            "username": u["username"],
            "role": u.get("role"),
            "numero_foto": u.get("numero_foto"),
        })

    return jsonify({"seguindo": lista_seguindo})


# GET /usuarios/amigos


@usuarios_bp.get("/amigos")
@autenticar
def listar_amigos():
    cursor_seguindo = db.seguidores.find({"seguidor_id": request.usuario_id})
    seguindo_ids = [s["seguindo_id"] for s in cursor_seguindo]

    if not seguindo_ids:
        return jsonify({"amigos": []})

    cursor_amigos = db.seguidores.find({"seguidor_id": {"$in": seguindo_ids}, "seguindo_id": request.usuario_id})
    amigos_ids = [s["seguidor_id"] for s in cursor_amigos]

    if not amigos_ids:
        return jsonify({"amigos": []})

    cursor_usuarios = db.usuarios.find({"id": {"$in": amigos_ids}})
    lista_amigos = []
    for u in cursor_usuarios:
        lista_amigos.append({
            "id": u["id"],
            "username": u["username"],
            "role": u.get("role", "Aventureiro"),
            "numero_foto": u.get("numero_foto"),
        })

    return jsonify({"amigos": lista_amigos})


# GET /usuarios/<id_usuario>


@usuarios_bp.get("/<id_usuario>")
@autenticar
def obter_perfil_alvo(id_usuario):
    u = db.usuarios.find_one({"id": id_usuario})
    if not u:
        return jsonify({"erro": "Usuário não encontrado."}), 404
        
    stats = stats_usuario(id_usuario)
    
    vinculo = db.seguidores.find_one({"seguidor_id": request.usuario_id, "seguindo_id": id_usuario})
    seguindo_eu = vinculo is not None
    
    return jsonify({
        "id": u["id"],
        "nome": u["nome"],
        "username": u["username"],
        "role": u.get("role", "Aventureiro"),
        "bio": u.get("bio", ""),
        "numero_foto": u.get("numero_foto"),
        **stats,
        "seguindo_eu": seguindo_eu,
        "data_entrada": u.get("data_entrada")
    })
