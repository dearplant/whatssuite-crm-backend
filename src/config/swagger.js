import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp CRM API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for WhatsApp CRM SaaS platform',
      contact: {
        name: 'API Support',
        email: 'support@whatsappcrm.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.whatsappcrm.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'user_123abc',
            },
            email: {
              type: 'string',
              example: 'john.doe@example.com',
            },
            first_name: {
              type: 'string',
              example: 'John',
            },
            last_name: {
              type: 'string',
              example: 'Doe',
            },
            role: {
              type: 'string',
              enum: ['Owner', 'Admin', 'Manager', 'Agent'],
              example: 'Owner',
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'contact_456def',
            },
            phone_number: {
              type: 'string',
              example: '+1234567890',
            },
            name: {
              type: 'string',
              example: 'Jane Smith',
            },
            email: {
              type: 'string',
              example: 'jane.smith@example.com',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['customer', 'vip'],
            },
            custom_fields: {
              type: 'object',
              example: {
                company: 'Acme Corp',
                position: 'CEO',
              },
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'msg_789ghi',
            },
            contact_id: {
              type: 'string',
              example: 'contact_456def',
            },
            content: {
              type: 'string',
              example: 'Hello, how can I help you?',
            },
            type: {
              type: 'string',
              enum: ['text', 'image', 'video', 'audio', 'document'],
              example: 'text',
            },
            direction: {
              type: 'string',
              enum: ['inbound', 'outbound'],
              example: 'outbound',
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
              example: 'delivered',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'campaign_101jkl',
            },
            name: {
              type: 'string',
              example: 'Summer Sale 2024',
            },
            status: {
              type: 'string',
              enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
              example: 'running',
            },
            message_template: {
              type: 'string',
              example: 'Hi {{name}}, check out our summer sale!',
            },
            scheduled_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-06-01T10:00:00.000Z',
            },
            total_recipients: {
              type: 'integer',
              example: 1000,
            },
            sent_count: {
              type: 'integer',
              example: 850,
            },
            delivered_count: {
              type: 'integer',
              example: 820,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Chatbot: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'chatbot_202mno',
            },
            name: {
              type: 'string',
              example: 'Customer Support Bot',
            },
            ai_provider_id: {
              type: 'string',
              example: 'provider_303pqr',
            },
            system_prompt: {
              type: 'string',
              example: 'You are a helpful customer support assistant.',
            },
            triggers: {
              type: 'object',
              example: {
                autoReply: true,
                keywords: ['help', 'support'],
              },
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        VoiceTranscription: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'trans_404stu',
            },
            message_id: {
              type: 'string',
              example: 'msg_789ghi',
            },
            transcription: {
              type: 'string',
              example: 'Hello, I need help with my order',
            },
            language: {
              type: 'string',
              example: 'en',
            },
            duration: {
              type: 'integer',
              example: 5,
            },
            provider: {
              type: 'string',
              enum: ['WhisperAPI', 'WhisperCpp', 'GoogleSTT', 'AssemblyAI'],
              example: 'WhisperAPI',
            },
            cost: {
              type: 'number',
              example: 0.0005,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/docs/swagger-routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
