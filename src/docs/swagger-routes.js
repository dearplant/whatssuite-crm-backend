/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization
 *   - name: Contacts
 *     description: Contact management
 *   - name: Messages
 *     description: Message operations
 *   - name: Campaigns
 *     description: Campaign management
 *   - name: WhatsApp
 *     description: WhatsApp account management
 *   - name: AI
 *     description: AI providers and chatbots
 *   - name: Transcription
 *     description: Voice transcription
 *   - name: Flows
 *     description: Automation flows
 */

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/v1/contacts:
 *   get:
 *     summary: List all contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 150
 *   post:
 *     summary: Create a new contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - whatsappAccountId
 *               - phone
 *               - name
 *             properties:
 *               whatsappAccountId:
 *                 type: string
 *                 format: uuid
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *                 description: WhatsApp account ID (UUID)
 *               phone:
 *                 type: string
 *                 pattern: '^\+[1-9]\d{1,14}$'
 *                 example: '+1234567890'
 *                 description: Phone number in E.164 format
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: 'Jane Smith'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'jane@example.com'
 *               company:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Acme Corp'
 *               jobTitle:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'CEO'
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 example: '123 Main St'
 *               city:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'New York'
 *               state:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'NY'
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'USA'
 *               postalCode:
 *                 type: string
 *                 maxLength: 20
 *                 example: '10001'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['customer', 'vip']
 *               customFields:
 *                 type: object
 *                 example:
 *                   industry: 'Technology'
 *                   leadSource: 'Website'
 *               notes:
 *                 type: string
 *                 example: 'Important client'
 *               isBlocked:
 *                 type: boolean
 *                 default: false
 *               isPinned:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Contact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 */

/**
 * @swagger
 * /api/v1/contacts/{id}:
 *   get:
 *     summary: Get contact by ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *   put:
 *     summary: Update contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contact updated
 *   delete:
 *     summary: Delete contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact deleted
 */

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contact_id
 *               - content
 *             properties:
 *               contact_id:
 *                 type: string
 *                 example: 'contact_456def'
 *               content:
 *                 type: string
 *                 example: 'Hello! How can I help you today?'
 *               type:
 *                 type: string
 *                 enum: [text, image, video, audio, document]
 *                 default: text
 *               media_url:
 *                 type: string
 *                 example: 'https://example.com/image.jpg'
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /api/v1/messages/{contactId}:
 *   get:
 *     summary: Get messages for a contact
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /api/v1/campaigns:
 *   get:
 *     summary: List all campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, running, paused, completed, cancelled]
 *     responses:
 *       200:
 *         description: Campaigns retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Campaign'
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - message_template
 *               - segment_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Summer Sale 2024'
 *               message_template:
 *                 type: string
 *                 example: 'Hi {{name}}, check out our summer sale!'
 *               segment_id:
 *                 type: string
 *                 example: 'segment_123'
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 example: '2024-06-01T10:00:00.000Z'
 *     responses:
 *       201:
 *         description: Campaign created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 */

/**
 * @swagger
 * /api/v1/campaigns/{id}/start:
 *   post:
 *     summary: Start a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign started
 */

/**
 * @swagger
 * /api/v1/ai/providers:
 *   get:
 *     summary: List AI providers
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI providers retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       provider:
 *                         type: string
 *                         enum: [OpenAI, Claude, Gemini, Cohere, Ollama]
 *                       modelConfig:
 *                         type: object
 *   post:
 *     summary: Create AI provider
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - credentials
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [OpenAI, Claude, Gemini, Cohere, Ollama]
 *                 example: 'OpenAI'
 *               credentials:
 *                 type: object
 *                 properties:
 *                   apiKey:
 *                     type: string
 *                     example: 'sk-...'
 *               modelConfig:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     example: 'gpt-4'
 *                   temperature:
 *                     type: number
 *                     example: 0.7
 *                   maxTokens:
 *                     type: integer
 *                     example: 1000
 *     responses:
 *       201:
 *         description: AI provider created
 */

/**
 * @swagger
 * /api/v1/ai/chatbots:
 *   get:
 *     summary: List chatbots
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chatbots retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chatbot'
 *   post:
 *     summary: Create chatbot
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ai_provider_id
 *               - system_prompt
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Customer Support Bot'
 *               ai_provider_id:
 *                 type: string
 *                 example: 'provider_123'
 *               system_prompt:
 *                 type: string
 *                 example: 'You are a helpful customer support assistant.'
 *               triggers:
 *                 type: object
 *                 properties:
 *                   autoReply:
 *                     type: boolean
 *                     example: true
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ['help', 'support']
 *     responses:
 *       201:
 *         description: Chatbot created
 */

