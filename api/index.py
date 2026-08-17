from fastapi import FastAPI

app = FastAPI()

@app.get("/api")
@app.get("/api/")
def root():
    return {"message": "Hello from Vercel Python Serverless!"}
