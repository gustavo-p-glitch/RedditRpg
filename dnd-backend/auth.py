import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify
import database as db

JWT_SECRET = "segredo_dnd_troque_em_producao"
JWT_EXPIRACAO_DIAS = 7


def gerar_token(usuario_id: str) -> str:
    payload = {
        "id": usuario_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRACAO_DIAS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verificar_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verificar_senha(senha: str, hash_: str) -> bool:
    return bcrypt.checkpw(senha.encode(), hash_.encode())


# Decorator de autenticação


def autenticar(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"erro": "Token não fornecido."}), 401

        payload = verificar_token(auth.split(" ")[1])
        if not payload:
            return jsonify({"erro": "Token inválido ou expirado."}), 401

        usuario = next((u for u in db.usuarios if u["id"] == payload["id"]), None)
        if not usuario:
            return jsonify({"erro": "Usuário não encontrado."}), 401

        request.usuario_id = payload["id"]
        return f(*args, **kwargs)

    return wrapper