/**
 * @swagger
 * /api/v1/ai/transcribe:
 *   post:
 *     summary: Transcribe audio message
 *     tags: [Transcription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *               - audioUrl
 *             properties:
 *               messageId:
 *                 type: string
 *                 example: 'msg_789ghi'
 *               audioUrl:
 *                 type: string
 *                 example: 'https://example.com/audio.ogg'
 *               language:
 *                 type: string
 *                 example: 'en'
 *               provider:
 *                 type: string
 *                 enum: [WhisperAPI, WhisperCpp]
 *                 example: 'WhisperAPI'
 *               triggerChatbot:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       202:
 *         description: Transcription job queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Transcription job queued'
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     messageId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: 'queued'
 */

/**
 * @swagger
 * /api/v1/ai/transcriptions/{id}:
 *   get:
 *     summary: Get transcription by ID
 *     tags: [Transcription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transcription retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VoiceTranscription'
 */

/**
 * @swagger
 * /api/v1/flows:
 *   get:
 *     summary: List automation flows
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flows retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       trigger:
 *                         type: object
 *                       actions:
 *                         type: array
 *                       is_active:
 *                         type: boolean
 *   post:
 *     summary: Create automation flow
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trigger
 *               - actions
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Welcome Flow'
 *               trigger:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: 'new_contact'
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: 'send_message'
 *                     config:
 *                       type: object
 *     responses:
 *       201:
 *         description: Flow created
 */

/**
 * @swagger
 * /api/v1/whatsapp/accounts:
 *   get:
 *     summary: List WhatsApp accounts
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp accounts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       phone_number:
 *                         type: string
 *                       status:
 *                         type: string
 *                       is_connected:
 *                         type: boolean
 *   post:
 *     summary: Add WhatsApp account
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: '+1234567890'
 *               name:
 *                 type: string
 *                 example: 'Business Account'
 *     responses:
 *       201:
 *         description: WhatsApp account added
 */

export default {};

/**
 * @swagger
 * /api/v1/whatsapp/connect:
 *   post:
 *     summary: Connect a new WhatsApp account
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: '+1234567890'
 *               name:
 *                 type: string
 *                 example: 'Business Account'
 *     responses:
 *       201:
 *         description: WhatsApp account connection initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accountId:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                     status:
 *                       type: string
 */

/**
 * @swagger
 * /api/v1/whatsapp/disconnect/{accountId}:
 *   post:
 *     summary: Disconnect a WhatsApp account
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: WhatsApp account disconnected
 */

/**
 * @swagger
 * /api/v1/whatsapp/qr-code/{accountId}:
 *   get:
 *     summary: Get QR code for WhatsApp connection
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 */

/**
 * @swagger
 * /api/v1/whatsapp/accounts/{accountId}:
 *   get:
 *     summary: Get WhatsApp account details
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account details retrieved
 */

/**
 * @swagger
 * /api/v1/whatsapp/health/{accountId}:
 *   get:
 *     summary: Get WhatsApp account health status
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Health status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: integer
 *                       example: 85
 *                     status:
 *                       type: string
 *                       example: 'healthy'
 *                     factors:
 *                       type: object
 */

/**
 * @swagger
 * /api/v1/whatsapp/send-message:
 *   post:
 *     summary: Send a WhatsApp message
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *               - to
 *               - message
 *             properties:
 *               accountId:
 *                 type: string
 *                 example: 'account_123'
 *               to:
 *                 type: string
 *                 example: '+1234567890'
 *               message:
 *                 type: string
 *                 example: 'Hello from WhatsApp!'
 *               mediaUrl:
 *                 type: string
 *                 example: 'https://example.com/image.jpg'
 *     responses:
 *       200:
 *         description: Message sent successfully
 */

/**
 * @swagger
 * /api/v1/whatsapp/messages:
 *   get:
 *     summary: Get WhatsApp messages with filters
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *       - in: query
 *         name: contactId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Messages retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */

/**
 * @swagger
 * /api/v1/contacts/import:
 *   post:
 *     summary: Import contacts from CSV/Excel
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               mapping:
 *                 type: object
 *                 example:
 *                   phone: 'Phone Number'
 *                   name: 'Full Name'
 *     responses:
 *       202:
 *         description: Import job queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: 'queued'
 */

/**
 * @swagger
 * /api/v1/contacts/export:
 *   get:
 *     summary: Export contacts to CSV
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
 *           default: csv
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Export file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/v1/campaigns/{id}:
 *   get:
 *     summary: Get campaign details
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Campaign'
 *   put:
 *     summary: Update campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               message_template:
 *                 type: string
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Campaign updated
 *   delete:
 *     summary: Delete campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign deleted
 */

/**
 * @swagger
 * /api/v1/campaigns/{id}/pause:
 *   post:
 *     summary: Pause a running campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign paused
 */

