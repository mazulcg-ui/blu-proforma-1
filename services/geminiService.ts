import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, InvoiceJsonData } from '../types';

const API_KEY = 'AIzaSyDPPyes3JWO2TR1bA3lgerKncmcsoXvpxM';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const buildPrompt = (invoiceText: string): string => {
    return `
      You are an expert AI assistant for "Validador de Factura 360 Comex Pro Forma", specializing in auditing pro forma invoices for international trade. Your primary and most critical function is to validate the consistency between the seller's company name and the bank account beneficiary.

      **MANDATORY PRIMARY RULE: The seller's company name, as identified from the invoice, MUST EXACTLY MATCH the bank account holder's name. If there is any mismatch, or if the seller's name cannot be confidently identified, the invoice is considered "no_valida" (not valid), regardless of any other information on the document. This is the most important validation.**

      Analyze the following invoice text based on the detailed rules below.

      Your output MUST be in two parts, separated by "---JSON_OUTPUT---". Do not include any text before the first part or after the second part.
      
      Part 1: A visual report for the app UI. Use this exact format, including emojis. The text must be in Spanish:
      🏢 Vendedor vs. Cta. Bancaria: [✅/⚠️/❌] [Observation about seller name vs bank account holder]
      🏢 Destinatario: [✅/⚠️/❌] [Observation about recipient]
      🚢 Incoterm: [✅/⚠️/❌] [Detected Incoterm and its validity details]
      🚚 Dirección Recogida: [The pickup address if Incoterm is EXW, otherwise "No aplica"]
      💳 Términos de pago: [Detected payment terms]
      📦 Mercadería: [Brief summary of goods]
      📊 HS Code: [✅/⚠️/❌] [Detected/Suggested HS Code and reasoning]
      ✅ Conclusión final: [Válida / Con observaciones / No válida]
      
      Part 2: A structured JSON object for the database. Use this exact format, with lowercase snake_case keys and specific enum values for "estado_final":
      {
        "vendedor_coincide_cuenta_bancaria": boolean,
        "destinatario_valido": boolean,
        "incoterm": "string",
        "incoterm_valido": boolean,
        "incoterm_direccion_recogida": "string" | null,
        "terminos_pago": "string",
        "terminos_pago_validos": boolean,
        "mercaderia": "string",
        "hs_code_sugerido": "string",
        "hs_code_valido": boolean,
        "estado_final": "valida" | "con_observaciones" | "no_valida"
      }
      
      --- VALIDATION RULES (Apply these strictly) ---
      1.  **Vendedor vs. Cta. Bancaria (Seller vs. Bank Account) - CRITICAL CHECK:**
          *   **Task:** Your first and most important task is to identify the official legal name of the selling company from the invoice text. Scrutinize the entire document. Look for the name in the header, near the logo, next to labels like "Seller," "From," or an address that clearly belongs to the sender.
          *   **Inference:** If a clear name isn't in the header, you must attempt to deduce it. For example, if the invoice contains a company address and contact information, and that same information contextually links to the bank account holder's name, you can infer that the bank account holder IS the seller.
          *   **Source Hierarchy (Strictly follow):**
              1.  Explicitly labeled seller name (e.g., in the header).
              2.  Name associated with the main logo and address of the issuing party.
              3.  If the above are missing, infer the seller's name from the bank account beneficiary's name, BUT ONLY if other details (like the address) on the invoice correspond to that beneficiary.
          *   **CRITICAL: Do NOT infer the seller's name from email addresses or website domains.**
          *   **Bank Account Holder:** Next, extract the exact bank account holder's name (beneficiary) from the payment/banking details.
          *   **Comparison and Language Handling:** Compare the identified/inferred seller name with the bank account holder's name.
              *   **Language Translation:** If the seller's name and the bank account holder's name appear to be in different languages (e.g., English and Chinese), you must translate the non-Spanish/non-English name into Spanish to check if they represent the same company.
              *   **Match Condition:** A match occurs if the names are identical, have minor corporate variations ("Co., Ltd." vs "Co Ltd"), or are conceptually the same after translation.
              *   **Reporting:**
                  *   If they match, mark as ✅. If translation was used, your observation MUST show the original and the translation. Example: "Coinciden. El titular ('东阳市欣兴铭昊光电有限公司') fue traducido a ('Dongyang Xinxing Minghao Optoelectronics Co., Ltd.') para la verificación." Set "vendedor_coincide_cuenta_bancaria" to true.
                  *   If they do NOT match, this is a CRITICAL FAILURE. Mark as ❌. If you performed a translation, you MUST show the original name and your translation in the observation. Example: "El titular de la cuenta '东阳市欣兴铭昊光电有限公司' (traducido como 'Dongyang City Xinxing Minghao Optoelectronics Co., Ltd.') no coincide con el vendedor 'SELLER NAME'".
                  *   If you could not identify the seller's name, state that clearly: "No se pudo identificar un nombre de vendedor para comparar con el titular de la cuenta 'Bank Holder Name'."
                  *   Set "vendedor_coincide_cuenta_bancaria" to false in case of a mismatch or failure to identify the seller.

      2.  **Destinatario (Recipient Company):**
          *   The OFFICIAL recipient details are:
              *   Name: Guangzhou Baiyun Export & Import Co. LTD.
              *   Address: Thomson Commercial Building, 8 Thomson Road, Hong Kong, CHINA.
              *   TAX ID: 76303593.
          *   Compare the details in the invoice against these.
          *   If name, address, AND TAX ID match EXACTLY, mark as ✅ Coincidencia total. "destinatario_valido" is true.
          *   If there are minor differences or one part is missing, mark as ⚠️ Coincidencia parcial and explain. "destinatario_valido" is false.
          *   If they are completely different, mark as ❌ No coincide. "destinatario_valido" is false. This is a critical failure.
      
      3.  **Incoterm:**
          *   Detect the Incoterm (FOB, EXW, CIF, etc.).
          *   **If EXW:** You MUST find, extract, and report the full pickup address. This is critical. Report it in the "Dirección Recogida" field of the visual report and in "incoterm_direccion_recogida" in the JSON. If the Incoterm is EXW but no address is specified, the Incoterm is invalid.
          *   **For other Incoterms:** The "Dirección Recogida" should be "No aplica" and "incoterm_direccion_recogida" should be null.
          *   **If FOB:** Check if a port of departure is specified. If not, it's incomplete.
          *   "incoterm_valido" is true only if the incoterm is present and has the necessary details (pickup address for EXW, port for FOB, etc.). Prefix the Incoterm line in the visual report with ✅, ⚠️, or ❌ based on its validity.
      
      4.  **Términos de pago (Payment Terms):**
          *   Identify the terms (e.g., "TT 30/70", "LC at sight").
          *   Report if they are clear. "terminos_pago_validos" is true if terms are present and understandable.
      
      5.  **Descripción de la mercadería (Description of Goods):**
          *   Summarize the product type, quantity, model, etc.
          *   Note if key info like unit value is missing.
      
      6.  **Código HS (HS Code) Verification:**
          *   **Task:** Scan the entire invoice text to find any stated HS Code. Based on the description of the goods, verify its correctness.
          *   **If an HS Code is found:**
              *   Compare it against your knowledge of international trade classifications for the described "mercaderia".
              *   **If Correct:** Mark as ✅. The visual report must state why it's correct. Example: "✅ 8541.40 (Correcto para Diodos Emisores de Luz)". Set "hs_code_valido" to true and "hs_code_sugerido" to the detected code.
              *   **If Incorrect:** Mark as ❌. The visual report must explain the error and provide the correct code. Example: "❌ 9405.10 (Incorrecto, corresponde a lámparas. Se sugiere 8541.40 para Diodos Emisores de Luz)". Set "hs_code_valido" to false and "hs_code_sugerido" to your new, correct suggestion.
          *   **If no HS Code is found:**
              *   Suggest a plausible HS Code based on the "mercaderia".
              *   Mark as ⚠️. The visual report must state that the code is a suggestion. Example: "⚠️ 8541.40 (Sugerido, no presente en factura)".
              *   Set "hs_code_valido" to true (as there is no invalid code to flag). Set "hs_code_sugerido" to your suggestion.
          *   If you cannot determine a code, state "No determinado". Set "hs_code_valido" to true and "hs_code_sugerido" to "No determinado".
      
      7.  **Conclusión final / estado_final:**
          *   **'no_valida'**: This is the result if "vendedor_coincide_cuenta_bancaria" is false OR if "destinatario_valido" is false. This is a mandatory rule.
          *   'con_observaciones': If both company checks pass, but there are other minor issues (e.g. incoterm incomplete, payment terms unclear, hs_code_valido is false).
          *   'valida': All checks pass and there are no issues.

      --- INVOICE TEXT TO ANALYZE ---
      ${invoiceText}
    `;
};

export const analyzeInvoice = async (invoiceText: string): Promise<AnalysisResult> => {
    const prompt = buildPrompt(invoiceText);
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const rawText = response.text;
        const parts = rawText.split('---JSON_OUTPUT---');

        if (parts.length < 2) {
            throw new Error('Invalid response format from API. Could not find separator.');
        }

        const visualReport = parts[0].trim();
        let jsonString = parts[1].trim();
        
        // Clean up potential markdown code block fences
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7);
        }
        if (jsonString.endsWith('```')) {
            jsonString = jsonString.slice(0, -3);
        }

        const jsonData: InvoiceJsonData = JSON.parse(jsonString);

        return { visualReport, jsonData };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get analysis from Gemini API.");
    }
};