export const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json(data);
};

export const errorResponse = (
  res,
  statusCode = 500,
  message = "Something went wrong"
) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    // errors,
  });
};
