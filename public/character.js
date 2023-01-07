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
    maxImmun = 100;

    mainDirection = 'right';
    directions = [];
    width = 150;
    height = 100;
    mapBounds = {
        left: -5,
        right: width - 140,
        top: 270,
        bottom: 665
    }

    constructor(x, y, assets, name, socket = null, id = '') {
        this.position = createVector(x, y);
        this.assets = assets;
        this.image = assets.character;
        this.name = name;
        this.socket = socket;
        this.id = id;
    }

    show() {
        image(this.image, this.position.x, this.position.y, 150, 100);
        if (this.died) {
            if (this.currentDisappearState >= this.assets.disappear.left.length - 0.5 && !this.gameOver) {
                this.gameOver = true
            }
            if (!this.gameOver) {
                this.currentDisappearState += 0.5;
                this.showImmun();
            }
            this.image = this.assets.disappear[this.mainDirection][floor(this.currentDisappearState)];
        } else {
            if (this.directions.length) this.prepareMove();
            if (this.hurtingMode) this.hurting();
            if (this.attackMode) this.attack();
            if (this.dieMode) this.die();
            this.showImmun();
            this.showName();
        }

    }

    showImmun() {
        push();
        strokeWeight(5);
        stroke(color('#fff'));
        line(this.position.x + 55, this.position.y + 5, this.position.x + 105, this.position.y + 5);
        if (this.immun > 0) {
            stroke(color('#43A047'));
            line(this.position.x + 55, this.position.y + 5, this.position.x + 55 + ((this.immun * 100) / this.maxImmun) / 2, this.position.y + 5);
        }
        pop();
    }

    showName() {
        let name = this.name;
        let nameWidth = textWidth(name);
        text(name, this.position.x + (150 - nameWidth) / 2, this.position.y + 105, this.position.x + nameWidth, this.position.y + 105);
        textAlign(LEFT);
        fill(color('#222'));
        textSize(9);
    }

    decreaseImmun(attackStrong) {
        const nextImmun = max(this.immun - attackStrong, 0);
        if (nextImmun <= 0){
            this.dieMode = true;
            this.socket.emit('dieMode', this.id);
        }
        this.immun = nextImmun;
    }

    increaseImmun(healStrong) {
        const nextImmun = this.immun + healStrong;
        this.immun = min(nextImmun, this.maxImmun);
    }

    checkCollision(other) {
        this.checkOverlapping(other);
        return false;
        return this.position.x < other.position.x + other.width && other.position.x < this.position.x + 65 &&
            this.position.y < other.position.y + other.height && other.position.y < this.position.y + 65;
    }

    checkEatingItem(item) {
        return this.position.x > item.position.x - 70 && this.position.x < item.position.x -30 &&
            this.position.y > item.position.y - 80 && this.position.y < item.position.y - 50;
    }

    prepareMove() {
        this.directions.forEach(direction => this.move(direction));
    }

    attack() {
        if (this.currentAttackState >= this.assets.attack.left.length - 0.5) {
            this.currentAttackState = -0.5;
            this.attackMode = false;
        }
        this.currentAttackState += 0.5;
        this.image = this.assets.attack[this.mainDirection][floor(this.currentAttackState)];
        const {position: {x, y}, mainDirection, currentAttackState} = this;
        this.socket.emit('attacking', {x, y, mainDirection, currentAttackState});
    }

    hurting() {
        if (this.currentHurtingState >= this.assets.hurt.left.length - 0.5) {
            this.currentHurtingState = -0.5;
            this.hurtingMode = false;
        }
        this.currentHurtingState += 0.5;
        this.image = this.assets.hurt[this.mainDirection][floor(this.currentHurtingState)];
    }

    die() {
        if (this.currentDieState >= this.assets.die.left.length - 0.5) {
            this.died = true;
        } else this.currentDieState += 0.5;
        this.image = this.assets.die[this.mainDirection][floor(this.currentDieState)];
    }

    checkAttacking(other) {
        return this.checkCollision(other) && this.currentAttackState > 8 && this.currentAttackState < 12;
    }

    checkOverlapping(other) {
        const distance = p5.Vector.dist(this.position, other.position);
        if (distance <= 36) {
            this.overlappingWith = other;
        }
    }

    constrain() {
        if (this.position.x < this.mapBounds.left) this.position.x = this.mapBounds.left;
        if (this.position.x > this.mapBounds.right) this.position.x = this.mapBounds.right;
        if (this.position.y < this.mapBounds.top) this.position.y = this.mapBounds.top;
        if (this.position.y > this.mapBounds.bottom) this.position.y = this.mapBounds.bottom;
    }

    calculateNextPositionOverlapping(axis, value) {
        if (!this.overlappingWith) return 100;
        let newPosition = createVector(this.position.x, this.position.y);
        newPosition[axis] += value * 1.5;
        return p5.Vector.dist(newPosition, this.overlappingWith.position);
    }

    move(direction) {
        let nextActionDistance = 100;
        const distance = this.overlappingWith && !this.overlappingWith.gameOver ? p5.Vector.dist(this.position, this.overlappingWith.position) : 100;
        switch (direction) {
            case 'top':
                nextActionDistance = this.calculateNextPositionOverlapping('y', -3.5)
                if (distance > 36 || nextActionDistance > 36) {
                    this.position.y -= 1.5 * this.speed;
                }
                break;
            case 'right':
                nextActionDistance = this.calculateNextPositionOverlapping('x', 1.5)
                if (distance > 36 || nextActionDistance > 35) {
                    this.position.x += 1.5 * this.speed;
                }
                this.mainDirection = 'right';
                break;
            case 'left':
                nextActionDistance = this.calculateNextPositionOverlapping('x', -1.5)
                if (distance > 36 || nextActionDistance > 35) {
                    this.position.x -= 1.5 * this.speed;
                }
                this.mainDirection = 'left';
                break;
            case 'bottom':
                nextActionDistance = this.calculateNextPositionOverlapping('y', 1.5)
                if (distance > 36 || nextActionDistance > 34) {
                    this.position.y += 1.5 * this.speed;
                }
                break;
        }
        if (this.currentWalkState >= this.assets.walk.left.length - 0.5) this.currentWalkState = -0.5;
        this.constrain();
        this.currentWalkState += 0.5;
        this.image = this.assets.walk[this.mainDirection][floor(this.currentWalkState)];
        const {position: {x, y}, mainDirection, currentWalkState} = this;
        this.socket.emit('moving', {x, y, mainDirection, currentWalkState});
    }
}