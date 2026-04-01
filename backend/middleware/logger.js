/**
 * Request logging middleware
 * Logs all incoming HTTP requests with method, path, and timestamp
 */

// eslint-disable-next-line func-names
const requestLogger = function requestLoggerMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  const { method, path } = req;

  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] ${method} ${path}`);

  // Hook into response.end to log response details
  // eslint-disable-next-line func-names
  const originalEnd = res.end;
  // eslint-disable-next-line func-names
  res.end = function (chunk, encoding) {
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] Response: ${res.statusCode}`);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
