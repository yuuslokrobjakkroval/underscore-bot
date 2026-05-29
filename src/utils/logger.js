const winston = require('winston');
const { inspect } = require('node:util');

function formatMessage(message) {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.stack || message.message;

    try {
        return JSON.stringify(message);
    } catch {
        return inspect(message, { depth: 4, breakLength: 120 });
    }
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${formatMessage(message)}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

module.exports = logger;
