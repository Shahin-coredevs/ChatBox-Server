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

// Middleware
function auth (req, res, next){
  const token = req.headers.cookie.split('=')[1];
  
  console.log(token);
  // console.log(req.headers.cookie);
  return next()
}

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
async function run() {
  try {
    
    
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

// Login Route
app.post('/login', async (req, res)=> {
  const {email, password} = req.body;

  const isValid = await userCollection.findOne({email: email});
  if(!isValid) return res.status(404).send("User Not Found");
  if(isValid.password !== password) return res.status(401).send("User Unauthorised");
  const token = jwt.sign(email, 'itsSecret');

  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.status(200).send('Login Success')
  // console.log(isValidPass);
  console.log(req.body);
})
var roomno = 1;
io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);
  // socket.join('test')
  // socket.in('test').emit('test','room join')
  // socket.on('message', (msg)=>{
  //   // socket.broadcast.emit('message',msg)
  //   socket.to('test').emit(msg);
  //   console.log(msg);
  // })

  socket.join("room-"+roomno);
   //Send this event to everyone in the room.
  //  io.sockets.in("room-"+roomno).emit('connectToRoom', "You are in room no. "+roomno);

   socket.on('message', (msg)=>{
    console.log(msg);
    io.sockets.in("room-"+roomno).emit('connectToRoom', msg);
   })
});

app.post('/users',async (req, res) => {
  const user = req.body
  const id= Math.floor((Math.random() * 100000))
  const userWithId = {...user,id}
  const result = await userCollection.insertOne(userWithId)
  res.status(200).send(result)
})

app.get('/users', auth, async (req,res)=>{
  const result = await userCollection.find().toArray() 
  res.status(200).send(result)
})
app.get('/users/:email', async (req,res)=>{
  const Email = req.params.email
  const result = await userCollection.findOne({email:Email})
  if(result){
    const token = jwt.sign(result.email, 'gthryu56hb45gftgfvr@3fdsfvdgrthbrtf15653246t523edfsgtfhtrfderweevtyrwqe', {
      expiresIn: '1h',
      });
  }
  res.status(200).send(result).cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
})
})



server.listen(3000, () => {
  console.log('listening on *:3000');
}); 