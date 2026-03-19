// =============================================================================
// Logger utility using Winston
// =============================================================================
// WHAT THIS DOES:
//   Creates a structured logger that outputs JSON in production
//   (Azure Application Insights can parse JSON logs automatically)
//   and human-readable text in development.
// =============================================================================

'use strict';

const { createLogger, format, transports } = require('winston');

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment
    ? format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      )
    : format.combine(
        format.timestamp(),
        format.json()
      ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;
