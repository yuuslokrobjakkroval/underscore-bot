const mongoose = require('mongoose');
const logger = require('../utils/logger');
const BotAssignment = require('./models/botAssignment');


module.exports = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            autoIndex: false,
        });
        await BotAssignment.createIndexes();
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};
