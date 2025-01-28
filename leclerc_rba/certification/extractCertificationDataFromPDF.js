const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

var content = [
  {
    "type": "text",
    "text": `Please analyze the attached certificate PDF and extract embedded data.`
  }
]

const mockCertificate = {
  "certificate": [
    "https://smedia.supplierxm.salsify.com/product/document/9b2145fd-1886-47a3-8a86-802a98837167.pdf"
  ]
}

Object.entries().forEach(entry => {
  const [key, values] = entry;
  values.forEach(imageUrl => {
    content.push({
      "type": "image_url",
      "image_url": {
        "url": imageUrl
      }
    });
  });
});

var payload = {
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": content
    }
  ],
  "max_tokens": 6000
}

web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
