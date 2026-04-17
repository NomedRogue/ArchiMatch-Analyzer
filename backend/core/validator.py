import re
from datetime import datetime

class DateValidator:
    """Tarih doğrulama ve format analizi sınıfı."""
    
    @staticmethod
    def is_valid(deger):
        if deger is None or str(deger).strip() == "":
            return True, "", ""
        if isinstance(deger, datetime):
            return True, "", ""
        if isinstance(deger, float):
            if 1 < deger < 200000:
                return True, "", ""
            return False, "Tanınmayan Değer", "Sayısal formatta ama tarih değil"

        metin = str(deger).strip()
        if metin == "":
            return True, "", ""

        if re.search(r'[.,\-/]{2,}', metin):
            return False, "Çift Ayırıcı", "Yan yana ayırıcı karakterler var"
        if metin[0] in '.,/-' or metin[-1] in '.,/-':
            return False, "Hatalı Ayırıcı", "Başta veya sonda ayırıcı karakter var"
        if "," in metin:
            return False, "Virgül Kullanımı", "Nokta yerine virgül kullanılmış"
        if "-" in metin and not metin.startswith("-"):
            return False, "Tire Kullanımı", "Nokta yerine tire kullanılmış"
        if "/" in metin:
            return False, "Slash Kullanımı", "Nokta yerine slash kullanılmış"

        if "." in metin:
            parcalar = metin.split(".")
            if len(parcalar) != 3:
                return False, "Hatalı Format", "Tarihte 3 parça olmalı (GG.AA.YYYY)"
            gun, ay, yil = parcalar
            if gun == "" or ay == "" or yil == "":
                return False, "Eksik Parça", "Tarihin gün, ay veya yıl parçası eksik"
            if len(gun) != 2 or len(ay) != 2 or len(yil) != 4:
                return False, "Eksik Hane", "Tam olarak GG.AA.YYYY formatında olmalı"
            try:
                g, a, y = int(gun), int(ay), int(yil)
            except ValueError:
                return False, "Geçersiz Karakter", "Sayısal olmayan karakterler bulunuyor"
            if g == 0 or a == 0 or y == 0:
                return False, "Sıfır Değer", "Gün, Ay veya Yıl sıfır olamaz"
            try:
                datetime(y, a, g)
            except ValueError:
                return False, "İmkansız Tarih", "Takvimde böyle bir gün yok"
            return True, "", ""

        if metin.isdigit():
            if len(metin) == 8:
                return False, "Ayırıcı Eksik", "Nokta karakteri unutulmuş"
            try:
                sayi = int(metin)
                if 1 < sayi < 200000:
                    return True, "", ""
            except ValueError:
                pass

        return False, "Tanınmayan Format", "Geçersiz veya belirsiz tarih girişi"
