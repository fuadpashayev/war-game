const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { networkInterfaces } = require('os');
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});
const nets = networkInterfaces();
const results = {};

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }
            results[name].push(net.address);
        }
    }
}

class Character {

    currentWalkState = -0.5;
    currentAttackState = -0.5;
    currentHurtingState = -0.5;
    currentDieState = -0.5;
    currentDisappearState = -0.5;

    attackMode = false;
    hurtingMode = false;
    dieMode = false;
    died = false;
    gameOver = false;

    overlapping = false;
    attackingOther = false;

    speed = 1;
    immun = 100;

    mainDirection = 'right';
    directions = [];
    width = 150;
    height = 100;

    constructor(x, y, name, socketId) {
        this.position = { x, y };
        this.name = name;
        this.id = socketId;
    }
}

let characters = [];
let meats = [];
let potions = [];
const config = {
    attackForce: 2.5
};

const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('/index.html');
});

io.on('connection', (socket) => {
    const {id} = socket;

    socket.on('start', (characterData, callback) => {
        let { x, y, name } = characterData;
        characterData.id = id;
        let character = new Character(x, y, name, id);
        callback(characters.map(characterItem => {
            let { name, position: { x, y }, id } = characterItem;
            return { x, y, name, id };
        }), meats, config);
        characters.push(character);
        socket.broadcast.emit('character-spawn', characterData);
        console.log(`${name} joined game`)
    });

    socket.on('moving', ({x, y, mainDirection, currentWalkState}) => {
        let character = characters.find(character => character.id === id);
        if(character){
            character.position = {x, y};
            character.mainDirection = mainDirection;
            character.currentWalkState = currentWalkState;
            socket.broadcast.emit('character-moving', {id, x, y, mainDirection, currentWalkState});
        }
    });

    socket.on('attacking', ({x, y, mainDirection, currentAttackState}) => {
        let character = characters.find(character => character.id === id);
        if(character){
            character.position = {x, y};
            character.mainDirection = mainDirection;
            character.currentAttackState = currentAttackState;
            socket.broadcast.emit('character-attacking', {id, x, y, mainDirection, currentAttackState});
        }
    });

    socket.on('dieMode', id => {
        socket.broadcast.emit('character-dieMode', id);
    });

    socket.on('attack', id => {
        let character = characters.find(character => character.id === id);
        if(character){
            character.immun -= config.attackForce;
            socket.broadcast.emit('character-attack', {id, immun: character.immun});
        }
    });

    socket.on('died', id => {
        socket.emit('character-exit', id);
        characters = characters.filter(character => character.id !== id);
    });

    socket.on('meat-added', meatData => {
        meats.push(meatData);
        socket.broadcast.emit('meat-added', meatData);
    });

    socket.on('meat-eaten', index => {
        let meat = meats[index];
        let character = characters.find(character => character.id === id);
        if(character){
            character.immun += meat?.healForce || 0;
            meats.splice(index, 1);
            socket.broadcast.emit('meat-eaten', {index, id});
        }
    });

    socket.on('potion-added', potionData => {
        potions.push(potionData);
        socket.broadcast.emit('potion-added', potionData);
    });

    socket.on('potion-eaten', index => {
        let potion = potions[index];
        let character = characters.find(character => character.id === id);
        if(character){
            character.speed = potion.speedForce;
            potions.splice(index, 1);
            socket.broadcast.emit('potion-eaten', {index, id});
        }
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('character-exit', id);
        characters = characters.filter(character => character.id !== id);
    });
});

server.listen(port, () => {
    console.log(`listening on http://localhost:${port}`);
});