import os

# Cargar .env manualmente si existe para garantizar portabilidad total sin depender de pydantic[dotenv]
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())
    except Exception:
        pass

class Settings:
    def __init__(self):
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        self.GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.GEMINI_TIMEOUT = int(os.getenv("GEMINI_TIMEOUT", "10"))
        self.GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "2"))
        self.CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "60"))
        self.AI_AGENT_ADDRESS = os.getenv("AI_AGENT_ADDRESS", "0x4039157EbC9143Def677Ac95cb3111eEaCd68dED")
        self.AI_AGENT_PRIVATE_KEY = os.getenv("AI_AGENT_PRIVATE_KEY", "80e21d9c9f0034cf8d0ccc2b23cbbf181bec12eb45c5e3cdaef488e50eebdd9f")
        self.VAULT_CONTRACT_ADDRESS = os.getenv("VAULT_CONTRACT_ADDRESS", "0x8A731D082A895D940a02128a3A8174e92410aEc1")
        self.CHAIN_ID = int(os.getenv("CHAIN_ID", "421614"))

settings = Settings()
