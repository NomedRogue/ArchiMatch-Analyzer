import sys
import os
import threading
import time
import requests
import uvicorn
import webbrowser

# PyInstaller --windowed modundayken print() fonksiyonu programın direkt çökmesine neden olur!
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

def run_server():
    from backend.api.server import app
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="critical")

if __name__ == "__main__":
    print("Sistem Başlatılıyor, Lütfen Bekleyin...")
    
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()

    server_ready = False
    for _ in range(50):
        try:
            r = requests.get("http://127.0.0.1:8000/api/health")
            if r.status_code == 200:
                server_ready = True
                break
        except requests.ConnectionError:
            pass
        time.sleep(0.1)
    
    if server_ready:
        print("ArchiMatch Analyzer hazır! Arayüz açılıyor...")
        webbrowser.open("http://127.0.0.1:8000/")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Uygulama kapatılıyor...")
    else:
        print("Kritik Hata: Python Zekası (API) başlatılamadı!")
        input("Çıkmak için Enter'a basın...")
        sys.exit(1)
