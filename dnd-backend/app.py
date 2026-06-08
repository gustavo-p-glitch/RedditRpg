from flask import Flask, jsonify
from flask_cors import CORS

from routes.usuarios import usuarios_bp
from routes.postagens import postagens_bp
from routes.extras import pesquisar_bp, notificacoes_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # dps temo q restringir a origem

# Blueprints
app.register_blueprint(usuarios_bp)
app.register_blueprint(postagens_bp)
app.register_blueprint(pesquisar_bp)
app.register_blueprint(notificacoes_bp)


# Health check
@app.get("/")
def health():
    return jsonify({"status": "ok", "servico": "DnD Social API", "versao": "1.0.0"})


# Erros globais
@app.errorhandler(404)
def nao_encontrado(e):
    return jsonify({"erro": "Rota não encontrada."}), 404


@app.errorhandler(405)
def metodo_nao_permitido(e):
    return jsonify({"erro": "Método não permitido."}), 405


@app.errorhandler(500)
def erro_interno(e):
    return jsonify({"erro": "Erro interno do servidor.", "detalhe": str(e)}), 500


if __name__ == "__main__":
    print("DnD API rodando em http://localhost:5000")
    app.run(debug=True, port=5000)
