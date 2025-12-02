from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from docling.document_converter import DocumentConverter
from pydantic import BaseModel
import tempfile
import os
import os
from typing import List, Dict
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

load_dotenv()

# Initialisation de Supabase
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY: {SUPABASE_KEY[:5]}...") # Print only first 5 chars for security
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialisation du modèle d'embeddings
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

app = FastAPI(title="Docling PDF Processor")

# CORS pour permettre les requêtes depuis Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChunkMetadata(BaseModel):
    page: int
    section: str
    heading_level: int
    chunk_type: str  # paragraph, table, formula, list

class DocumentChunk(BaseModel):
    content: str
    metadata: ChunkMetadata
    embedding: List[float] = []
    source_id: str = None

class ProcessedDocument(BaseModel):
    chunks: List[DocumentChunk]
    total_pages: int
    title: str

@app.post("/convert-pdf", response_model=ProcessedDocument)
async def convert_pdf(file: UploadFile):
    """
    Convertit un PDF en chunks structurés avec métadonnées.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Sauvegarder temporairement le fichier
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Convertir avec Docling
        converter = DocumentConverter()
        result = converter.convert(tmp_path)
        
        # Extraire le markdown et les métadonnées
        markdown_text = result.document.export_to_markdown()
        
        # Chunking intelligent basé sur la structure
        chunks = smart_chunk_document(result.document)
        
        # Nettoyer le fichier temporaire
        os.unlink(tmp_path)
        
        return ProcessedDocument(
            chunks=chunks,
            total_pages=result.document.pages if hasattr(result.document, 'pages') else 0,
            title=extract_title(result.document)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

def smart_chunk_document(document, source_id: str = None) -> List[DocumentChunk]:
    """
    Découpe intelligemment le document en chunks basés sur la structure.
    Garde les sections ensemble, préserve les tableaux, etc.
    """
    chunks = []
    current_section = ""
    current_content = []
    current_page = 1
    heading_level = 0
    
    # Parcourir les éléments du document
    for element in document.iterate_items():
        element_type = element.self_ref.split('#')[0] if hasattr(element, 'self_ref') else 'paragraph'
        
        # Détecter les changements de section
        if element_type == 'heading':
            # Sauvegarder le chunk précédent si non vide
            if current_content:
                chunks.append(DocumentChunk(
                    content="\n".join(current_content),
                    metadata=ChunkMetadata(
                        page=current_page,
                        section=current_section,
                        heading_level=heading_level,
                        chunk_type="section"
                    )
                ))
                current_content = []
            
            # Nouvelle section
            current_section = element.text if hasattr(element, 'text') else ""
            heading_level = element.level if hasattr(element, 'level') else 1
        
        # Ajouter le contenu
        if hasattr(element, 'text') and element.text:
            current_content.append(element.text)
        
        # Mettre à jour le numéro de page
        if hasattr(element, 'prov') and hasattr(element.prov[0], 'page'):
            current_page = element.prov[0].page
        
        # Limiter la taille des chunks (max 1000 tokens ≈ 750 mots)
        if len(" ".join(current_content).split()) > 750:
            chunks.append(DocumentChunk(
                content="\n".join(current_content),
                metadata=ChunkMetadata(
                    page=current_page,
                    section=current_section,
                    heading_level=heading_level,
                    chunk_type="section"
                )
            ))
            current_content = []
    
    # Ajouter le dernier chunk
    if current_content:
        chunks.append(DocumentChunk(
            content="\n".join(current_content),
            metadata=ChunkMetadata(
                page=current_page,
                section=current_section,
                heading_level=heading_level,
                chunk_type="section"
            )
        ))
    
    return chunks

def extract_title(document) -> str:
    """Extrait le titre du document."""
    # Chercher le premier heading de niveau 1
    for element in document.iterate_items():
        if hasattr(element, 'self_ref') and 'heading' in element.self_ref:
            if hasattr(element, 'level') and element.level == 1:
                return element.text if hasattr(element, 'text') else "Untitled"
    
    return "Untitled Document"

class MarkdownProcessRequest(BaseModel):
    content: str
    source_id: str

@app.post("/process-markdown")
async def process_markdown(request: MarkdownProcessRequest):
    """
    Traite le contenu Markdown, génère des embeddings et les stocke dans Supabase.
    """
    try:
        # Simple chunking pour le Markdown (peut être amélioré)
        chunks_content = [chunk.strip() for chunk in request.content.split("\n\n") if chunk.strip()]
        
        processed_chunks = []
        for i, chunk_content in enumerate(chunks_content):
            # Générer l'embedding
            embedding = embedding_model.encode(chunk_content).tolist()
            
            # Créer le DocumentChunk
            doc_chunk = DocumentChunk(
                content=chunk_content,
                metadata=ChunkMetadata(
                    page=0,  # Pas de page pour le Markdown simple
                    section=f"chunk_{i}",
                    heading_level=0,
                    chunk_type="markdown_paragraph"
                ),
                embedding=embedding,
                source_id=request.source_id
            )
            processed_chunks.append(doc_chunk)
            
            # Stocker dans Supabase
            response = supabase.table('document_chunks').insert({
                "content": doc_chunk.content,
                "metadata": doc_chunk.metadata.dict(),
                "embedding": doc_chunk.embedding,
                "source_id": doc_chunk.source_id
            }).execute()
            
            if response.data is None:
                raise Exception(f"Erreur lors de l'insertion dans Supabase: {response.error}")

        return {"message": "Markdown processed and embeddings stored successfully", "chunks_count": len(processed_chunks)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Markdown: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "docling-processor"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
