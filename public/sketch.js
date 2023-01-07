function setup() {
  mapBounds = {
    left: -5,
    right: windowWidth - 140,
    top: 195,
    bottom: 480
  }
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.addEventListener("contextmenu", (e) => e.preventDefault());
  menu();
}

function draw() {
  menuContainer.style('display', !gameStarted || (character && character.gameOver) ? 'flex' : 'none');
  background(51);
  image(assets.scene, 0, 0, width, height);

  if (gameStarted) {
    for (let i = 0; i < meats.length; i++) {
      let meat = meats[i];
      meat.show();
      let eating = character.checkEatingItem(meat);
      if (eating) {
        character.increaseImmun(meat.healForce);
        socket.emit('meat-eaten', i);
        meats.splice(i, 1);
      }
    }

    for (let i = 0; i < potions.length; i++) {
      let potion = potions[i];
      potion.show();
      let eating = character.checkEatingItem(potion);
      if (eating) {
        character.speed = potion.speedForce;
        socket.emit('potion-eaten', i);
        potions.splice(i, 1);
      }
    }

    for (let i = 0; i < characters.length; i++) {
      let otherCharacter = characters[i];
      if (!otherCharacter.gameOver) {
        otherCharacter.show();
        const attacking = character.checkAttacking(otherCharacter);
        if (attacking && !character.attackingOther) {
          character.attackingOther = true;
          otherCharacter.hurtingMode = true;
          otherCharacter.decreaseImmun(config.attackForce);
          socket.emit('attack', otherCharacter.id);

          setTimeout(() => {
            character.attackingOther = false
          }, 250);
        }
      }
    }
    character.show();
    if (!focused && character.directions.length > 0) {
      character.directions = [];
    }
  }
}


function keyPressed() {
  if (gameStarted) {
    let keyData = directionInfo[keyCode];
    if (keyData) {
      character.directions.push(keyData);
    }
  }
}

function keyReleased() {
  if (gameStarted) {
    let keyData = directionInfo[keyCode];
    if (keyData) {
      character.directions.splice(character.directions.indexOf(keyData), 1);
    }
  }
}

function mousePressed(e) {
  if (gameStarted) {
    if (mouseButton === 'left') {
      character.attackMode = true;
    } else e.preventDefault();
  }
}