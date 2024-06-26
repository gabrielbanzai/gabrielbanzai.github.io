/* vars 
- canvas : tela
- ctx : context
- HEIGHT
- WIDTH
- frames : taxa de quadros
*/
var canvas, ctx, HEIGHT, WIDTH, GAME_STATE, hightscores, tile, obstacleHeight,

maxJumps = 3, 
speedBase = 8,
gravity = 1.567,
jumpStrength = 27,
startLifes = 5,
currentPhase = 0,
// jumpStrength: 23.6,

phasePointsEvolution = [15, 30, 50, 80, 120, 150, 190, 250, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 3500],

//Texto de "Nova fase" aparece quando se passa de fase
newPhaseLabel = {
    text: "",
    opacity: 0.0,
    fadeIn: function(dt){
        var fadeInId = setInterval(function() {
            if(newPhaseLabel.opacity < 1.0){
                newPhaseLabel.opacity += 0.01;
            }else{
                clearInterval(fadeInId);
            }
        }, 10 * dt);
    },
    fadeOut: function(dt){
        var fadeOutId = setInterval(function() {
            if(newPhaseLabel.opacity > 0.0){
                newPhaseLabel.opacity -= 0.01;
            }else{
                clearInterval(fadeOutId);
            }
        }, 10 * dt);
    }
},

//Estados do jogo, para preparação de telas e transição de cenários
game_states = {
    play: 0,
    playing: 1,
    loose: 2
},

//Entidade do chão da fase
ground = {
    y: 550,
    x: 0,
    height: 50,
    update: function(){
        this.x -= speedBase;
        if(this.x <= -36.3){
            this.x += 36.3;
        }
    },
    draw: function () {
        spriteGround.draw(this.x, this.y);
        spriteGround.draw(this.x + spriteGround.width, this.y);
    }
},                

//Player
player = {
    x: 50,
    y: 0,
    height: spritePlayer.height,
    width: spritePlayer.width,
    gravity: gravity,
    jumpStrength: jumpStrength,
    lifes: startLifes,
    speed: 0,
    maxJumps: 0,
    score: 0,
    rotation: 0,
    colliding: false,
    update: function () {
        this.speed += this.gravity;
        this.y += this.speed;
        this.rotation += Math.PI / 180 * speedBase;

        if (this.y > ground.y - this.height && GAME_STATE != game_states.loose) {
            this.y = ground.y - this.height;
            this.maxJumps = 0;
            this.speed = 0;
        }
    },
    jump: function (sound = true) {
        if (this.maxJumps < maxJumps) {
            this.speed = -this.jumpStrength;
            this.maxJumps++;

            //--------------------------------------------
            if(sound){
                playSound('sounds/jump.mp3', 0.182)
            }
            //--------------------------------------------

        }
    },
    reset: function () {
        this.speed = 0;
        this.y = 0;

        if (this.score > hightscores) {
            localStorage.setItem("hightscores", this.score);
            hightscores = this.score;
        }

        this.lifes = startLifes;
        this.score = 0;

        speedBase = 8;
        this.gravity = 1.567;
        currentPhase = 0;
    },
    draw: function () {
        
        ctx.save();

        var sprite;

        if(currentPhase <= 4){
            sprite = spritePlayer;
        }else{
            ctx.shadowColor = 'yellow'
            ctx.shadowBlur = 50
            sprite = spritePlayerBoosted;                            
        }

        if(this.colliding == true){
            sprite = spritePlayerHit;
        }
        
        //Operações para Rotacionar
        ctx.translate(this.x + sprite.width/2, this.y + sprite.height/2);
        ctx.rotate(this.rotation);
        
        sprite.draw(-sprite.width/2, -sprite.height/2);                        
        ctx.restore();


        // // Desenha a bolinha no canvas
        // ctx.beginPath();
        // //Ponto alto frente
        // ctx.arc((this.x + this.width), this.y, 5, 0, 2 * Math.PI);
        // //Ponto baixo frente
        // ctx.arc((this.x + this.width), this.y + this.height, 5, 0, 2 * Math.PI);
        // //Ponto alto traseiro
        // ctx.arc((this.x), this.y, 5, 0, 2 * Math.PI);
        // //Ponto baixo traseiro
        // ctx.arc((this.x), this.y + this.height, 5, 0, 2 * Math.PI);
        // ctx.fillStyle = "red"; // Cor de preenchimento da bolinha
        // ctx.fill();
        // ctx.closePath();
    },
    collided: function () {
        player.colliding = true;

        setTimeout(function(){
            player.colliding = false;
        }, 500);

        playSound('sounds/hit.mp3', 0.3)

        if(player.lifes >=1){
            player.lifes--;
        }else{
            GAME_STATE = game_states.loose;
            sounds.music.pause()
            playSound('sounds/loose.mp3', 0.5)
        }
    },
    scored: function (entity, qtdePT = 1) {
        entity._scored = true
        this.score+=qtdePT;
        let phasePoints = findCurrentPhase(this.score)

        if(currentPhase != phasePoints){
            passOfPhase();
        }
    },
    upLife: function (life) {
        if(!life._scored){
            playSound('sounds/took_life.mp3', 0.3)
            player.lifes++
        }
    }
},

