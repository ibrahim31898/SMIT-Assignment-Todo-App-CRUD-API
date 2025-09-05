const serverless = require('serverless-http');
const path = require('path');

// Import the express app and DB initializer
const { app, connectDB } = require('../src/app');

let handler;

module.exports = async (req, res) => {
    if (!handler) {
        await connectDB();
        handler = serverless(app);
    }
    return handler(req, res);
};


