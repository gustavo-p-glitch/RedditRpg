from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection

MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "dnd_forum"

_client = MongoClient(MONGO_URI)
_db     = _client[DB_NAME]

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
