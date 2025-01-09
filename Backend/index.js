const express = require('express');
const application = express();
const features = require('./routes/features');
const cors = require('cors');
const firebaseApp = require('./server/firebase');
require('dotenv').config();


application.use(express.json());
application.use('/api',features);

application.use(cors({
    origin: ['chrome-extension://kgmceachgfajbekekhbjjkkeomecnpbe','extension://kgmceachgfajbekekhbjjkkeomecnpbe'], 
}));

application.use((req,res,next)=>{
    const err = new Error("NOT FOUND");
    err.status=404;
    next(err);
})
application.use((err,req,res,next)=>{
    res.status(err.status||500);
    res.send({
        error:{
            status:err.status ||500,
            Message:err.Message
        }
    })
})
  
const port = process.env.PORT || 8000;

application.listen(port, ()=>{
    console.log(`you are listenning to http://127.0.0.1:${port}`)
})