//Obstáculos
obstacles = {
    _obs: [],
    _scored: false,
    _sprites: [
        spriteObstacle1,
        spriteObstacle2,
        spriteObstacle3,
        spriteObstacle4,
        spriteObstacle5,
        spriteObstacle6,
        spriteObstacle7
    ],
    insertionTime: 0,
    insert: function () {

        if(currentPhase <= 4){
            obstacleHeight = 100;
        }else if (obstacleHeight > 4){
            obstacleHeight = 260;
        }

        this._obs.push({
            x: WIDTH, 
            y: ground.y - Math.floor(20 + Math.random() * obstacleHeight),                           
            width: 50,
            sprite: this._sprites[Math.floor(this._sprites.length * Math.random())]
        });

        this.insertionTime = 30 + Math.floor(60 * Math.random());
    },
    update: function () {

        if (this.insertionTime == 0) {
            this.insert();
        } else {
            this.insertionTime--;
        }

        for (var i = 0, tam = this._obs.length; i < tam; i++) {
            var obs = this._obs[i];

            obs.x -= speedBase;
            if (
                !player.colliding
                && player.x < obs.x + obs.width
                && player.x + player.width >= obs.x
                && player.y + player.height >= obs.y
            ) {
                player.collided()
            } else if (obs.x <= 0 && !obs._scored) {
                player.scored(obs)
            } else if (obs.x <= -obs.width) {
                this._obs.splice(i, 1);
                tam--;
                i--;
            }
        }
    },
    reset: function () {
        this._obs = [];
    },
    draw: function () {
        for (var i = 0, tam = this._obs.length; i < tam; i++) {
            var obs = this._obs[i];
            obs.sprite.draw(obs.x, obs.y);
        }
    }
},

//Voadores
flying = {
    _fly: [],
    _sprites: [
        spriteFlying1,
        spriteFlying2,
        spriteFlying3,
        spriteFlying4,
        spriteFlying5,
    ],
    _brokenSprites: [
        spriteFlying1Damaged,
        spriteFlying2Damaged,
        spriteFlying3Damaged,
        spriteFlying4Damaged,
        spriteFlying5Damaged,
    ],
    _scored: false,
    insertionTime: 0,
    insert: function () {

        const index = Math.floor(this._sprites.length * Math.random())
        const sprite = this._sprites[index]

        this._fly.push({
            x: WIDTH, 
            y: ground.y - Math.floor(250 + Math.random() * 200),                           
            width: sprite.width,
            height: sprite.height,
            sprite,
            index
        });

        this.insertionTime = 30 + Math.floor(800 * Math.random());
    },
    update: function () {

        if (this.insertionTime == 0) {
            this.insert();

            //--------------------------------------------
            playSound('sounds/plane.mp3', 0.32)
            //--------------------------------------------

        } else {
            this.insertionTime--;
        }

        for (var i = 0, tam = this._fly.length; i < tam; i++) {
            var fly = this._fly[i];
            fly.x -= speedBase;

            // Verificar colisão com o voador
            if (
            !player.colliding
            && fly.x > -100
            && player.x + player.width >= fly.x 
            && player.x <= fly.x
            && player.y + (player.height/2) >= fly.y 
            && player.y <= fly.y + fly.height) {
                // Colisão na frente do fly
                //console.log(`Colidiu com voador ${i}`)
                if(currentPhase < 5){
                    player.collided()
                }
                if(!player.colliding){
                    this.destroy(fly)
                }
                
            }


            if (!player.colliding 
            && player.x + player.width >= fly.x 
            && player.x <= fly.x + fly.width 
            && player.y <= fly.y 
            && player.y + player.height >= fly.y) {
              
                if(!fly._scored){
                    player.scored(fly, 5)
                }
                this.destroy(fly)

            }

            if (fly._scored && fly.x <= -100) {
                this._fly.splice(i, 1);
                tam--;
                i--;
            }
        }
    },
    reset: function () {
        this._fly = [];
    },
    draw: function () {
        for (var i = 0, tam = this._fly.length; i < tam; i++) {
            var fly = this._fly[i];
            fly.sprite.draw(fly.x, fly.y);
        }
    },
    destroy: function (fly) {

        playSound('sounds/explosion.mp3', 0.17)

        let sprite =  this._brokenSprites[fly.index]

        player.jump(false)
        player.maxJumps = 0
        fly.sprite = sprite
        fly.speed++

        setInterval(() => {
            if(fly.y <= 500){
                fly.y++
            }
        }, 1)  
    }
},

