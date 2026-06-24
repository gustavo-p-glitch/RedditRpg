from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid

import database as db
from auth import autenticar, gerar_token, hash_senha, verificar_senha

usuarios_bp = Blueprint("usuarios", __name__, url_prefix="/usuarios")


# Helpers


def usuario_publico(u: dict) -> dict:
    """Remove a senha e retorna apenas dados públicos."""
    return {k: v for k, v in u.items() if k != "senha_hash"}


def stats_usuario(uid: str) -> dict:
    return {
        "total_postagens": sum(1 for p in db.postagens if p["autor_id"] == uid),
        "seguidores": sum(1 for s in db.seguidores if s["seguindo_id"] == uid),
        "seguindo": sum(1 for s in db.seguidores if s["seguidor_id"] == uid),
    }


def criar_notificacao(
    destinatario_id: str, remetente_id: str, tipo: str, post_id: str = None
):
    """Cria uma notificação se o destinatário não for o próprio usuário."""
    if destinatario_id == remetente_id:
        return
    db.notificacoes.append(
        {
            "id": str(uuid.uuid4()),
            "destinatario_id": destinatario_id,
            "remetente_id": remetente_id,
            "tipo": tipo,  # "curtiu" | "comentou" | "seguiu"
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

    usuario = next((u for u in db.usuarios if u["email"] == email), None)
    if not usuario or not verificar_senha(senha, usuario["senha_hash"]):
        return jsonify({"erro": "Credenciais inválidas."}), 401

    token = gerar_token(usuario["id"])
    return jsonify(
        {
            "token": token,
            "usuario": {**usuario_publico(usuario), **stats_usuario(usuario["id"])},
        }
    )


# GET /usuarios/meu-perfil


@usuarios_bp.get("/meu-perfil")
@autenticar
def meu_perfil_get():
    usuario = next((u for u in db.usuarios if u["id"] == request.usuario_id), None)
    return jsonify({**usuario_publico(usuario), **stats_usuario(request.usuario_id)})


# PUT /usuarios/meu-perfil


@usuarios_bp.put("/meu-perfil")
@autenticar
def meu_perfil_put():
    dados = request.get_json(silent=True) or {}
    usuario = next((u for u in db.usuarios if u["id"] == request.usuario_id), None)

    if "nome" in dados and dados["nome"].strip():
        usuario["nome"] = dados["nome"].strip()

    if "bio" in dados:
        usuario["bio"] = dados["bio"].strip()

    if "role" in dados and dados["role"].strip():
        usuario["role"] = dados["role"].strip()

    if "username" in dados:
        novo_username = dados["username"].strip().lower()
        if novo_username != usuario["username"]:
            if any(
                u["username"] == novo_username and u["id"] != request.usuario_id
                for u in db.usuarios
            ):
                return jsonify({"erro": "Username já em uso."}), 409
            usuario["username"] = novo_username

    if "nova_senha" in dados:
        if not verificar_senha(dados.get("senha_atual", ""), usuario["senha_hash"]):
            return jsonify({"erro": "Senha atual incorreta."}), 401
        if len(dados["nova_senha"]) < 6:
            return jsonify({"erro": "Nova senha deve ter no mínimo 6 caracteres."}), 400
        usuario["senha_hash"] = hash_senha(dados["nova_senha"])

    return jsonify(
        {"mensagem": "Perfil atualizado.", "usuario": usuario_publico(usuario)}
    )


# DELETE /usuarios/meu-perfil


@usuarios_bp.delete("/meu-perfil")
@autenticar
def meu_perfil_delete():
    uid = request.usuario_id
    db.usuarios[:] = [u for u in db.usuarios if u["id"] != uid]

    posts_ids = {p["id"] for p in db.postagens if p["autor_id"] == uid}
    db.postagens[:] = [p for p in db.postagens if p["autor_id"] != uid]
    db.curtidas[:] = [
        c
        for c in db.curtidas
        if c["usuario_id"] != uid and c["post_id"] not in posts_ids
    ]
    db.comentarios[:] = [
        c
        for c in db.comentarios
        if c["autor_id"] != uid and c["post_id"] not in posts_ids
    ]
    db.seguidores[:] = [
        s for s in db.seguidores if s["seguidor_id"] != uid and s["seguindo_id"] != uid
    ]
    db.notificacoes[:] = [
        n
        for n in db.notificacoes
        if n["destinatario_id"] != uid and n["remetente_id"] != uid
    ]

    return jsonify({"mensagem": "Conta excluída com sucesso."})


# GET /usuarios/fotos
# usar S3 ou outro storage


@usuarios_bp.get("/fotos")
@autenticar
def listar_fotos():
    fotos = [
        {
            "id": p["id"],
            "url": f"/static/fotos/{p['id']}.jpg",
            "criado_em": p["criado_em"],
        }
        for p in db.postagens
        if p["autor_id"] == request.usuario_id and p.get("tem_foto")
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

    alvo = next((u for u in db.usuarios if u["id"] == id_pessoa), None)
    if not alvo:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    vinculo = next(
        (
            s
            for s in db.seguidores
            if s["seguidor_id"] == request.usuario_id and s["seguindo_id"] == id_pessoa
        ),
        None,
    )

    if vinculo:
        db.seguidores.remove(vinculo)
        return jsonify(
            {
                "mensagem": f"Você deixou de seguir @{alvo['username']}.",
                "seguindo": False,
            }
        )

    db.seguidores.append(
        {
            "id": str(uuid.uuid4()),
            "seguidor_id": request.usuario_id,
            "seguindo_id": id_pessoa,
            "criado_em": datetime.now(timezone.utc).isoformat(),
        }
    )
    criar_notificacao(id_pessoa, request.usuario_id, "seguiu")
    return jsonify(
        {"mensagem": f"Agora você segue @{alvo['username']}.", "seguindo": True}
    ), 201
