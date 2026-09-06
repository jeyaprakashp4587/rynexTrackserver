import * as notificationService from "../services/notification.service.js";

export const sendNotification = async (req, res) => {
  try {
    const result = await notificationService.sendNotification(req.body);
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
