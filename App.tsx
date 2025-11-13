
import React, { useState, useRef } from 'react';
import { analyzeInvoice } from './services/geminiService';
import { AnalysisResult } from './types';
import { LoaderIcon, UploadCloudIcon, XIcon, FileTextIcon } from './components/Icons';
import ResultDisplay from './components/ResultDisplay';

// pdfjsLib is loaded from a script tag in index.html
declare const pdfjsLib: any;

const App: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const extractTextFromPdf = async (file: File): Promise<string> => {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = async (event) => {
                if (!event.target?.result) {
                    return reject(new Error("Failed to read file."));
                }
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                try {
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    resolve(fullText);
                } catch (error) {
                    reject(new Error("Error al procesar el archivo PDF. Asegúrese de que sea un PDF válido."));
                }
            };
            fileReader.onerror = () => reject(new Error("Error al leer el archivo."));
            fileReader.readAsArrayBuffer(file);
        });
    };

    const handleFile = (file: File | null) => {
        if (file && file.type === "application/pdf") {
            setSelectedFile(file);
            setError(null);
            setResult(null);
        } else if (file) {
            setError("Por favor, seleccione un archivo PDF válido.");
            setSelectedFile(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files ? e.target.files[0] : null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFile(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setResult(null);
        setError(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError("Por favor, seleccione un archivo PDF para analizar.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const text = await extractTextFromPdf(selectedFile);
            const analysisResult = await analyzeInvoice(text);
            setResult(analysisResult);
        } catch (err: any) {
            setError(err.message || "Ocurrió un error inesperado durante el análisis.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <main className="container mx-auto max-w-4xl w-full">
                <header className="text-center mb-8">
                    <img
                        src="https://media.licdn.com/dms/image/v2/C4D0BAQHTk17_RC0alQ/company-logo_200_200/company-logo_200_200/0/1676472326591/360_comex_logo?e=2147483647&v=beta&t=Vvc5D4xX0cHYmU95BCfcVIATASwUB0U-F7GpLzwyAWc"
                        alt="360 Comex Logo"
                        className="w-24 h-24 mx-auto rounded-full shadow-md"
                    />
                    <h1 className="text-3xl sm:text-4xl font-bold text-blue-800 mt-4">
                        Validador de Factura 360 Comex
                    </h1>
                    <p className="text-slate-500 italic mt-1">by María Azul</p>
                    <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
                        Análisis de consistencia entre Razón Social del vendedor y titular de la cuenta bancaria.
                    </p>
                </header>

                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
                    <div className="space-y-6">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="application/pdf"
                                className="hidden"
                            />
                            {selectedFile ? (
                                <div className="text-center w-full">
                                    <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg w-full">
                                        <div className="flex items-center min-w-0">
                                            <FileTextIcon className="w-10 h-10 text-blue-600 flex-shrink-0" />
                                            <div className="ml-4 text-left min-w-0">
                                                <p className="font-semibold text-slate-700 truncate">{selectedFile.name}</p>
                                                <p className="text-sm text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                                            className="ml-4 p-1.5 rounded-full hover:bg-slate-200 transition-colors flex-shrink-0"
                                            aria-label="Remove file"
                                        >
                                            <XIcon className="w-5 h-5 text-slate-600" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <UploadCloudIcon className="w-12 h-12 text-slate-400 mb-2" />
                                    <p className="text-slate-600 font-semibold">
                                        Arrastre y suelte su factura aquí
                                    </p>
                                    <p className="text-sm text-slate-500">o haga clic para seleccionar (solo PDF)</p>
                                </>
                            )}
                        </div>

                        <div>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedFile || isLoading}
                                className="w-full flex items-center justify-center bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                            >
                                {isLoading ? (
                                    <>
                                        <LoaderIcon className="animate-spin w-5 h-5 mr-3" />
                                        Analizando...
                                    </>
                                ) : (
                                    'Analizar Factura'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {result && <ResultDisplay result={result} />}
                </div>

            </main>
        </div>
    );
};

export default App;
