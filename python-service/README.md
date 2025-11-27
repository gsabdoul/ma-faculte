# Docling PDF Processing Service

Service Python FastAPI pour convertir les PDFs en chunks structurés avec Docling.

## Installation locale

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Lancer le service

```bash
uvicorn main:app --reload --port 8000
```

## Test

```bash
curl -X POST "http://localhost:8000/convert-pdf" \
  -F "file=@test.pdf"
```

## Déploiement sur Railway

1. Créer un compte sur [Railway.app](https://railway.app)
2. Connecter votre repo GitHub
3. Sélectionner le dossier `python-service`
4. Railway détectera automatiquement le Dockerfile
5. Déployer !

## Déploiement sur Render

1. Créer un compte sur [Render.com](https://render.com)
2. New → Web Service
3. Connecter votre repo
4. Root Directory: `python-service`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## API Endpoints

### POST /convert-pdf
Convertit un PDF en chunks structurés.

**Request:**
- Multipart form data avec le fichier PDF

**Response:**
```json
{
  "chunks": [
    {
      "content": "...",
      "metadata": {
        "page": 1,
        "section": "Introduction",
        "heading_level": 1,
        "chunk_type": "section"
      }
    }
  ],
  "total_pages": 10,
  "title": "Cours de Thermodynamique"
}
```

### GET /health
Health check endpoint.
