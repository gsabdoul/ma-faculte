from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from docling.document_converter import DocumentConverter
from pydantic import BaseModel
import tempfile
import os
from typing import List, Dict

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

def smart_chunk_document(document) -> List[DocumentChunk]:
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

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "docling-processor"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
