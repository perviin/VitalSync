/**
 * Request logging middleware
 * Logs all incoming HTTP requests with method, path, and timestamp
 */

const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, path } = req;

  console.log(`[${timestamp}] ${method} ${path}`);

  // Hook into response.end to log response details
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    console.log(`[${timestamp}] Response: ${res.statusCode}`);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
