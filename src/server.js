import express from 'express';
import bodyParser from 'body-parser';
// Mongo Client allows us to connect to our local database
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

// Where to serve the static field from
app.use(express.static(path.join(__dirname, '/build')));
// Parses the JSON object we included with our post request and adds a 'body' property to the request(req) parameter of whatever the matching route is
app.use(bodyParser.json());

// Wrapper function for connection to the database and closing the connection, also handles errors
// Passing res as the second parameter as to allow the routes to send the response to withDB so in case of an error withDB will be able to send that res.status(500).json...etc
const withDB = async (operations, res) => {
    try{
        // This is an async operation, returns a promise. 27017 is the default port for MongoDB
        // We are connecting to our local database and as a second argument we provided an 'options' object
        
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true });
        const db = client.db('my-blog');

        await operations(db);
        // Close the connection to the database
        client.close();
    } catch (error) {
        res.status(500).json({ message: 'Error connecting to db', error});
    }
}


// Get the article details based on its name
app.get('/api/articles/:name', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;

        const articlesInfo = await db.collection('articles').findOne({ name: articleName });
        res.status(200).json(articlesInfo);
    }, res);
})

app.post('/api/articles/:name/upvote', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;

        // Find the article based on the name
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
        // Update the article - updateOne's first param is the one on which to perform the update, the second param is the one using mongo syntax to perform the update
        // Update is performed using the above found article and changing its upvotes value
        await db.collection('articles').updateOne({ name: articleName },{
            '$set': {
                upvotes: articleInfo.upvotes + 1,
            },
        })
        // Get the updated article information
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
        // Send a response.ok and the updated article info
        res.status(200).json(updatedArticleInfo);
    }, res);

})

app.post('/api/articles/:name/add-comment', (req, res) => {
    const { username, text } = req.body;
    const articleName = req.params.name;
    withDB(async (db) => {
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
        await db.collection('articles').updateOne({ name: articleName }, {
            '$set': {
                comments: articleInfo.comments.concat({ username, text }), 
            },
        })
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res);

});

// All requests that aren't caught by any of our other API routes should be passed onto our app
// Will allow the client side app to navigate between pages and process URLs correctly
app.get('*', (req, res) => {
   res.sendFile(path.join(__dirname + '/build/index.html')) ;
})

app.listen(8000, () => console.log('Listening on port 8000'));