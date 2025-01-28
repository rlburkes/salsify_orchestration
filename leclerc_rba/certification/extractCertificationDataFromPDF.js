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
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "strict": true,
      "name": "certificateInformation",
      "schema": {
        "type": "object",
        "required": [
          "documentNumber",
          "operatorType",
          "operator",
          "controlBody",
          "activities",
          "productCategories",
          "certificateDateAndPlace",
          "validity",
          "complianceConfirmation"
        ],
        "properties": {
          "documentNumber": {
            "type": "string",
            "description": "Unique identifier for the document"
          },
          "operatorType": {
            "type": "string",
            "enum": ["Operator"],
            "description": "Type of operator (e.g., Operator)"
          },
          "operator": {
            "type": "object",
            "required": ["name", "address"],
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of the operator"
              },
              "address": {
                "type": "string",
                "description": "Address of the operator"
              }
            },
            "additionalProperties": false
          },
          "controlBody": {
            "type": "object",
            "required": ["name", "code", "address"],
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of the control body"
              },
              "code": {
                "type": "string",
                "description": "Code of the control body"
              },
              "address": {
                "type": "string",
                "description": "Address of the control body"
              }
            },
            "additionalProperties": false
          },
          "activities": {
            "type": "array",
            "items": {
              "type": "string",
              "description": "List of activities"
            }
          },
          "productCategories": {
            "type": "object",
            "required": ["articleReference", "products"],
            "properties": {
              "articleReference": {
                "type": "string",
                "description": "Reference to EU regulation article"
              },
              "products": {
                "type": "array",
                "items": {
                  "type": "string",
                  "description": "List of product categories"
                }
              }
            },
            "additionalProperties": false
          },
          "certificateDateAndPlace": {
            "type": "object",
            "required": ["date", "location", "signedBy"],
            "properties": {
              "date": {
                "type": "string",
                "description": "Date of the certificate (e.g., YYYY-MM-DD)"
              },
              "location": {
                "type": "string",
                "description": "Location where the certificate was signed"
              },
              "signedBy": {
                "type": "string",
                "description": "Name of the person who signed the certificate"
              }
            },
            "additionalProperties": false
          },
          "validity": {
            "type": "object",
            "required": ["from", "to"],
            "properties": {
              "from": {
                "type": "string",
                "description": "Start date of the certificate validity (e.g., YYYY-MM-DD)"
              },
              "to": {
                "type": "string",
                "description": "End date of the certificate validity (e.g., YYYY-MM-DD)"
              }
            },
            "additionalProperties": false
          },
          "complianceConfirmation": {
            "type": "string",
            "description": "Confirmation of compliance with EU regulation"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "max_tokens": 6000
}

web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);
