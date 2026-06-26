from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
import os

mongo_url = os.environ.get("MONGO_URI")
db_name = os.environ.get("DB_NAME") 

_client = MongoClient(mongo_url)
_db = _client[db_name]

usuarios:     Collection = _db["usuarios"]
postagens:    Collection = _db["postagens"]
curtidas:     Collection = _db["curtidas"]
comentarios:  Collection = _db["comentarios"]
seguidores:   Collection = _db["seguidores"]
notificacoes: Collection = _db["notificacoes"]


def criar_indices():
    usuarios.create_index("email",    unique=True)
    usuarios.create_index("username", unique=True)
    postagens.create_index([("autor_id", ASCENDING)])
    postagens.create_index([("criado_em", DESCENDING)])
    curtidas.create_index([("post_id", ASCENDING), ("usuario_id", ASCENDING)], unique=True)
    seguidores.create_index([("seguidor_id", ASCENDING), ("seguindo_id", ASCENDING)], unique=True)
    notificacoes.create_index([("destinatario_id", ASCENDING)])
