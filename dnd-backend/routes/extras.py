from flask import Blueprint, request, jsonify
import database as db
from auth import autenticar
import re

pesquisar_bp = Blueprint("pesquisar", __name__, url_prefix="/pesquisar")
notificacoes_bp = Blueprint("notificacoes", __name__, url_prefix="/notificacoes")


# GET /pesquisar?q=termo&tipo=usuarios|postagens|tudo
@pesquisar_bp.get("/")
@autenticar
def pesquisar():
    q = (request.args.get("q") or "").strip()
    tipo = request.args.get("tipo", "tudo")
    pagina = int(request.args.get("pagina", 1))
    limite = int(request.args.get("limite", 10))
    offset = (pagina - 1) * limite

    if not q:
        return jsonify({"erro": "Parâmetro 'q' é obrigatório."}), 400

    resultado = {}
    regex_query = {"$regex": re.escape(q), "$options": "i"}

    if tipo in ("usuarios", "tudo"):
        filtro_usuarios = {
            "$or": [
                {"nome": regex_query},
                {"username": regex_query},
                {"bio": regex_query}
            ]
        }
        
        total_usuarios = db.usuarios.count_documents(filtro_usuarios)
        cursor_usuarios = db.usuarios.find(filtro_usuarios).skip(offset).limit(limite)
        
        itens_usuarios = []
        for u in cursor_usuarios:
            u.pop('_id', None)
            u.pop('senha_hash', None)
            
            u["seguidores"] = db.seguidores.count_documents({"seguindo_id": u["id"]})
            u["seguindo_eu"] = db.seguidores.find_one({
                "seguidor_id": request.usuario_id, 
                "seguindo_id": u["id"]
            }) is not None
            
            itens_usuarios.append(u)

        resultado["usuarios"] = {
            "total": total_usuarios,
            "itens": itens_usuarios,
        }

    if tipo in ("postagens", "tudo"):
        filtro_postagens = {"conteudo": regex_query}
        
        total_postagens = db.postagens.count_documents(filtro_postagens)
        cursor_postagens = (
            db.postagens.find(filtro_postagens)
            .sort("criado_em", -1)
            .skip(offset)
            .limit(limite)
        )
        
        itens_postagens = []
        for p in cursor_postagens:
            p.pop('_id', None)
            
            autor = db.usuarios.find_one({"id": p["autor_id"]})
            if autor:
                p["autor"] = {
                    "id": autor["id"],
                    "nome": autor["nome"],
                    "username": autor["username"],
                    "role": autor.get("role", "")
                }
            else:
                p["autor"] = None
                
            p["likes"] = db.curtidas.count_documents({"post_id": p["id"]})
            p["comments"] = db.comentarios.count_documents({"post_id": p["id"]})
            
            itens_postagens.append(p)

        resultado["postagens"] = {
            "total": total_postagens,
            "itens": itens_postagens,
        }

    if not resultado:
        return jsonify(
            {"erro": "Tipo inválido. Use: usuarios, postagens ou tudo."}
        ), 400

    return jsonify(
        {"termo": q, "pagina": pagina, "limite": limite, "resultado": resultado}
    )


@notificacoes_bp.get("/")
@autenticar
def listar_notificacoes():
    cursor_notificacoes = (
        db.notificacoes.find({"destinatario_id": request.usuario_id})
        .sort("criado_em", -1)
    )
    
    nao_lidas = db.notificacoes.count_documents({
        "destinatario_id": request.usuario_id, 
        "lida": False
    })

    enriquecidas = []
    for n in cursor_notificacoes:
        n.pop('_id', None)
        remetente = db.usuarios.find_one({"id": n["remetente_id"]})
        
        if remetente:
            seguindo_eu = db.seguidores.find_one({
                "seguidor_id": request.usuario_id,
                "seguindo_id": remetente["id"]
            }) is not None
            
            n["remetente"] = {
                "id": remetente["id"],
                "username": remetente["username"],
                "nome": remetente["nome"],
                "seguindo_eu": seguindo_eu,
            }
        else:
            n["remetente"] = None
        
        enriquecidas.append(n)

    return jsonify({
        "notificacoes": enriquecidas,
        "nao_lidas": nao_lidas,
    })


# PATCH /notificacoes/marcar-lidas
@notificacoes_bp.patch("/marcar-lidas")
@autenticar
def marcar_lidas():
    db.notificacoes.update_many(
        {"destinatario_id": request.usuario_id},
        {"$set": {"lida": True}}
    )
    
    return jsonify({"mensagem": "Notificações marcadas como lidas."})


def obter_ids_amigos(usuario_id):
    cursor_seguindo = db.seguidores.find({"seguidor_id": usuario_id})
    seguindo_ids = [s["seguindo_id"] for s in cursor_seguindo]

    if not seguindo_ids:
        return []

    cursor_amigos = db.seguidores.find({"seguidor_id": {"$in": seguindo_ids}, "seguindo_id": usuario_id})
    return [s["seguidor_id"] for s in cursor_amigos]