//Item de Vida
life = {
    _lifes: [],
    sprite: spriteLife1,
    _scored: false,
    insertionTime: 9,
    insert: function () {
        this._lifes.push({
            x: WIDTH, 
            y: ground.y - Math.floor(250 + Math.random() * 200),                           
            width: spriteLife1.width,
            height: spriteLife1.height,
            sprite: this.sprite
        });

        this.insertionTime = 500 + Math.floor(800 * Math.random());
    },
    update: function () {

        if (this.insertionTime == 0) {
            this.insert();

            //--------------------------------------------
            playSound('sounds/life_spawn.mp3', 0.32)
            //--------------------------------------------

        } else {
            this.insertionTime--;
        }

        for (var i = 0, tam = this._lifes.length; i < tam; i++) {
            var life = this._lifes[i];
            life.x -= speedBase;

            if (
                (player.x + player.width) > life.x
                && (player.x + player.width) < (life.x + life.width)
                && (player.y + player.height) > life.y
                && (player.y + player.height) < (life.y + life.height)
            ) {
                // Ganha Vida
                player.upLife(life)
                life._scored = true

                life.sprite = spriteLife2

                setTimeout(() => {
                    life.sprite = spriteLife3
                }, 100);
                setTimeout(() => {
                    life.sprite = spriteLife4
                }, 200);
                setTimeout(() => {
                    life.sprite = spriteLife5
                }, 300);

                setTimeout(() => {
                    this._lifes.splice(i, 1);
                    tam--;
                    i--;
                }, 400);
            }


            if (life.x <= -100) {
                this._lifes.splice(i, 1);
                tam--;
                i--;
            }
        }
    },
    reset: function () {
        this._lifes = [];
    },
    draw: function () {
        for (var i = 0, tam = this._lifes.length; i < tam; i++) {
            var life = this._lifes[i];
            life.sprite.draw(life.x, life.y);
        }
    },
}

//Arquivos de Som
sounds = {
    lobby: new Audio('sounds/lobby.mp3'),
    start_game: new Audio('sounds/start_game.mp3'),
    music: new Audio('sounds/music.mp3'),
    phase_advanced: new Audio('sounds/phase_advanced.mp3'),
    jump: new Audio('sounds/jump.mp3'),
    explosion: new Audio('sounds/explosion.mp3'),
    loose: new Audio('sounds/loose.mp3'),
    hit: new Audio('sounds/hit.mp3'),
    plane: new Audio('sounds/plane.mp3'),
    life_spawn: new Audio('sounds/life_spawn.mp3'),
    took_life: new Audio('sounds/took_life.mp3'),
}

function main(){
    loadGame()
}

function loadGame(){
    
    //--------------------------------------------
    sounds.lobby.volume = 0.1
    sounds.lobby.play()
    //--------------------------------------------

    //localStorage.removeItem("hightscores");

    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    if (WIDTH >= 500) {
        WIDTH = 800;
        HEIGHT = 600;
    }

    canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.border = "1px solid";
    canvas.style.borderRadius = "5px";

    ctx = canvas.getContext("2d");

    document.body.appendChild(canvas);
    document.addEventListener("mousedown", click);

    GAME_STATE = game_states.play;
    hightscores = localStorage.getItem("hightscores");

    if (hightscores == null) {
        hightscores = 0;
    }

    tile = new Image();
    tile.src = "imgs/sheet.png";

    loop();
}

