Requisitos

- Python 3.10+
- Docker

Instalação

bash
1. Sobe o banco de dados
docker run -d -p 27017:27017 --name mongo mongo:7

2. Cria e ativa o ambiente virtual
python -m venv venv
source venv/bin/activate 

3. Instala as dependências
pip install -r requirements.txt

4. Roda a API
python app.py

A API sobe em `http://localhost:5000`
