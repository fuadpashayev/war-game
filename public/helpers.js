const KEY_D = 68;
const KEY_W = 87;
const KEY_A = 65;
const KEY_S = 83;

let directionInfo = {
    [KEY_D]: 'right',
    [KEY_W]: 'top',
    [KEY_A]: 'left',
    [KEY_S]: 'bottom',
}

let socket;
let gameStarted = false;
let scene;
let character, characters = [];
let meats = [];
let potions = [];
let config = {};

let mapBounds;

const assets = {
    scene: null,
    character: null,
    walk: { left: [], right: [] },
    disappear: { left: [], right: [] },
    hurt: { left: [], right: [] },
    attack: { left: [], right: [] },
    meats: [],
    potions: [],
    die: { left: [], right: [] },
};

function menu() {
    menuContainer = createDiv();
    menuContainer.addClass('menu');

    input = createInput();
    input.attribute('placeholder', 'Enter name...')
    input.addClass('player-name');
    input.parent(menuContainer);

    button = createButton('Start');
    button.addClass('start');
    button.mousePressed(() => {
        let name = input.value();
        if (name.trim().length > 0) {
            let [x, y] = [random(-5, windowWidth - 140), random(187, 478)];
            socket = io.connect();
            character = new Character(x, y, assets, name, socket);
            gameStarted = true;
            socket.emit('start', { x, y, name }, (currentCharacters, currentMeats, gameConfig) => {
                characters = [...new Set(currentCharacters.map(currentCharacter => {
                    let { x, y, name, id } = currentCharacter;
                    return new Character(x, y, assets, name, socket, id);
                }))];
                meats = [...new Set(currentMeats.map(currentMeat => {
                    let { x, y, imageIndex } = currentMeat;
                    let meatImage = assets.meats[imageIndex];
                    return new Meat(x, y, meatImage);
                }))];
                config = gameConfig;
            });
            socketListeners();
            setInterval(spawnMeat, 15000);
            setInterval(spawnPotion, 15000);
        }
    })
    button.parent(menuContainer);
}

function socketListeners() {
    socket.on('character-spawn', ({ x, y, name, id }) => {
        let newCharacter = new Character(x, y, assets, name, socket, id);
        const isCharacterExist = characters.find(character => character.id === id);
        if (!isCharacterExist) {
            characters.push(newCharacter);
        }
    });

    socket.on('character-exit', id => {
        if (id === socket.id) {
            socket.removeAllListeners();
        }
        characters = characters.filter(character => character.id !== id);
    });

    socket.on('character-moving', ({ id, x, y, mainDirection, currentWalkState }) => {
        let movingCharacter = characters.find(character => character.id === id) || character;
        if (movingCharacter) {
            movingCharacter.position.x = x;
            movingCharacter.position.y = y;
            movingCharacter.mainDirection = mainDirection;
            movingCharacter.image = assets.walk[mainDirection][floor(currentWalkState)];
        }
    });

    socket.on('character-attacking', ({ id, x, y, mainDirection, currentAttackState }) => {
        let movingCharacter = characters.find(character => character.id === id) || character;
        if (movingCharacter) {
            movingCharacter.position.x = x;
            movingCharacter.position.y = y;
            movingCharacter.mainDirection = mainDirection;
            movingCharacter.image = assets.attack[mainDirection][floor(currentAttackState)];
        }
    });

    socket.on('character-dieMode', (id) => {
        let diedCharacter = characters.find(character => character.id === id) || character;
        diedCharacter.dieMode = true;
        setTimeout(() => {
            socket.emit('died', id);
        }, 1500);
    });

    socket.on('character-attack', ({ id, immun }) => {
        let attackedCharacter = characters.find(character => character.id === id) || character;
        attackedCharacter.immun = immun;
        attackedCharacter.hurtingMode = true;
    });

    socket.on('meat-added', ({ x, y, imageIndex }) => {
        let meatImage = assets.meats[imageIndex];
        let meat = new Meat(x, y, meatImage);
        meats.push(meat);
    });

    socket.on('meat-eaten', ({index, id}) => {
        let character = characters.find(character => character.id === id);
        let meat = meats[index];
        if(character){
            character.immun += meat.healForce;
            meats.splice(index, 1);
        }
    });

    socket.on('potion-added', ({ x, y, imageIndex }) => {
        let potionImage = assets.meats[imageIndex];
        let potion = new Potion(x, y, potionImage);
        meats.push(potion);
    });

    socket.on('potion-eaten', ({index, id}) => {
        let character = characters.find(character => character.id === id);
        let potion = potions[index];
        if(character){
            character.speed = potion.speedForce;
            potions.splice(index, 1);
        }
    });
}

function preload() {
    assets.scene = loadImage('assets/ground/ground_1.png');
    assets.character = loadImage('assets/character/character_1.png');

    for (let i = 1; i < 19; i++) {
        assets.walk.left.push(loadImage(`assets/character/walking/left/walk${i}.png`));
        assets.walk.right.push(loadImage(`assets/character/walking/right/walk${i}.png`));
        if (i <= 11) {
            assets.disappear.left.push(loadImage(`assets/character/disappearing/left/disappear${i}.png`));
            assets.disappear.right.push(loadImage(`assets/character/disappearing/right/disappear${i}.png`));
        }
        if (i <= 12) {
            assets.hurt.left.push(loadImage(`assets/character/hurting/left/hurt${i}.png`));
            assets.hurt.right.push(loadImage(`assets/character/hurting/right/hurt${i}.png`));
        }
        if (i <= 12) {
            assets.attack.left.push(loadImage(`assets/character/attacking/left/attack${i}.png`));
            assets.attack.right.push(loadImage(`assets/character/attacking/right/attack${i}.png`));
        }
        if (i <= 12) {
            assets.meats.push(loadImage(`assets/meats/meat${i}.png`));
        }
        if (i <= 5) {
            assets.potions.push(loadImage(`assets/potions/potion${i}.png`));
        }
        if (i <= 15) {
            assets.die.left.push(loadImage(`assets/character/dying/left/die${i}.png`));
            assets.die.right.push(loadImage(`assets/character/dying/right/die${i}.png`));
        }
    }
}

function spawnMeat() {
    let { left, right, top, bottom } = mapBounds;
    let [x, y] = [random(left + 30, right - 30), random(top + 65, bottom - 30)];
    let imageIndex = floor(random(0, assets.meats.length - 1));
    let image = assets.meats[imageIndex];
    const meat = new Meat(x, y, image);
    meats.push(meat);
    socket.emit('meat-added', { x, y, imageIndex, healForce: meat.healForce });
}

function spawnPotion() {
    let { left, right, top, bottom } = mapBounds;
    let [x, y] = [random(left + 30, right - 30), random(top + 65, bottom - 30)];
    let imageIndex = floor(random(0, assets.potions.length - 1));
    let image = assets.potions[imageIndex];
    const potion = new Potion(x, y, image);
    potions.push(potion);
    socket.emit('potion-added', { x, y, imageIndex, speedForce: potion.speedForce });
}