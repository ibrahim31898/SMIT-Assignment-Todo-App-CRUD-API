const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the current directory
app.use(express.static(__dirname));

// MongoDB connection
const uri = 'mongodb+srv://ijan80348:shinryuken80348@cluster0.jtbtbsl.mongodb.net/todoapp';
const client = new MongoClient(uri);
const dbName = 'ijan80348';

let db, collection;

// Initialize database connection
async function connectDB() {
    try {
        await client.connect();
        console.log('✅ Connected successfully to MongoDB!');
        db = client.db(dbName);
        collection = db.collection('todoapp');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. GET all tasks
app.get('/api/todoapp', async (req, res) => {
    try {
        const todos = await collection.find({}).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, data: todos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. GET single task by ID
app.get('/api/todoapp/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid task ID' });
        }
        
        const todo = await collection.findOne({ _id: new ObjectId(id) });
        if (!todo) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        res.json({ success: true, data: todo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. CREATE new task
app.post('/api/todoapp', async (req, res) => {
    try {
        const { title, description, priority = 'medium' } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, error: 'Task title is required' });
        }

        const newTodo = {
            title: title.trim(),
            description: description ? description.trim() : '',
            priority,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collection.insertOne(newTodo);
        const insertedTodo = await collection.findOne({ _id: result.insertedId });
        
        res.status(201).json({ 
            success: true, 
            message: 'Task created successfully',
            data: insertedTodo 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. UPDATE task
app.put('/api/todoapp/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, completed } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid task ID' });
        }

        const updateData = { updatedAt: new Date() };
        
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (priority !== undefined) updateData.priority = priority;
        if (completed !== undefined) updateData.completed = completed;

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ 
            success: true, 
            message: 'Task updated successfully',
            data: result.value 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. DELETE single task
app.delete('/api/todoapp/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid task ID' });
        }

        const result = await collection.findOneAndDelete({ _id: new ObjectId(id) });
        
        if (!result.value) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ 
            success: true, 
            message: 'Task deleted successfully',
            data: result.value 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. DELETE all tasks
app.delete('/api/todoapp', async (req, res) => {
    try {
        const result = await collection.deleteMany({});
        res.json({ 
            success: true, 
            message: `${result.deletedCount} tasks deleted successfully`,
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Toggle task completion
app.patch('/api/todoapp/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid task ID' });
        }

        const todo = await collection.findOne({ _id: new ObjectId(id) });
        if (!todo) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    completed: !todo.completed,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        res.json({ 
            success: true, 
            message: 'Task status updated successfully',
            data: result.value 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'TODO API is running!',
        timestamp: new Date()
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Professional Todo API',
        version: '1.0.0',
        endpoints: {
            'GET /api/todoapp': 'Get all tasks',
            'GET /api/todoapp/:id': 'Get single task',
            'POST /api/todoapp': 'Create new task',
            'PUT /api/todoapp/:id': 'Update task',
            'DELETE /api/todoapp/:id': 'Delete task',
            'DELETE /api/todoapp': 'Delete all tasks',
            'PATCH /api/todoapp/:id/toggle': 'Toggle completion status'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API route not found' });
});

// 404 handler for other routes
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Professional TODO Server running on port ${PORT}`);
        console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
        console.log(`🌐 Web App: http://localhost:${PORT}`);
        console.log(`📊 MongoDB Database: ${dbName}`);
        console.log(`📝 Collection: todoapp`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await client.close();
    console.log('✅ Database connection closed');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await client.close();
    console.log('✅ Database connection closed');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Export the app and initializer for serverless (Vercel)
module.exports = { app, connectDB };

// Only start the server when run directly (local dev)
if (require.main === module) {
    startServer().catch(console.error);
}