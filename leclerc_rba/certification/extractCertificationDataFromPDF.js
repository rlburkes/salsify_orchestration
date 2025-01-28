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
    "https://images.salsify.com/image/upload/f_png/lacp7wbkvyf699ykxjcx",
    "https://images.salsify.com/image/upload/f_png,pg_2/lacp7wbkvyf699ykxjcx"
  ]
}

Object.entries(mockCertificate).forEach(entry => {
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
