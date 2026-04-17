import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Download, RefreshCw, XCircle, Printer, Power, Moon, Sun } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Sayfa yüklendiğinde var olan temaya uygun kök sınıfı
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Yazdırırken Dark Mode'un tamamen devre dışı bırakılıp beyaz çıktı alınmasını garantiye alır
    const handleBeforePrint = () => document.documentElement.classList.remove('dark');
    const handleAfterPrint = () => {
      if (theme === 'dark') document.documentElement.classList.add('dark');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const shutdownApp = async () => {
    try {
      await axios.post(`${API_BASE}/shutdown`);
    } catch (e) {
      // API fail is okay as it just exited
    }
    window.close();
  };

  const renderNameWithSpaces = (name) => {
    const parts = [];
    let i = 0;
    while (i < name.length) {
      if (name[i] === ' ') {
        let count = 0;
        while (i < name.length && name[i] === ' ') { count++; i++; }
        if (count > 1) {
          parts.push(<span key={`sp-${i}`} className="bg-orange-400 text-white font-bold px-0.5 rounded-sm mx-px tracking-widest">{'·'.repeat(count)}</span>);
        } else {
          parts.push(<span key={`sp-${i}`}>{' '}</span>);
        }
      } else {
        let word = '';
        const start = i;
        while (i < name.length && name[i] !== ' ') { word += name[i]; i++; }
        parts.push(<span key={`w-${start}`}>{word}</span>);
      }
    }
    return <span className="font-mono">{parts}</span>;
  };

  const highlightBadDatePart = (value, errorType) => {
    if (!value) return null;
    
    // Eksik Hane Özel Kontrolü (Hangi hanenin eksik olduğunu seçerek boyama)
    if (errorType === "Eksik Hane") {
      const partsArr = value.split(".");
      return (
        <span className="font-mono text-sm tracking-wide">
          {partsArr.map((p, i) => {
            let isBad = false;
            // Gün=0, Ay=1 (uzunluk 2 beklenir), Yıl=2 (uzunluk 4 beklenir)
            if (i < 2 && p.length !== 2) isBad = true;
            if (i === 2 && p.length !== 4) isBad = true;
            
            const element = isBad ? <span key={`bad-${i}`} className="text-white bg-rose-500 font-bold px-0.5 rounded-sm mx-0.5">{p}</span> : <span key={`ok-${i}`} className="text-slate-800 dark:text-slate-200">{p}</span>;
            
            return (
              <React.Fragment key={i}>
                {element}
                {i < partsArr.length - 1 && <span className="text-slate-800 dark:text-slate-200">.</span>}
              </React.Fragment>
            );
          })}
        </span>
      );
    }

    let parts = [value];
    let highlightPattern = null;

    if (errorType === "Virgül Kullanımı") highlightPattern = ',';
    else if (errorType === "Çift Ayırıcı") highlightPattern = /([.,\-/]{2,})/;
    else if (errorType === "Hatalı Ayırıcı") highlightPattern = /^([.,\-/])|([.,\-/])$/g;
    else if (errorType === "Tire Kullanımı") highlightPattern = '-';
    else if (errorType === "Slash Kullanımı") highlightPattern = '/';
    else if (errorType === "Geçersiz Karakter") highlightPattern = /([^0-9.])/; // Rakam veya nokta harici olanlar

    const unhandledErrors = ["Hatalı Format", "Eksik Parça", "Sıfır Değer", "İmkansız Tarih", "Ayırıcı Eksik", "Tanınmayan Format", "Tanınmayan Değer"];
    if (unhandledErrors.includes(errorType)) {
      return (
        <span className="font-mono text-sm tracking-wide text-white bg-rose-500 font-bold px-1 rounded-sm mx-0.5">
          {value}
        </span>
      );
    }

    if (highlightPattern) {
      if (highlightPattern instanceof RegExp) {
        parts = value.split(highlightPattern).filter(Boolean);
      } else {
        parts = value.split(highlightPattern).reduce((arr, piece, i) => {
          if (i > 0) arr.push(highlightPattern);
          arr.push(piece);
          return arr;
        }, []);
      }
    } else {
      return <span className="font-mono text-sm tracking-wide text-slate-800 dark:text-slate-200">{value}</span>;
    }

    return (
      <span className="font-mono text-sm tracking-wide">
        {parts.map((p, i) => {
          let isBad = false;
          if (highlightPattern instanceof RegExp) {
             if (errorType === "Geçersiz Karakter") {
                 if (/[^0-9.]/.test(p)) isBad = true;
             } else if (/^[.,\-/]+$/.test(p)) {
                 isBad = true;
             }
          } else {
             if (p === highlightPattern) isBad = true;
          }
          return isBad ? <span key={i} className="text-white bg-rose-500 font-bold px-0.5 rounded-sm mx-0.5">{p}</span> : <span key={i} className="text-slate-800 dark:text-slate-200">{p}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="min-h-screen print:min-h-0 print:block bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white flex flex-col items-center justify-center p-6 print:p-0 antialiased transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 print:hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 dark:bg-blue-900/10 blur-[120px] transition-colors duration-300"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-100/50 dark:bg-teal-900/10 blur-[120px] transition-colors duration-300"></div>
      </div>

      {/* Floating Buttons: Shutdown & Theme Toggle */}
      <div className="fixed top-4 right-4 z-50 flex space-x-3 print:hidden">
        <button 
          onClick={toggleTheme} 
          title={theme === 'light' ? 'Karanlık Mod' : 'Aydınlık Mod'}
          className="flex items-center justify-center p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 rounded-lg shadow-sm transition-all"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-slate-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
        <button onClick={shutdownApp} title="Sistemi Kapat" className="flex items-center justify-center p-2.5 bg-rose-100/80 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg shadow-sm transition-colors">
          <Power className="w-5 h-5" />
        </button>
      </div>

      <div className="z-10 w-full max-w-5xl print:max-w-none print:w-auto print:p-0">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 print:hidden"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md mb-4 transition-colors">
            <FileSpreadsheet className="w-10 h-10 text-blue-600 dark:text-blue-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-800 dark:text-white transition-colors">
            ArchiMatch <span className="text-blue-600 dark:text-blue-500">Pro</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto transition-colors">
            Arşiv evrak denetimi ve veri doğrulama motoru.
          </p>
        </motion.div>

        {/* Yazdırma başlığı */}
        <div className="hidden print:block text-center mb-8">
           <h1 className="text-3xl font-bold border-b-2 border-black pb-2">ArchiMatch Analiz Raporu</h1>
           <p className="mt-2 text-gray-600">Dosya: {file?.name}</p>
        </div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="upload-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl no-print transition-colors duration-300"
            >
              <div 
                {...getRootProps()} 
                className={`relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                  ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                  ${file ? 'border-teal-500 bg-teal-50 dark:border-teal-500/50 dark:bg-teal-900/10' : ''}`}
              >
                <input {...getInputProps()} />
                
                <AnimatePresence mode="wait">
                  {!file ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                      <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragActive ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 dark:group-hover:text-blue-400'}`}>
                        <UploadCloud className="w-12 h-12" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 dark:text-slate-200">Excel Dosyasını Sürükleyin</h3>
                      <p className="text-slate-500 dark:text-slate-400/80 text-sm">veya seçmek için kutuya tıklayın (.xls, .xlsx, .xlsm)</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                      <div className="p-4 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 mb-4 transition-colors">
                        <CheckCircle className="w-12 h-12" />
                      </div>
                      <h3 className="text-lg font-semibold text-teal-800 dark:text-teal-200 mb-1">{file.name}</h3>
                      <p className="text-teal-600/80 dark:text-teal-400/60 text-sm font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 transition-colors">
                  <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={handleProcess}
                  disabled={!file || loading}
                  className={`relative overflow-hidden flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-bold text-lg transition-all w-full md:w-auto
                    ${!file || loading ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5'}`}
                >
                  {loading ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /><span>Analiz Ediliyor...</span></>
                  ) : (
                    <><span>Taramayı Başlat</span></>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 print-border-solid p-8 rounded-3xl shadow-xl w-full transition-colors duration-300"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6 gap-6 print:mb-4 print:pb-2">
                <div className="flex items-start space-x-4 w-full lg:w-auto">
                  <div className={`p-3 rounded-2xl shrink-0 ${result.toplam_hata === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'} transition-colors`}>
                    {result.toplam_hata === 0 ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Analiz Raporu</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm break-all mt-1">{file?.name}</p>
                  </div>
                </div>
                
                {/* Butonlar her zaman yan yana kalacak şekilde (Asla Scrollsuz / Wrap Yok) */}
                <div className="flex flex-row flex-nowrap items-center gap-2 justify-start sm:justify-end w-full lg:w-auto shrink-0 mt-2 lg:mt-0 print:hidden">
                  <button onClick={resetAll} className="whitespace-nowrap px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors flex items-center space-x-1.5 text-xs sm:text-sm shrink-0">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>Yeni Tarama</span>
                  </button>
                  <button onClick={() => window.print()} className="whitespace-nowrap px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-colors flex items-center space-x-1.5 text-xs sm:text-sm shrink-0">
                    <Printer className="w-4 h-4 shrink-0" />
                    <span>PDF / Yazdır</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4 mb-8 print:mb-4 print:gap-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm transition-colors print:p-2 print:border-slate-300">
                  <h4 className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm mb-1 text-center">Toplam Hata</h4>
                  <p className={`text-3xl font-extrabold ${result.toplam_hata === 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100 print:text-black'}`}>{result.toplam_hata}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm transition-colors print:p-2 print:border-orange-300">
                  <h4 className="text-orange-600/80 dark:text-orange-500/80 font-medium text-xs md:text-sm mb-1 text-center">Tarih Hataları</h4>
                  <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{result.tarih_hatalari?.length || 0}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm transition-colors print:p-2 print:border-amber-300">
                  <h4 className="text-amber-700/80 dark:text-amber-500/80 font-bold text-xs md:text-sm mb-1 text-center print:text-xs">Yazım Hatası (Uyarı)</h4>
                  <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{result.numara_hatalari?.filter(h => h.yazim_hatasi).length || 0}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 p-5 rounded-2xl flex flex-col justify-center items-center shadow-sm transition-colors print:p-2 print:border-rose-300">
                  <h4 className="text-rose-600/80 dark:text-rose-500/80 font-bold text-xs md:text-sm mb-1 text-center print:text-xs">Farklı Hasta (Hata)</h4>
                  <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{result.numara_hatalari?.filter(h => !h.yazim_hatasi).length || 0}</p>
                </div>
              </div>

              {result.toplam_hata === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-emerald-600 dark:text-emerald-400 font-medium">Harika! Dosyada hiçbir tarih veya numara hatası bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {result.tarih_hatalari?.length > 0 && (
                    <div className="print:break-inside-avoid">
                      <h3 className="text-lg font-bold text-orange-600 dark:text-orange-500 mb-3 flex items-center">
                        <XCircle className="w-5 h-5 mr-2" /> Tarih Formatı Hataları
                      </h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:overflow-visible print:border-solid print:border-slate-300 transition-colors">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors">
                            <tr>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold w-16">Sıra No</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Hasta Dosya Numarası</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold w-24">Hücre</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Hatalı Değer</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Hata Türü</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Hata Detayı</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-300">
                            {result.tarih_hatalari.map((err, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{err.form_sirasi || "-"}</td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{err.dosya_no || "-"}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{err.hucre}</td>
                                <td className="px-4 py-3">{highlightBadDatePart(err.mevcut_deger, err.hata_turu)}</td>
                                <td className="px-4 py-3 font-medium text-red-600 dark:text-rose-400">{err.hata_turu}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{err.hata_detayi}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {result.numara_hatalari?.length > 0 && (
                    <div className="print:break-inside-auto">
                      <h3 className="text-lg font-bold text-rose-600 dark:text-rose-500 mb-3 flex items-center mt-6">
                        <AlertTriangle className="w-5 h-5 mr-2" /> Hasta Dosya Numarası ve İsim Uyuşmazlıkları
                      </h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:overflow-visible print:border-solid print:border-slate-300 transition-colors">
                        <table className="w-full text-left text-sm print:text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors">
                            <tr>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold w-24">Hasta Dosya Numarası</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Uyuşmazlık Nedeni</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">Algoritma Kararı</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">1. Kayıt</th>
                              <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">2. Kayıt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-300">
                            {result.numara_hatalari.map((err, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{err.dosya_no}</td>
                                <td className="px-4 py-3 font-medium text-rose-600 dark:text-rose-400">{err.hata_nedeni}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    {err.yazim_hatasi ? (
                                      <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md inline-block max-w-max">Muhtemel Yazım Hatası</span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-md inline-block max-w-max">Farklı Hasta Girişi</span>
                                    )}
                                    <span className="text-xs mt-1 text-slate-500 dark:text-slate-400 font-medium">Benzerlik: %{err.benzerlik_yuzde}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                    {err.bosluk_farki ? renderNameWithSpaces(err.hasta_1) : err.hasta_1}
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sıra: <span className="font-medium text-slate-700 dark:text-slate-300">{err.hasta_1_form_sirasi || "-"}</span></div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                    {err.bosluk_farki ? renderNameWithSpaces(err.hasta_2) : err.hasta_2}
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sıra: <span className="font-medium text-slate-700 dark:text-slate-300">{err.hasta_2_form_sirasi || "-"}</span></div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
