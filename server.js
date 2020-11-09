const express = require('express');
const db = require('./config');
const bcrypt = require('bcryptjs')
const session = require('express-session');
const sessionStore = require('connect-session-knex')(session)

const server = express();
server.use(express.json());
server.use(session({
    name: 'cookie',
    secret: 'the ultimate secret',
    cookie: {
        maxAge: 1000 * 60,
        secure: false,
        httpOnly: true
    },
    resave: false,
    saveUninitialized: false,
    store: new sessionStore({
        knex: require('./config'),
        tableName: 'sessions',
        sidfieldname: 'sid',
        createTable: true,
        clearInterval: 1000* 60* 60
    })
}))

server.get('/testing', (req, res, next)=>{
    res.json({message: 'wow'});
})

const secure = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        next({code: 500, message: 'security alert!'})
    }
}

const verifyNewUser = (req, res, next) => {
    if (!req.body.username && !req.body.password) {
        next({code: 500, message: 'username and password are required fields'})
    } else {
        next();
    }
}

server.get('/api/users', secure, (req, res, next)=>{
    db('users')
    .then(data=>{
        res.json(data);
    })
    .catch(err=>{
        res.status(500).json({message: err.message})
    })
})

server.post('/auth/register', verifyNewUser, (req, res, next)=>{
    const {username, password} = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const user = {username, password: hash};
    db('users').insert(user)
    .then(data=>{
        return db('users').where({id: data})
    })
    .then(data=>{
        res.status(201).json(data)
    })
    .catch(err=>{
      res.status(500).json({message: err.message})
    })
})

server.post('/auth/login', async (req, res, next)=>{
    try {
    const [user] = await db('users').where({username: req.body.username});
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        req.session.user = user;
        res.json({message: 'welcome back, ' + user.username})
    }
    // .then(data=>{
    //     if (bcrypt.compareSync(req.body.password, data)) {
    //         req.session.user = user;
    //         res.json({message: 'welcome back, ' + user.username})
    //     } else {
    //         res.status(500).json({message: 'bad credentials'})
    //     }
    // })
    // .catch(err=>{
    //     console.log(req.body)
    //     res.status(500).json({message: err.message})
    // })
    }catch(err){
        res.status(500).json({message: 'bad credentials'})
    }
})

server.get('/auth/logout', (req, res, next)=>{
    if (req.session && req.session.user) {
        req.session.destroy(err=>{
            if (err){
                res.status(500).json({message: 'there was an error logging you out'})
            } else {
                res.json({message: 'successfully logged out'})
            }
        })
    } else {
        res.status(500).json({message: 'you have no session'})
    }
})

server.use((err, req, res, next)=>{
    res.status(err.code).json({message: err.message})
})

module.exports = server;