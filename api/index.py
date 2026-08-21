from fastapi import FastAPI

app = FastAPI()

@app.get("/api")
@app.get("/api/")
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
def test(path: str = ""):
    return {"status": "ok", "path": path}
