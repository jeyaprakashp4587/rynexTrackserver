export const successResponse = ({ res, statusCode, message, data }) =>
  res.status(statusCode).json({ success: true, message, data });

export const errorResponse = ({ res, statusCode, message }) =>
  res.status(statusCode).json({ success: false, message });