/**
 * @swagger
 * /api/v1/campaigns/{id}/stats:
 *   get:
 *     summary: Get campaign statistics
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     sent:
 *                       type: integer
 *                     delivered:
 *                       type: integer
 *                     read:
 *                       type: integer
 *                     failed:
 *                       type: integer
 */

/**
 * @swagger
 * /api/v1/ai/providers/{id}:
 *   get:
 *     summary: Get AI provider details
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider details
 *   put:
 *     summary: Update AI provider
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelConfig:
 *                 type: object
 *     responses:
 *       200:
 *         description: Provider updated
 *   delete:
 *     summary: Delete AI provider
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider deleted
 */

/**
 * @swagger
 * /api/v1/ai/providers/{id}/test:
 *   post:
 *     summary: Test AI provider
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: 'Hello, test message'
 *     responses:
 *       200:
 *         description: Test response
 */

/**
 * @swagger
 * /api/v1/ai/chatbots/{id}:
 *   get:
 *     summary: Get chatbot details
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbot details
 *   put:
 *     summary: Update chatbot
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               system_prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chatbot updated
 *   delete:
 *     summary: Delete chatbot
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbot deleted
 */

/**
 * @swagger
 * /api/v1/ai/chatbots/{id}/activate:
 *   post:
 *     summary: Activate chatbot
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbot activated
 */

/**
 * @swagger
 * /api/v1/ai/chatbots/{id}/deactivate:
 *   post:
 *     summary: Deactivate chatbot
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chatbot deactivated
 */

/**
 * @swagger
 * /api/v1/ai/chatbots/{id}/test:
 *   post:
 *     summary: Test chatbot with sample message
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: 'Hello, I need help'
 *     responses:
 *       200:
 *         description: Chatbot response
 */

/**
 * @swagger
 * /api/v1/ai/transcriptions:
 *   get:
 *     summary: List all transcriptions
 *     tags: [Transcription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Transcriptions list
 */

/**
 * @swagger
 * /api/v1/ai/transcriptions/message/{messageId}:
 *   get:
 *     summary: Get transcription by message ID
 *     tags: [Transcription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transcription retrieved
 */

/**
 * @swagger
 * /api/v1/flows/{id}:
 *   get:
 *     summary: Get flow details
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flow details
 *   put:
 *     summary: Update flow
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               actions:
 *                 type: array
 *     responses:
 *       200:
 *         description: Flow updated
 *   delete:
 *     summary: Delete flow
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flow deleted
 */

/**
 * @swagger
 * /api/v1/flows/{id}/activate:
 *   post:
 *     summary: Activate flow
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flow activated
 */

/**
 * @swagger
 * /api/v1/flows/{id}/test:
 *   post:
 *     summary: Test flow execution
 *     tags: [Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flow test result
 */

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: Flow analytics and performance metrics
 */

