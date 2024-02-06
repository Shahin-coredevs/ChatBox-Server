const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const allUser = []
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true
  }
});

app.use(bodyParser.json())
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true
  })
);

const uri = "mongodb+srv://shahinalam:y89KSJmEgt0LnzUo@cluster0.cuy74ex.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const userCollection = client.db("ChatApplication").collection("Users");
const conversationCollection = client.db("ChatApplication").collection("Conversations");

async function run() {
  try {


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);

// Middleware
async function auth(req, res, next) {
  try {
    const token = req.headers.cookie.split('=')[1];
    const decode = jwt.verify(token, 'itsSecret');
    const user = await userCollection.findOne({ email: decode.email }, { projection: { password: 0 } });
    // console.log('middleware =>', decode.email);
    req.user = user;
    return next()
  }
  catch {
    return res.status(401).send("User Unauthorised");
  }
}

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const isValid = await userCollection.findOne({ email: email });
  if (!isValid) return res.status(404).send("User Not Found");
  if (isValid.password !== password) return res.status(401).send("User Unauthorised");
  const token = jwt.sign({ email, id: isValid._id }, 'itsSecret');
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.status(200).send(isValid);
  console.log(req.body);
})
app.get('/me', auth, (req, res) => {
  console.log(req.user);
  return res.status(200).send(req.user);
})
// Log out Route 
app.post('/logout', (req, res) => {
  res.clearCookie('token', { maxAge: 0 }).send({ success: true })
})

io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);

  socket.on('join', ({ connect, room }) => {
    console.log(connect, room);
    if (connect) {
      socket.join(room)
      return
    }
    socket.leave(room)
  })
  // socket.on('message', (msg) => {
  //   console.log(msg, msg.roomId);
  //   io.sockets.to(msg.roomId).emit('connectToRoom', msg);
  // })
  // socket.on('messageRequest', (request) => {
  //   console.log(request);
  // })
});

app.post('/users', async (req, res) => {
  const user = req.body
  const id = Math.floor((Math.random() * 100000))
  const userWithId = { ...user, id }
  const result = await userCollection.insertOne(userWithId)
  res.status(200).send(result)
})

app.post('/message', async (req, res) => {
  console.log(req.body);
  const conversationRoom = await conversationCollection.insertOne(req.body);
  const message = await conversationCollection.findOne({ _id: conversationRoom.insertedId })
  io.emit('message', message)
})

app.get('/users', auth, async (req, res) => {
  const result = await userCollection.find({}, { projection: { password: 0 } }).toArray();
  res.status(200).send(result)
})
app.get('/users/:email', async (req, res) => {
  const email = req.params.email
  const result = await userCollection.findOne({ email }, { projection: { password: 0 } })
  res.status(200).send(result)
})
app.get('/message', async (req, res) => {
  const result = await conversationCollection.find().toArray();
  res.status(200).send(result)
})

app.get('/message/:roomId', async (req, res) => {
  const roomId = req.params.roomId
  console.log(roomId);
  const result = await conversationCollection.find({ 'roomId': +roomId }).toArray()
  console.log(result);
  return res.status(200).send(result)
})



// event rcv kore room e connect korbe eki event er maddhone disconnect kore dite hbe...
// front end e jkn click korbe tkn event server e dibe trpr connect hobe... trpr e 2 jon eki room e connect.. room er id hobe mongodb r id..


server.listen(3000, () => {
  console.log('listening on *:3000');
}); 