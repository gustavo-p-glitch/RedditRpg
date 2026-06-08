# Banco de dados em memória
# Em produção, substitua por SQLite / PostgreSQL / MongoDB

usuarios    = []   # { id, nome, email, username, senha_hash, role, bio, data_entrada }
postagens   = []   # { id, autor_id, conteudo, tags, criado_em }
curtidas    = []   # { id, post_id, usuario_id }
comentarios = []   # { id, post_id, autor_id, texto, criado_em }
seguidores  = []   # { id, seguidor_id, seguindo_id }
notificacoes = []  # { id, destinatario_id, remetente_id, tipo, post_id, lida, criado_em }