/**
 * @swagger
 * /api/v1/analytics/flows/dashboard:
 *   get:
 *     summary: Get flow performance dashboard data
 *     description: Returns comprehensive dashboard data including most used flows, slowest nodes, and overall statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     mostUsedFlows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           flowId:
 *                             type: string
 *                           flowName:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           triggerType:
 *                             type: string
 *                           totalExecutions:
 *                             type: integer
 *                     slowestNodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           flowId:
 *                             type: string
 *                           flowName:
 *                             type: string
 *                           nodeId:
 *                             type: string
 *                           nodeType:
 *                             type: string
 *                           nodeName:
 *                             type: string
 *                           executionCount:
 *                             type: integer
 *                           avgExecutionTime:
 *                             type: integer
 *                     overallStats:
 *                       type: object
 *                       properties:
 *                         totalFlows:
 *                           type: integer
 *                         activeFlows:
 *                           type: integer
 *                         totalExecutions:
 *                           type: integer
 *                         recentExecutions:
 *                           type: integer
 *                         statusCounts:
 *                           type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/analytics/flows/stats:
 *   get:
 *     summary: Get overall flow statistics
 *     description: Returns team-wide flow statistics including counts and status breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFlows:
 *                       type: integer
 *                       example: 25
 *                     activeFlows:
 *                       type: integer
 *                       example: 18
 *                     totalExecutions:
 *                       type: integer
 *                       example: 15000
 *                     recentExecutions:
 *                       type: integer
 *                       example: 450
 *                       description: Executions in last 24 hours
 *                     statusCounts:
 *                       type: object
 *                       properties:
 *                         completed:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         running:
 *                           type: integer
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/analytics/flows/most-used:
 *   get:
 *     summary: Get most used flows
 *     description: Returns flows sorted by execution count
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of flows to return
 *     responses:
 *       200:
 *         description: Most used flows retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       flowId:
 *                         type: string
 *                         example: 'flow_123abc'
 *                       flowName:
 *                         type: string
 *                         example: 'Welcome Flow'
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       triggerType:
 *                         type: string
 *                         example: 'message_received'
 *                       totalExecutions:
 *                         type: integer
 *                         example: 1500
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/analytics/flows/slowest-nodes:
 *   get:
 *     summary: Get slowest nodes across all flows
 *     description: Returns nodes with highest average execution time for bottleneck identification
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of nodes to return
 *     responses:
 *       200:
 *         description: Slowest nodes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       flowId:
 *                         type: string
 *                         example: 'flow_123abc'
 *                       flowName:
 *                         type: string
 *                         example: 'Order Processing'
 *                       nodeId:
 *                         type: string
 *                         example: 'node-5'
 *                       nodeType:
 *                         type: string
 *                         example: 'http_request'
 *                       nodeName:
 *                         type: string
 *                         example: 'Check Inventory'
 *                       executionCount:
 *                         type: integer
 *                         example: 500
 *                       successCount:
 *                         type: integer
 *                         example: 495
 *                       failureCount:
 *                         type: integer
 *                         example: 5
 *                       successRate:
 *                         type: number
 *                         example: 99.0
 *                       avgExecutionTime:
 *                         type: integer
 *                         example: 25000
 *                         description: Average execution time in milliseconds
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/analytics/flows/{flowId}:
 *   get:
 *     summary: Get analytics for a specific flow
 *     description: Returns detailed performance metrics for a single flow including node-level statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flow ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter executions from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter executions until this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of executions to analyze
 *     responses:
 *       200:
 *         description: Flow analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     flowId:
 *                       type: string
 *                       example: 'flow_123abc'
 *                     flowName:
 *                       type: string
 *                       example: 'Welcome Flow'
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     totalExecutions:
 *                       type: integer
 *                       example: 150
 *                     completedExecutions:
 *                       type: integer
 *                       example: 140
 *                     failedExecutions:
 *                       type: integer
 *                       example: 8
 *                     runningExecutions:
 *                       type: integer
 *                       example: 2
 *                     completionRate:
 *                       type: number
 *                       example: 93.33
 *                       description: Percentage of successful executions
 *                     avgExecutionTime:
 *                       type: integer
 *                       example: 45000
 *                       description: Average execution time in milliseconds
 *                     nodeMetrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           nodeId:
 *                             type: string
 *                           nodeType:
 *                             type: string
 *                           nodeName:
 *                             type: string
 *                           executionCount:
 *                             type: integer
 *                           successCount:
 *                             type: integer
 *                           failureCount:
 *                             type: integer
 *                           successRate:
 *                             type: number
 *                           avgExecutionTime:
 *                             type: integer
 *                     bottlenecks:
 *                       type: array
 *                       description: Top 3 slowest nodes
 *                       items:
 *                         type: object
 *                         properties:
 *                           nodeId:
 *                             type: string
 *                           nodeType:
 *                             type: string
 *                           avgExecutionTime:
 *                             type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Flow not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/analytics/flows:
 *   get:
 *     summary: Get analytics for all flows
 *     description: Returns analytics for all flows in the team with filtering and sorting options
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter executions from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter executions until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: totalExecutions
 *           enum: [totalExecutions, completionRate, avgExecutionTime, failedExecutions]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: All flows analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       flowId:
 *                         type: string
 *                       flowName:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       triggerType:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       totalExecutions:
 *                         type: integer
 *                       completedExecutions:
 *                         type: integer
 *                       failedExecutions:
 *                         type: integer
 *                       runningExecutions:
 *                         type: integer
 *                       completionRate:
 *                         type: number
 *                       avgExecutionTime:
 *                         type: integer
 *                       nodeMetrics:
 *                         type: array
 *                       bottlenecks:
 *                         type: array
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * tags:
 *   - name: E-commerce
 *     description: E-commerce integration (Shopify, WooCommerce)
 */

/**
 * @swagger
 * /api/v1/ecommerce/integrations:
 *   get:
 *     summary: List e-commerce integrations
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integrations retrieved
 *   post:
 *     summary: Create e-commerce integration
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - shop
 *               - accessToken
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [Shopify, WooCommerce]
 *               shop:
 *                 type: string
 *                 example: mystore.myshopify.com
 *               accessToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Integration created

/**
 * @swagger
 * /api/v1/ecommerce/orders:
 *   get:
 *     summary: List e-commerce orders
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Cancelled, Refunded]
 *     responses:
 *       200:
 *         description: Orders retrieved

/**
 * @swagger
 * /api/v1/ecommerce/abandoned-carts:
 *   get:
 *     summary: List abandoned carts
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Abandoned, Recovered, Completed, Expired]
 *     responses:
 *       200:
 *         description: Abandoned carts retrieved
 */
