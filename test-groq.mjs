// test-groq.mjs
async function test() {
  console.log("Iniciando prueba nativa con Node v24...");
  
  // REEMPLAZA ESTO CON TU KEY REAL
  const API_KEY = process.env.GROQ_API_KEY; 

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: "Hola" }]
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ ¡CONEXIÓN EXITOSA!");
      console.log("Respuesta:", data.choices[0].message.content);
    } else {
      console.log("❌ ERROR 403 DETECTADO");
      console.log("Cuerpo del error de Groq:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ Error de red:", err.message);
  }
}

test();