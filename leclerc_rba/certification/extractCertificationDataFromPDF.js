function promptCompletionsEndpoint(extractedData, pdfUrl) {
  /*
    This function sends a request to the completions endpoint to extract relevant data from the PDF.
    Cette fonction envoie une requête au point de terminaison des complétions pour extraire les données pertinentes du PDF.
  */

  const prompt = `Extract the following data from the PDF at ${pdfUrl}:
  - ${Object.keys(extractedData).join("\n  - ")}

  Please provide the extracted data in JSON format, with the keys matching the provided field names.`;

  const requestPayload = {
    model: "gpt-4",
    prompt: prompt,
    response_format: "json",
    temperature: 0.0,
    max_tokens: 1500
  };

  const response = web_request(
    "https://api.openai.com/v1/completions",
    "POST",
    JSON.stringify(requestPayload),
    {
      "Content-Type": "application/json",
      "Authorization": `Bearer YOUR_API_KEY_HERE`
    }
  );

  if (!response) {
    logger("No response from completions endpoint");
    return null;
  }

  try {
    const parsedResponse = JSON.parse(response);
    return parsedResponse;
  } catch (error) {
    logger(`Error parsing response: ${error.message}`);
    return null;
  }
}