function loop() {

    update();
    draw();

    window.requestAnimationFrame(loop);
}

function update() {
    ground.update();
    player.update();

    if (GAME_STATE == game_states.playing) {
        obstacles.update();
        flying.update();
        life.update();
    } 
}

function draw() {

    bg.draw(0,0); 

    drawHudText(
        `Pontos: ${player.score}`, 
        25, 
        68
    )
    drawHudText(
        `Vidas: ${player.lifes}`, 
        580, 
        68
    )
    drawHudText(
        newPhaseLabel.text, 
        0, 
        0, 
        newPhaseLabel.opacity, 
        true, 
        '255, 238, 0',
        '84, 84, 84',
        '700 80px'
    )

    if(GAME_STATE == game_states.playing){
        obstacles.draw();
        flying.draw();
        life.draw();
    }

    if(GAME_STATE == game_states.play){
        spritePlay.draw(WIDTH / 2 - spritePlay.width/2, HEIGHT / 2 - spritePlay.height/2)
    }

    if(GAME_STATE == game_states.loose){
        spriteLoose.draw(WIDTH / 2 - spriteLoose.width/2, HEIGHT / 2 - spriteLoose.height/2 - spriteHighscore.height/2);
    
        drawHudText(player.score, 410, 310)
        
        if(player.score > parseInt(hightscores)){
            spriteHighscore.draw(WIDTH / 2 - spriteHighscore.width/2, HEIGHT / 2 + spriteLoose.height/2 - spriteHighscore.height/2-83);
            drawHudText(player.score, 360, 400)
        }
    }

    ground.draw();               
    player.draw();
}

function passOfPhase(phase = null){

    //--------------------------------------------
    playSound('sounds/phase_advanced.mp3', 0.5)
    //--------------------------------------------

    speedBase++;
    phase ? currentPhase = phase : currentPhase++;
    player.lifes++;

    if(currentPhase == 5){
        playSound('sounds/boost_player.mp3', 0.322)
        player.gravity *= 0.6;
    }

    newPhaseLabel.text = "Level " + currentPhase;
    newPhaseLabel.fadeIn(0.4);

    setTimeout(function() {
        newPhaseLabel.fadeOut(0.4);
    }, 800);
    
}

function click() {
    if (GAME_STATE == game_states.playing) {
        player.jump();
    } else if (GAME_STATE == game_states.play) {

        //--------------------------------------------
        sounds.lobby.pause()
        playSound('sounds/start_game.mp3', 0.4)
        sounds.music.volume = 0.23
        sounds.music.play()
        sounds.music.addEventListener('ended', () => {
            sounds.music.play();
        })
        //--------------------------------------------

        GAME_STATE = game_states.playing;
    } else if (GAME_STATE == game_states.loose && player.y >= 2 * HEIGHT) {

        //--------------------------------------------
        sounds.lobby.play()
        //--------------------------------------------

        GAME_STATE = game_states.play;
        obstacles.reset();
        player.reset();
    }
    
}

function playSound(path, volume = null){
    let sound = new Audio(path)

    if(volume > 0.0){
        sound.volume = volume
    }

    sound.play()
}

function drawHudText(
    text, 
    x, 
    y, 
    opacity = 1, 
    middle = false, 
    color = '241, 241, 241', 
    strokeColor = '84, 84, 84',
    fontSize = '600 50px'
){
    // Salvar o estado atual do context
    ctx.save();

    ctx.strokeStyle = `rgba(${strokeColor}, ${opacity})`;
    ctx.fillStyle = `rgba(${color}, ${opacity})`;
    ctx.font = `${fontSize} Arial`;
    ctx.lineWidth = 1;

    if(middle){
        ctx.fillText(text, canvas.width/2 - ctx.measureText(text).width/2, canvas.height/3);
        ctx.strokeText(text, canvas.width/2 - ctx.measureText(text).width/2, canvas.height/3);    
    }else{
        ctx.fillText(text, x, y);
        ctx.strokeText(text, x, y);
    }

    // Restaurar o estado do context
    ctx.restore();
}

function findCurrentPhase(pontos) {
    for (let i = 0; i < phasePointsEvolution.length; i++) {
      if (pontos < phasePointsEvolution[i]) {
        return i;
      }
    }
    // Se ultrapassar todos os limites, está na última fase
    return phasePointsEvolution.length;
}
  
window.onload = (event) => main()