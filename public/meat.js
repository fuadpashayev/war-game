class Meat {
    eaten = false;
    constructor(x, y, image){
        this.position = createVector(x, y);
        this.image = image;
        this.healForce = round(random(1, 4));
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