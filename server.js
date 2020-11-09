const express = require('express');

const server = express();
server.use(express.json());

server.get('/testing', (req, res, next)=>{
    res.json({message: 'wow'});
})

module.exports = server;