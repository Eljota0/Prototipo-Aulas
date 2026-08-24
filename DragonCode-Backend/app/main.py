from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, aulas, usuarios, progreso

# Crear tablas automáticamente al iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DragonCode API",
    description="API for the DragonCode educational platform",
    version="1.0.0"
)

# CORS config - En producción cambiar allow_origins por el dominio de Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,      prefix="/api/auth",     tags=["Autenticación"])
app.include_router(usuarios.router,  prefix="/api/usuarios", tags=["Usuarios & Tienda"])
app.include_router(aulas.router,     prefix="/api/aulas",    tags=["Aulas Virtuales"])
app.include_router(progreso.router,  prefix="/api/progreso", tags=["Progreso del Juego"])

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to DragonCode API 🐉", "version": "1.0.0"}
