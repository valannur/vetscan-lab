export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { imageBase64, mediaType } = req.body;
  if (!imageBase64 || !mediaType) return res.status(400).json({ error: "Faltan datos" });

  const prompt = `Eres un sistema OCR especializado en resultados de laboratorio veterinario (VetScan VS2 y HM5).

Analiza esta imagen y extrae TODOS los datos con precisión.

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional, backticks ni markdown:

{
  "especie": "Canino" o "Felino",
  "tipo": "Hemograma" o "Perfil Bioquímico",
  "paciente": {
    "nombre": "",
    "edad": "",
    "sexo": "",
    "tutor": "",
    "ficha": "",
    "mvSolicit": "",
    "clinSolicit": "",
    "fecha": ""
  },
  "valores": {
    "PARAMETRO_KEY": "valor_numerico"
  }
}

Para hemograma las claves son: ERITROCITOS, HEMOGLOBINA, HEMATOCRITO, VCM, HCM, CHCM, RDWc, RDWs, LEUCOCITOS, LINFOCITOS_ABS, MONOCITOS_ABS, NEUTROFILOS_ABS, EOSINOFILOS_ABS, BASOFILOS_ABS, LINFOCITOS_REL, MONOCITOS_REL, NEUTROFILOS_REL, EOSINOFILOS_REL, BASOFILOS_REL, PLAQUETAS, VPM, PCT, PDWc, PDWs

Para perfil bioquímico las claves son: ALBUMINA, FOSFATASA_ALC, ALT, AMILASA, BILIRRUBINA_TOT, BUN, UREA, CREA, FOSFORO, CALCIO, SODIO, POTASIO, GLUCOS, PROTEINAS_TOT, GLOBULINAS, HEM, LIP, ICT

Si un valor no está visible usa "". Solo el número sin unidades.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(i => i.text || "").join("").trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Error al procesar: " + err.message });
  }
}
