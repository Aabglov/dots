// Globally accessible particles
// Dots courtesy of http://codeflow.org/entries/2010/aug/22/html5-canvas-and-the-flying-dots/
// I've significantly modified the code and styling, but the basic structure for drawing
// the dots is his

var particles = [];
var first_particle;
var canvas_width;
var canvas_height;
var canvas_diag; // Maximum width of canvas - diagnoal
// Noise in angle and magnitude
var angle_noise = 0.1;
var magnitude_noise = 0.1;
var styles = [];//['rgba(255,0,0,0.5)','rgba(0,255,0,0.5)','rgba(0,0,255,0.5)','rgba(255,255,0,0.5)'];

// Recurrent Neural Network
var learning_rate = 0.03;
var where_net;


function genRandom(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function genRandStyle(){
    return "rgba(" + String(genRandom(0,255)) + "," + String(genRandom(0,255)) + "," + String(genRandom(0,255)) + ",0.5)";
}

var Vector = function(x, y) {
    this.x = x;
    this.y = y;

    this.sub = function(other) {
        return new Vector(this.x - other.x, this.y - other.y);
    }
    this.isub = function(other) {
        this.x -= other.x;
        this.y -= other.y;
    }
    this.iadd = function(other) {
        this.x += other.x;
        this.y += other.y;
    }
    this.length = function() { // This is the magnitude of the acceleration/velocity vector
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    this.idiv = function(scalar) {
        this.x /= scalar;
        this.y /= scalar;
    }
    this.zero = function() {
        this.x = 0;
        this.y = 0;
    }
    this.validate = function() {
        if (isNaN(this.x + this.y)) {
            this.x = 0;
            this.y = 0;
        }
    }
    this.angle = function(){
      return Math.atan(this.y/this.x) % Math.PI/2; // Radians
    }
    this.noisy_angle = function(){
      return (Math.atan(this.y/this.x) + (angle_noise * Math.PI/2 * (Math.random() - 0.5))) % Math.PI/2;// Tangent has range from -pi/2 to pi/2
    }
    this.noisy_magnitude = function(){
      return Math.min(Math.sqrt(this.x * this.x + this.y * this.y) + (magnitude_noise * canvas_diag * (Math.random() -0.5)),canvas_diag); // Make sure magnitude isn't greater than canvas
    }
}
var Particle = function(canvas) {
    var initial_speed = 1;
    var speed_limit = 4;
    var bounce_damping = 0.5;
    this.acceleration = new Vector(0, 0);
    this.velocity = new Vector(Math.random() * initial_speed -
        initial_speed * 0.5, Math.random() * initial_speed -
        initial_speed * 0.5)
    this.position = new Vector(Math.random() * canvas.width, Math.random() * canvas.height)
    this.step = function() {
        // Train network
        // Normalize inputs
        where_net.activate([this.position.x/canvas_width,
                                        this.position.y/canvas_height,
                                        (this.velocity.noisy_angle() + Math.PI/2) / Math.PI,
                                        this.velocity.noisy_magnitude()/canvas_diag
                                      ]);

        this.acceleration.validate();
        this.velocity.iadd(this.acceleration);
        speed = this.velocity.length();
        if (speed > speed_limit) {
            this.velocity.idiv(speed / speed_limit);
        }
        this.position.iadd(this.velocity);
        this.acceleration.zero();
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x *= -bounce_damping;
        } else if (this.position.x > canvas.width) {
            this.position.x = canvas.width;
            this.velocity.x *= -bounce_damping;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y *= -bounce_damping;
        } else if (this.position.y > canvas.height) {
            this.position.y = canvas.height;
            this.velocity.y *= -bounce_damping;
        }
    }
    this.draw = function(context,style) {
        // Draw the point
        context.beginPath();
        context.arc(this.position.x, this.position.y, 5.0, 0, Math.PI * 2, false);
        context.fillStyle = style;

        // Draw noisy point
        //var noisy_x = this.velocity.noisy_magnitude() * Math.cos(this.velocity.noisy_angle()) + this.position.x;
        //var noisy_y = this.velocity.noisy_magnitude() * Math.sin(this.velocity.noisy_angle()) + this.position.y;
        [noisy_x,noisy_y] = where_net.activate([this.position.x/canvas_width,
                            this.position.y/canvas_height,
                            (this.velocity.noisy_angle() + Math.PI/2) / Math.PI,
                            this.velocity.noisy_magnitude()/canvas_diag
                          ]);
        //context.arc(noisy_x*canvas_width, noisy_y*canvas_height, 3.0, 0, Math.PI * 2, false);
          context.rect(noisy_x*canvas_width, noisy_y*canvas_height, 10.0, 10.0);
        context.fill();

        // Backpropagate Network
        where_net.propagate(learning_rate, [this.position.x/canvas_width,
                                            this.position.y/canvas_height
                                          ]);
    }
}
var System = function(amount, milliseconds) {
    var factor = 9;
    var min_proximity = 4;
    var canvas = document.getElementById('particles');
    canvas_width = canvas.width;
    canvas_height = canvas.height;
    canvas_diag = Math.sqrt(canvas.height * canvas.height + canvas.width * canvas.width);
    var context = canvas.getContext('2d');
    for (var i = 0; i < amount; i++) {
        particles.push(new Particle(canvas));
        first_particle = particles[0];
    }
    setInterval(function() {
        context.globalCompositeOperation = 'source-in';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'lighter';
        for (var i = 0; i < amount; i++) {
          // REMOVED GRAVITY - all particles now move randomly
            var a = particles[i];
            var rand_vector = new Vector(Math.random() * canvas.width, Math.random() * canvas.height)
            var vec = a.position.sub(rand_vector)
            var length = vec.length();
            vec.idiv(Math.pow(length, 3) / factor);
            a.acceleration.isub(vec);
            a.step();
            a.draw(context,styles[i])
        }
    }, milliseconds);
}
var main = function() {
    var num_dots = 10;
    var system = new System(num_dots, 40);
    for(var i = 0; i<num_dots;i++){
      styles.push(genRandStyle());
    }
    // Neural Network
    where_net = new Architect.Perceptron(4,30,2);
    // LSTM
    //where_net = new  Architect.LSTM(4,16,10,2);
};
