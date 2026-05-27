module.exports = async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) return res.status(200).json({ status: "ERROR", message: "API key no encontrada" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [{ role: "user", content: "Di solo: OK" }]
      })
    });

    const data = await response.json();
    res.status(200).json({ 
      status: response.ok ? "OK" : "ERROR",
      httpStatus: response.status,
      response: data
    });
  } catch (err) {
    res.status(200).json({ status: "ERROR", message: err.message });
  }
};
