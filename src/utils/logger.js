const winston = require('winston');
const path = require('path');
const { app } = require('electron');

// Determine log directory (use userData for production)
const logDir = app ? app.getPath('userData') : path.join(__dirname, '../../logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'potplayer-rpc' },
    transports: [
        // Error logs (separate file for easy debugging)
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        })
    ],
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
        )
    }));
}

// Graceful error handling
logger.on('error', (err) => {
    console.error('Logger error:', err);
});

module.exports = logger;
