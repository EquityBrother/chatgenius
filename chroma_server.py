import chromadb
from chromadb.config import Settings
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB with default settings
settings = Settings(
    persist_directory="chroma_db",
    allow_reset=True,
    anonymized_telemetry=False
)

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(
    path="chroma_db",
    settings=settings
)

# Create or get collection
try:
    collection = chroma_client.get_or_create_collection(name="chat_messages")
except Exception as e:
    print(f"Error creating collection: {e}")
    collection = None

@app.get("/api/heartbeat")
async def heartbeat():
    return {"status": "alive"}

@app.get("/api/collections")
async def list_collections():
    try:
        collections = chroma_client.list_collections()
        return {"collections": collections}
    except Exception as e:
        print(f"Error listing collections: {e}")
        return {"collections": []}

@app.post("/api/embeddings")
async def add_embeddings(data: dict):
    try:
        if not collection:
            raise HTTPException(status_code=500, detail="Collection not initialized")
        
        collection.add(
            documents=[data["content"]],
            metadatas=[data["metadata"]],
            ids=[data["id"]]
        )
        return {"status": "success"}
    except Exception as e:
        print(f"Error adding embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def search(query: str, n_results: int = 5):
    try:
        if not collection:
            raise HTTPException(status_code=500, detail="Collection not initialized")
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        return {"results": results}
    except Exception as e:
        print(f"Error searching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting ChromaDB server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)