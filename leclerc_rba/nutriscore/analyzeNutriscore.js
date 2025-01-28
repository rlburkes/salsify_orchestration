const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${secret_value('open-ai-key')}`
};

var content = [
  {
    "type": "text",
    "text": `Please analyze the provided product packaging image and determine the following:

1. Locate the Nutri-Score label by identifying the "NUTRI-SCORE" text along with the color-coded rating letters (A in green, B in chartreuse, C in yellow, D in orange, and E in red).
2. Identify which letter (A, B, C, D, or E) is most prominent/enlarged, representing the Nutri-Score value.
3. Determine the general location of the Nutri-Score label on the packaging using cardinal directions (e.g., top-left, bottom-right, center, etc.).

**Return Format (JSON):**
{
  "nutriScoreLocation": "<cardinal_direction>",
  "nutriScoreValue": "<score_letter>"
}`
  }
]

Object.entries(context.imageProperties).forEach(entry => {
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
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "strict": true,
      "name": "nutri_score_analysis",
      "schema": {
        "type": "object",
        "required": [
          "nutriScoreLocation",
          "nutriScoreValue"
        ],
        "properties": {
          "nutriScoreLocation": {
            "type": "string",
            "description": "The general location of the Nutri-Score label on the packaging using cardinal directions (e.g., top-left, bottom-right, center, etc.)"
          },
          "nutriScoreValue": {
            "type": "string",
            "enum": ["A", "B", "C", "D", "E"],
            "description": "The Nutri-Score value represented by the most prominent/enlarged letter"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "max_tokens": 6000
}


web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
