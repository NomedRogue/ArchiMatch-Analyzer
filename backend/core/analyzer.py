from difflib import SequenceMatcher

BENZERLIK_ESIGI = 0.90
TURKCE_MAP = str.maketrans("ÇĞİÖŞÜçğıöşü", "CGIOSUcgiosu")

class NameAnalyzer:
    """Hasta isimleri arası string benzerlik ve yazım hatası bulma sınıfı."""
    
    @staticmethod
    def _turkce_normalize(metin):
        return metin.translate(TURKCE_MAP)

    @staticmethod
    def compare_names(isim1, isim2):
        i1 = isim1.strip().upper()
        i2 = isim2.strip().upper()

        if i1 == i2:
            return 1.0, False, "Aynı isim"

        normal_oran = SequenceMatcher(None, i1, i2).ratio()
        
        n1 = NameAnalyzer._turkce_normalize(i1)
        n2 = NameAnalyzer._turkce_normalize(i2)
        normalize_oran = SequenceMatcher(None, n1, n2).ratio()

        oran = max(normal_oran, normalize_oran)

        if oran >= BENZERLIK_ESIGI:
            farklar = []
            if n1 == n2 and i1 != i2:
                farklar.append("Türkçe karakter farkı")
            elif normal_oran < normalize_oran:
                farklar.append("Türkçe karakter farkı")

            if abs(len(i1) - len(i2)) <= 2 and abs(len(i1) - len(i2)) > 0:
                farklar.append("Harf eksikliği/fazlalığı")

            if not farklar:
                farklar.append("Küçük yazım farkı")

            detay = ", ".join(farklar)
            return oran, True, detay
        else:
            return oran, False, "Tamamen Farklı İsimler"

class FileNumberAnalyzer:
    """Dosya no formatları üzerinden benzerlik gruplayıcısı."""
    
    @staticmethod
    def check_file_numbers(veriler):
        hatalar = []
        numara_isim = {}

        for excel_satir, form_sirasi, dosya_no, isim in veriler:
            if dosya_no is None or str(dosya_no).strip() in ("", "0"):
                continue
            if isim is None or str(isim).strip() == "":
                continue

            dosya_no_str = str(dosya_no).strip()
            isim_str = str(isim).strip().upper()

            if dosya_no_str in numara_isim:
                k_isim, k_satir, k_sira = numara_isim[dosya_no_str]
                if k_isim != isim_str:
                    oran, yazim_hatasi, detay = NameAnalyzer.compare_names(k_isim, isim_str)
                    hatalar.append({
                        "dosya_no": dosya_no_str,
                        "hasta_1": k_isim,
                        "hasta_1_excel_satir": k_satir,
                        "hasta_1_form_sirasi": k_sira,
                        "hasta_2": isim_str,
                        "hasta_2_excel_satir": excel_satir,
                        "hasta_2_form_sirasi": form_sirasi,
                        "benzerlik_yuzde": int(oran * 100),
                        "yazim_hatasi": yazim_hatasi,
                        "hata_nedeni": detay,
                    })
            else:
                numara_isim[dosya_no_str] = (isim_str, excel_satir, form_sirasi)

        return hatalar
