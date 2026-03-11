  export const ApiResponse = (res, statusCode, message, data = null) => {
      res.status(statusCode).json({
        statusCode,
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
      });
    };
    