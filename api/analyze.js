module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64 || !mediaType) return res.status(400).json({ error: "Faltan datos" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key no configurada" });

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
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

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Error de Anthropic: " + response.status });
    }

    if (!data.content || !data.content.length) {
      return res.status(500).json({ error: "Respuesta vacía de Anthropic" });
    }

    const text = data.content.map(i => i.text || "").join("").trim().replace(/```json|```/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      return res.status(500).json({ error: "No se pudo parsear respuesta: " + text.substring(0, 200) });
    }

    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({ error: "Error interno: " + err.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb"
    }
  }
};
