from flask import Blueprint, request, jsonify
import database as db
from auth import autenticar

pesquisar_bp = Blueprint("pesquisar", __name__, url_prefix="/pesquisar")
notificacoes_bp = Blueprint("notificacoes", __name__, url_prefix="/notificacoes")


# GET /pesquisar?q=termo&tipo=usuarios|postagens|tudo


@pesquisar_bp.get("/")
@autenticar
def pesquisar():
    q = (request.args.get("q") or "").strip().lower()
    tipo = request.args.get("tipo", "tudo")
    pagina = int(request.args.get("pagina", 1))
    limite = int(request.args.get("limite", 10))
    offset = (pagina - 1) * limite

    if not q:
        return jsonify({"erro": "Parâmetro 'q' é obrigatório."}), 400

    resultado = {}

    if tipo in ("usuarios", "tudo"):
        encontrados = [
            u
            for u in db.usuarios
            if q in u["nome"].lower()
            or q in u["username"].lower()
            or q in (u.get("bio") or "").lower()
        ]
        resultado["usuarios"] = {
            "total": len(encontrados),
            "itens": [
                {
                    **{k: v for k, v in u.items() if k != "senha_hash"},
                    "seguidores": sum(
                        1 for s in db.seguidores if s["seguindo_id"] == u["id"]
                    ),
                    "seguindo_eu": any(
                        s
                        for s in db.seguidores
                        if s["seguidor_id"] == request.usuario_id
                        and s["seguindo_id"] == u["id"]
                    ),
                }
                for u in encontrados[offset : offset + limite]
            ],
        }

    if tipo in ("postagens", "tudo"):
        encontradas = sorted(
            [p for p in db.postagens if q in p["conteudo"].lower()],
            key=lambda p: p["criado_em"],
            reverse=True,
        )
        resultado["postagens"] = {
            "total": len(encontradas),
            "itens": [
                {
                    **p,
                    "autor": next(
                        (
                            {
                                "id": u["id"],
                                "nome": u["nome"],
                                "username": u["username"],
                                "role": u["role"],
                            }
                            for u in db.usuarios
                            if u["id"] == p["autor_id"]
                        ),
                        None,
                    ),
                    "likes": sum(1 for c in db.curtidas if c["post_id"] == p["id"]),
                    "comments": sum(
                        1 for c in db.comentarios if c["post_id"] == p["id"]
                    ),
                }
                for p in encontradas[offset : offset + limite]
            ],
        }

    if not resultado:
        return jsonify(
            {"erro": "Tipo inválido. Use: usuarios, postagens ou tudo."}
        ), 400

    return jsonify(
        {"termo": q, "pagina": pagina, "limite": limite, "resultado": resultado}
    )


# GET /notificacoes


@notificacoes_bp.get("/")
@autenticar
def listar_notificacoes():
    minhas = sorted(
        [n for n in db.notificacoes if n["destinatario_id"] == request.usuario_id],
        key=lambda n: n["criado_em"],
        reverse=True,
    )
    # Enriquece com dados do remetente
    enriquecidas = []
    for n in minhas:
        remetente = next((u for u in db.usuarios if u["id"] == n["remetente_id"]), None)
        enriquecidas.append(
            {
                **n,
                "remetente": {
                    "id": remetente["id"],
                    "username": remetente["username"],
                    "nome": remetente["nome"],
                }
                if remetente
                else None,
            }
        )
    return jsonify(
        {
            "notificacoes": enriquecidas,
            "nao_lidas": sum(1 for n in minhas if not n["lida"]),
        }
    )


# PATCH /notificacoes/marcar-lidas


@notificacoes_bp.patch("/marcar-lidas")
@autenticar
def marcar_lidas():
    for n in db.notificacoes:
        if n["destinatario_id"] == request.usuario_id:
            n["lida"] = True
    return jsonify({"mensagem": "Notificações marcadas como lidas."})
