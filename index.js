const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
        //await client.connect();

        const userCollection = client.db("Forum").collection("users");
        const tagsCollection = client.db("Forum").collection("tags");
        const postCollection = client.db("Forum").collection("posts");
        const commentCollection = client.db("Forum").collection("comments");
        const announcementCollection = client.db("Forum").collection("announcements");
        const paymentCollection = client.db("Forum").collection("payments");
        const reportCollection = client.db("Forum").collection("reports");



        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })




        // middlewares 
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }



        //Tags related api
        app.get('/tags', async (req, res) => {
            const cursor = tagsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })


        app.post('/tags', async (req, res) => {
            const newTag = req.body;
            console.log(newTag);
            const result = await tagsCollection.insertOne(newReport);
            res.send(result)
        })




        //Up Vote
        app.patch("/posts/upvote/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const document = await postCollection.findOne({ _id: new ObjectId(id) });
                let currentUpvote = parseInt(document.upvote);

                // Increment upvote by 1
                currentUpvote++;

                // Update upvote value in MongoDB
                const result = await postCollection.updateOne({ _id: new ObjectId(id) }, { $set: { upvote: currentUpvote.toString() } });
                res.send(result)

            } catch (error) {
                console.error("Error in fetching posts:", error);
                res.status(500).send({ error: error.message });
            }
        })



        app.patch("/posts/downvote/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const document = await postCollection.findOne({ _id: new ObjectId(id) });
                let currentDownvote = parseInt(document.downvote);

                // Decrement downvote by 1
                currentDownvote--;

                // Update downvote value in MongoDB
                const result = await postCollection.updateOne({ _id: new ObjectId(id) }, { $set: { downvote: currentDownvote.toString() } });
                res.send(result)

            } catch (error) {
                console.error("Error in fetching posts:", error);
                res.status(500).send({ error: error.message });
            }
        })






        //Post related api
        app.get('/posts', async (req, res) => {
            try {
                const { search, sort, email } = req.query;
                let pipeline = [];

                // Match stage for search
                if (search) {
                    pipeline.push({
                        $match: {
                            post_title: { $regex: search, $options: 'i' }
                        }
                    });
                }

                // Match stage for email
                if (email) {
                    pipeline.push({
                        $match: {
                            "postMaker.postMaker_email": email
                        }
                    });
                }
                // Convert upvote and downvote to numbers, add fields, and sort
                pipeline.push(
                    {
                        $addFields: {
                            voteDifference: { $subtract: [{ $toInt: "$upvote" }, { $toInt: "$downvote" }] }
                        }
                    },
                    {
                        $sort: { voteDifference: sort === 'asc' ? 1 : -1 }
                    }
                );

                const result = await postCollection.aggregate(pipeline).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error in fetching posts:", error);
                res.status(500).send({ error });
            }
        });



        //Post details
        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.findOne(query)
            res.json(result)
        })


        app.delete('/posts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/posts/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { 'postMaker.postMaker_email': email }
            const result = await postCollection.find(query).toArray()
            res.send(result)
        })


        //Comment related api
        app.post('/comments', async (req, res) => {
            const newComment = req.body;
            console.log(newComment);
            const result = await commentCollection.insertOne(newComment);
            res.send(result)
        })

        app.get('/comments', async (req, res) => {
            //console.log(req.headers)
            const result = await commentCollection.find().toArray();
            res.send(result)
        })


        app.get('/comments', verifyToken, async (req, res) => {
            const title = req.query.title;
            const query = { title: title };
            const result = await commentCollection.find(query).toArray()
            res.send(result)
        })




        //Report related api
        app.post('/reports', async (req, res) => {
            const newReport = req.body;
            console.log(newReport);
            const result = await reportCollection.insertOne(newReport);
            res.send(result)
        })

        app.get('/reports', async (req, res) => {
            //console.log(req.headers)
            const result = await reportCollection.find().toArray();
            res.send(result)
        })


        app.delete('/reports/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await reportCollection.deleteOne(query)
            res.send(result)
        })





        //Add post
        app.post('/posts', async (req, res) => {
            const newPost = req.body;
            console.log(newPost);
            const result = await postCollection.insertOne(newPost);
            res.send(result)
        })


        //Pagination starts
        app.get('/all-posts', async (req, res) => {
            const page = parseInt(req.query.page) - 1
            const size = parseInt(req.query.size)

            const cursor = postCollection.find();
            const result = await cursor
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result)
        })
        //Post count
        app.get('/post-count', async (req, res) => {
            const count = await postCollection.estimatedDocumentCount();
            res.send({ count })
        })
        //Pagination Ends



        //Users related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            console.log(req.headers)
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user doesnt exists: 
            // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })



        //Announcement related api
        app.post('/announcements', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await announcementCollection.insertOne(item)
            res.send(result)
        })

        app.get('/announcements', async (req, res) => {
            const cursor = announcementCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })


        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            console.log('payment info', payment);
            res.send(paymentResult);
        })

        app.get('/payments', async (req, res) => {
            const cursor = paymentCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })


        // stats or analytics
        app.get('/admin-stats', async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const posts = await postCollection.estimatedDocumentCount();
            const comments = await commentCollection.estimatedDocumentCount();
            // const orders = await paymentCollection.estimatedDocumentCount();

            // const result = await paymentCollection.aggregate([
            //   {
            //     $group: {
            //       _id: null,
            //       totalRevenue: {
            //         $sum: '$price'
            //       }
            //     }
            //   }
            // ]).toArray();

            // const revenue = result.length > 0 ? result[0].totalRevenue : 0;

            res.send({
                users,
                posts,
                comments
            })
        })





        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Forum is running')
})

app.listen(port, () => {
    console.log(`Forum is running on port ${port}`)
})
