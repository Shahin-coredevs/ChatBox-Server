const express = require('express');
const formData = require("express-form-data");
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path')
const PORT = process.env.PORT || 3000

const app = express();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true
  }
});

app.use(express.json())
app.use(formData.parse())
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

const fileUpload = async (file) => {
  const imagesDir = `${path.resolve()}/images`;
  const fileName = file.name
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
  const buffer = fs.readFileSync(file.path)
  const filePath = `${imagesDir}/${fileName}`;
  fs.writeFileSync(filePath, buffer);
  return `images/${fileName}`
}


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
  const passwordMatch = await bcrypt.compare(password, isValid.password);
  if (!passwordMatch) return res.status(401).send("User Unauthorised");
  const token = jwt.sign({ email, id: isValid._id }, 'itsSecret');
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.status(200).send(isValid);

})
app.get('/me', auth, (req, res) => {

  return res.status(200).send(req.user);
})
// Log out Route 
app.post('/logout', (req, res) => {
  res.clearCookie('token', { maxAge: 0 }).send({ success: true })
})

io.on('connection', (socket) => {
  console.log(`=> Connected ${socket.id}`);

  socket.on('join', ({ connect, room }) => {

    if (connect) {
      socket.join(room)
      return
    }
    socket.leave(room)
  })
  socket.on('disconnect', () => {
    console.log('=> Disconnected', socket.id);
  })
});

app.post('/users', async (req, res) => {
  const { name, email, password } = req.body
  const id = Math.floor((Math.random() * 100000))
  const hashedPassword = await bcrypt.hash(password, 10);
  const userWithId = { name, email, id, password: hashedPassword }
  const result = await userCollection.insertOne(userWithId)
  res.status(200).send(result)
})

app.post('/message', async (req, res) => {
  if (req.body.data) req.body = JSON.parse(req.body.data)
  if (req.files.photo) {
    console.log(req.files.photo);
      req.body.image = await fileUpload(req.files.photo)
  }
  const conversation = await conversationCollection.insertOne(req.body);
  const message = await conversationCollection.findOne({ _id: conversation.insertedId })
  io.to(message.roomId).emit('message', message)
  res.end()
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
  const result = await conversationCollection.find({ 'roomId': +roomId }).toArray()
  return res.status(200).send(result)
})


app.get('/photo/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const imagePath = path.join(__dirname, 'images', fileName);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.send("Not Found")
  }
});


server.listen(PORT, () => {
  console.log('=> Server running on',PORT);
}); 