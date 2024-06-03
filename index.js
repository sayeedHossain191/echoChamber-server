const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.bbzq5pl.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("Forum").collection("users");
        const postCollection = client.db("Forum").collection("posts");

        //Post related api
        app.get('/posts', async (req, res) => {
            const filter = req.query;
            const query = {
                // post_title: { $regex: filter.search, $options: 'i' }
            };
            // const options = {
            //     sort: {

            //     }
            // }
            const result = await postCollection.find(query).toArray();
            res.send(result)
        })

        //Users related api
        app.post('/users', async (req, res) => {
            const user = req.body;

            //insert email if user doesn't exist
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Forum is created')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
