class Potion {
    eaten = false;
    constructor(x, y, image){
        this.position = createVector(x, y);
        this.image = image;
        this.speedForce = round(random(1.6, 4));
    }

    show() {
        if(!this.eaten){
            image(this.image, this.position.x, this.position.y, 50, 50);
        }
    }

    hide() {
        this.eaten = true;
    }
}