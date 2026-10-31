import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import { HTTP_STATUS } from "../constants/trip.constants.js";

export const handleRequest =
  (run, { failureMessage, exposeError = false }) =>
  async (req, res) => {
    try {
      const { message, data } = await run(req);

      return successResponse({
        res,
        statusCode: HTTP_STATUS.OK,
        message,
        data,
      });
    } catch (error) {
      return errorResponse({
        res,
        statusCode: HTTP_STATUS.SERVER_ERROR,
        message: exposeError ? error.message || failureMessage : failureMessage,
      });
    }
  };

export const withData = (message, data) => ({ message, data });

export const handleAction = (run, failureMessage) =>
  handleRequest(
    async (req) => {
      const { message, trip } = await run(req);

      return withData(message, trip);
    },
    { failureMessage, exposeError: true }
  );
