export type InvoiceStatus = 'valida' | 'con_observaciones' | 'no_valida';

export interface InvoiceJsonData {
    vendedor_coincide_cuenta_bancaria: boolean;
    destinatario_valido: boolean;
    incoterm: string;
    incoterm_valido: boolean;
    incoterm_direccion_recogida: string | null;
    terminos_pago: string;
    terminos_pago_validos: boolean;
    mercaderia: string;
    hs_code_sugerido: string;
    hs_code_valido: boolean;
    estado_final: InvoiceStatus;
}

export interface AnalysisResult {
    visualReport: string;
    jsonData: InvoiceJsonData;
}
