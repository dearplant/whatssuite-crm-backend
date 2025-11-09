import teamService from '../services/teamService.js';
import logger from '../utils/logger.js';

/**
 * Activity logging middleware
 * Automatically logs critical actions based on route and method
 */
const activityLogger = (action, resource) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Flag to ensure we only log once
    let logged = false;

    const logActivity = async (statusCode) => {
      if (logged) return;
      logged = true;

      // Only log successful operations (2xx status codes)
      if (statusCode >= 200 && statusCode < 300) {
        try {
          const teamId = req.user?.teamId;
          const userId = req.user?.id;
          const ipAddress = req.ip || req.connection?.remoteAddress;
          const userAgent = req.get('user-agent');

          if (teamId && userId) {
            // Extract resource ID from params or body
            const resourceId = req.params?.id || req.body?.id || null;

            // Extract relevant details from request
            const details = {};
            
            // For POST/PUT requests, include relevant body fields
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
              // Filter out sensitive fields
              const sensitiveFields = ['password', 'token', 'secret', 'credentials', 'api_key'];
              Object.keys(req.body || {}).forEach(key => {
                if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                  details[key] = req.body[key];
                }
              });
            }

            // For DELETE requests, include the resource being deleted
            if (req.method === 'DELETE' && resourceId) {
              details.deleted_id = resourceId;
            }

            await teamService.logActivity(
              teamId,
              userId,
              userId,
              action,
              resource,
              resourceId,
              Object.keys(details).length > 0 ? details : null,
              ipAddress,
              userAgent
            );
          }
        } catch (error) {
          // Don't fail the request if logging fails
          logger.error('Activity logging middleware error:', error);
        }
      }
    };

    // Override send function
    res.send = function (data) {
      logActivity(res.statusCode);
      return originalSend.call(this, data);
    };

    // Override json function
    res.json = function (data) {
      logActivity(res.statusCode);
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Predefined activity loggers for common actions
 */
export const logContactCreated = activityLogger('contact.created', 'contact');
export const logContactUpdated = activityLogger('contact.updated', 'contact');
export const logContactDeleted = activityLogger('contact.deleted', 'contact');
export const logContactImported = activityLogger('contact.imported', 'contact_import');

export const logCampaignCreated = activityLogger('campaign.created', 'campaign');
export const logCampaignUpdated = activityLogger('campaign.updated', 'campaign');
export const logCampaignStarted = activityLogger('campaign.started', 'campaign');
export const logCampaignPaused = activityLogger('campaign.paused', 'campaign');
export const logCampaignDeleted = activityLogger('campaign.deleted', 'campaign');

export const logFlowCreated = activityLogger('flow.created', 'flow');
export const logFlowUpdated = activityLogger('flow.updated', 'flow');
export const logFlowActivated = activityLogger('flow.activated', 'flow');
export const logFlowDeactivated = activityLogger('flow.deactivated', 'flow');
export const logFlowDeleted = activityLogger('flow.deleted', 'flow');

export const logWhatsAppConnected = activityLogger('whatsapp.connected', 'whatsapp_account');
export const logWhatsAppDisconnected = activityLogger('whatsapp.disconnected', 'whatsapp_account');

export const logChatbotCreated = activityLogger('chatbot.created', 'chatbot');
export const logChatbotUpdated = activityLogger('chatbot.updated', 'chatbot');
export const logChatbotActivated = activityLogger('chatbot.activated', 'chatbot');
export const logChatbotDeactivated = activityLogger('chatbot.deactivated', 'chatbot');

export const logIntegrationConnected = activityLogger('integration.connected', 'integration');
export const logIntegrationDisconnected = activityLogger('integration.disconnected', 'integration');

export const logSettingsUpdated = activityLogger('settings.updated', 'settings');

export default activityLogger;
