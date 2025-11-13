
import React, { useState } from 'react';
import { AnalysisResult, InvoiceStatus } from '../types';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ClipboardCopyIcon, DownloadIcon } from './Icons';

interface ResultDisplayProps {
    result: AnalysisResult;
}

const getStatusStyles = (status: InvoiceStatus) => {
    switch (status) {
        case 'valida':
            return {
                icon: <CheckCircleIcon className="w-8 h-8 text-green-500" />,
                bgColor: 'bg-green-100',
                borderColor: 'border-green-500',
                textColor: 'text-green-700',
                title: 'Factura Válida'
            };
        case 'con_observaciones':
            return {
                icon: <AlertTriangleIcon className="w-8 h-8 text-yellow-500" />,
                bgColor: 'bg-yellow-100',
                borderColor: 'border-yellow-500',
                textColor: 'text-yellow-700',
                title: 'Válida con Observaciones'
            };
        case 'no_valida':
            return {
                icon: <XCircleIcon className="w-8 h-8 text-red-500" />,
                bgColor: 'bg-red-100',
                borderColor: 'border-red-500',
                textColor: 'text-red-700',
                title: 'Factura No Válida'
            };
        default:
            return {
                icon: <AlertTriangleIcon className="w-8 h-8 text-slate-500" />,
                bgColor: 'bg-slate-100',
                borderColor: 'border-slate-500',
                textColor: 'text-slate-700',
                title: 'Estado Indeterminado'
            };
    }
};

const VisualReportItem: React.FC<{ line: string }> = ({ line }) => {
    const parts = line.split(':');
    if (parts.length < 2) return <p>{line}</p>;

    const title = parts[0].replace(/\*/g, '');
    const value = parts.slice(1).join(':').trim();

    let icon = null;
    let valueColor = 'text-slate-600';

    if (value.startsWith('✅')) {
        icon = <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        valueColor = 'text-green-600';
    } else if (value.startsWith('⚠️')) {
        icon = <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
        valueColor = 'text-yellow-600';
    } else if (value.startsWith('❌')) {
        icon = <XCircleIcon className="w-5 h-5 text-red-500" />;
        valueColor = 'text-red-600';
    }

    return (
        <div className="flex items-start py-3">
            <span className="w-40 sm:w-48 font-semibold text-slate-800">{title}:</span>
            <div className="flex-1 flex items-start gap-2">
                {icon && <div className="mt-0.5">{icon}</div>}
                <span className={`flex-1 ${valueColor}`}>{value.substring(icon ? 2 : 0).trim()}</span>
            </div>
        </div>
    );
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const { visualReport, jsonData } = result;

    const statusStyles = getStatusStyles(jsonData.estado_final);

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
        setCopySuccess('¡Copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "analisis_factura.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-8">
            <div className={`p-6 rounded-2xl shadow-lg border-l-4 ${statusStyles.borderColor} ${statusStyles.bgColor}`}>
                <div className="flex items-center gap-4">
                    {statusStyles.icon}
                    <h2 className={`text-2xl font-bold ${statusStyles.textColor}`}>
                        {statusStyles.title}
                    </h2>
                </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
                <h3 className="text-xl font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2">
                    Informe de Validación
                </h3>
                <div className="divide-y divide-slate-200">
                    {visualReport.split('\n').filter(line => line.trim()).map((line, index) => (
                        <VisualReportItem key={index} line={line} />
                    ))}
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-100">
                        Datos Estructurados (JSON)
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors">
                            <ClipboardCopyIcon className="w-5 h-5" />
                            <span>{copySuccess || 'Copiar'}</span>
                        </button>
                        <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors">
                            <DownloadIcon className="w-5 h-5" />
                            <span>Descargar</span>
                        </button>
                    </div>
                </div>
                <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{JSON.stringify(jsonData, null, 2)}</code>
                </pre>
            </div>
        </div>
    );
};

export default ResultDisplay;
