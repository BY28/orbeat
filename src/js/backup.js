/*
	NOTES 12-09-2017 - DONE -
	
		ADD STAR MOVING PARTICLES
		MOVE CODE TO OBJECTS.JS 
		REMOVE WALL ON HIT AND ADD PARTICLES
		TEST COLLISION WITH ALL OBJECTS
		ADD ANIMATIONS
		#1629

	NOTES 15-09-1017 - DONE -

		ADD OBJECTS VARIABLES INITIALISATIONS (lastSpawn, speed...)
		SPAWN LIFE? (NOT SURE, DEPENDS ON DIFFICULTY)
		ADD HTML 		<--
		ADD SCORE, LIFE <--
		ADJUST
		RESET AND LOOP

	NOTES 19-09-2017 - DONE -

		DOM INTERACTIONS/--> ANIMATIONS <--
		CHANGE MUSIC IMPLEMENTATION (DRAG&DROP?) <-- NO
		INTRODUCTION HEADER
		LIGHTS AMELIORATiONS?
		CHANGE TIME WITH AUDIO CURRENTTIME
		USE ANIMATE CSS FOR DOM ANIMATIONS? IONICONS/AWESOMEFONTS? OWL SLIDER? <<<
		TRY TO USE CREATEJS <<<
		PERFORMANCE FIX (LIMIT WALL NUMBER?)
		ADD JOYSTICK FOR MOBILE

		BEGIN SPEED AT 1 ?
*/


// _GAME //

Game = function()
{
	this.scene, this.camera, this.renderer, this.container;
}

	/*
	 	_VARIABLES
	*/

Game.prototype.initVariables = function()
{
	this.status = 'waiting';

	this.WIDTH = window.innerWidth;
	this.HEIGHT = window.innerHeight;
	this.fieldOfView = 75;
	this.aspectRatio = this.WIDTH/this.HEIGHT;
	this.nearPlane = 0.1;
	this.farPlane = 500;
	
	/*Physijs.scripts.worker = 'src/js/physics/physijs_worker.js';
	Physijs.scripts.ammo = 'ammo.js';*/
	
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(this.fieldOfView, this.aspectRatio, this.nearPlane, this.farPlane);
	this.renderer = new THREE.WebGLRenderer();
	this.container = document.getElementById('webglContainer');

	//this.scene.setGravity(new THREE.Vector3(0, 0, 0));
	this.camera.position.z = 15;
	this.renderer.setSize(this.WIDTH, this.HEIGHT);
	this.renderer.setPixelRatio(window.devicePixelRatio);
	this.renderer.setClearColor(0x3498db);
	this.renderer.shadowMap.enabled = true;
	this.container.appendChild(this.renderer.domElement);

	this.gAudio = new GameAudio();
	this.gAudio.setUp();

	this.gColor = new GameColor();
	this.gColor.setUp();

	this.gScore = new GameScore(this.gAudio);

	this.gDOM = new GameDOM(this);

	this.keyboard = new THREEx.KeyboardState();

	this.joystick	= new VirtualJoystick({
				container	: document.getElementById('joystickContainer'),
				mouseSupport	: true,
			});

	if(!isMobile.any())
	{
		this.joystick.removeEvents();
	}

	this.speedLastUpdate = 0;

	this.postprocessing();
	this.lights();
}

Game.prototype.resetVariables = function()
{

	/* REMOVE REMAINING OBJECTS */

	if(this.wallsHolder.wallsInUse.length)
	{
		for(var i=0; i<this.wallsHolder.wallsInUse.length; i++)
		{
			var wall = this.wallsHolder.wallsInUse[i];
			this.wallsHolder.wallsPool.unshift(this.wallsHolder.wallsInUse.splice(i, 1)[0]);
			this.wallsHolder.wallsList.splice(i, 1);
			this.wallsHolder.mesh.remove(wall.mesh);
			i--;
		}
	}

	if(this.portalsHolder.portalsInUse.length)
	{
		for(var i=0; i<this.portalsHolder.portalsInUse.length; i++)
		{
			var portal = this.portalsHolder.portalsInUse[i];
			this.portalsHolder.portalsInUse.splice(i, 1);
			this.portalsHolder.portalsList.splice(i, 1);
			this.portalsHolder.mesh.remove(portal.mesh);
			i--;
		}
	}
	
	if(this.cometsHolder.cometsInUse.length)
	{
		for(var i=0; i<this.cometsHolder.cometsInUse.length; i++)
		{
			var comet = this.cometsHolder.cometsInUse[i];
			this.cometsHolder.cometsPool.unshift(this.cometsHolder.cometsInUse.splice(i, 1)[0]);
			this.cometsHolder.cometsList.splice(i, 1);
			this.cometsHolder.mesh.remove(comet.mesh);
			i--;
		}
	}

	/* GLOBAL */

	this.speedLastUpdate = 0;
	
	/* WALLS */

	this.wallsHolder.speed = 0.5;
	

	/* PORTALS */

	this.portalsHolder.portalLastSpawn = 0;
	this.portalsHolder.speed = 0.2;

	/* COMETS */

	this.cometsHolder.cometLastSpawn = 0;
	this.cometsHolder.speed = 0.3;

	/* PARTICLES */

	this.particlesHolder.speed = 0.5;

	/* SCORE */

	this.gScore.portalScore = 0;
	this.gScore.cometScore = 0;
	this.gScore.wallScore = 0;
	this.gScore.score = 0;

	/* DOM */

	this.gDOM.score.points.innerHTML = 0;
}

	/*
		_FUNCTIONS
	*/

Game.prototype.wait = function()
{
	// Wait for start/restart
	if(isMobile.any())
	{	
		this.joystick.removeEvents();
	}
	this.gDOM.introEvent();
	this.particlesHolder.update();
	this.starsHolder.update(this.joystick);

	this.planetHolder.planet.mesh.rotation.y += 0.0005;
	this.planetHolder.planet.mesh.rotation.z += 0.005;

	this.planetHolder.atmosphere.mesh.rotation.x += 0.0005;
	this.planetHolder.atmosphere.mesh.rotation.y += 0.0005;

	this.planetHolder.rotateSatellites();
	this.planetHolder.moveFragments();
	this.cometsHolder.update();

	TweenMax.to(this.camera.position, 3, {y: -10});
	TweenMax.to(this.camera.rotation, 3, {x: 25*Math.PI/180});
}

Game.prototype.start = function()
{
	if(isMobile.any())
	{		
		this.joystick.addEvents();
	}
	
	this.gDOM.gameContainer.style.cursor = 'none';
	// Begin game
	TweenMax.to(this.camera.position, 3, {y: 0});
	TweenMax.to(this.camera.rotation, 3, {x: 0});
	

	this.gAudio.audio.play();

	this.status = 'playing';
}

Game.prototype.initStart = function()
{
	// Reset variables
	var _this = this;	

	this.gAudio.audio.currentTime = 0;
	this.resetVariables();

	this.scene.add(this.starsHolder.starsInUse[0].mesh);
	TweenMax.to(this.starsHolder.starsInUse[0].mesh.scale, 0.2, {x: 0.1, y: 0.1, z: 0.1, onComplete: function(){TweenMax.to(_this.starsHolder.starsInUse[0].mesh.scale, 0.2, {x: 1, y: 1, z: 1});}});

	this.status = 'start';
}

Game.prototype.end = function()
{

	if(this.wallsHolder.wallsInUse.length || this.portalsHolder.portalsInUse.length || this.cometsHolder.cometsInUse.length)
	{
		this.wallsHolder.update();
		this.gCollision.update(this.renderer, this.planetHolder, this.gColor, this.blurPass);
		this.particlesHolder.update();
		this.planetHolder.atmosphere.move(this.gAudio);
		this.planetHolder.planet.move(this.gAudio);

		this.planetHolder.planet.mesh.rotation.y += 0.0005;
		this.planetHolder.planet.mesh.rotation.z += 0.005;

		this.planetHolder.atmosphere.mesh.rotation.x += 0.0005;
		this.planetHolder.atmosphere.mesh.rotation.y += 0.0005;

		this.planetHolder.rotateSatellites();
		this.planetHolder.moveFragments();
		this.cometsHolder.update();
		//this.spaceship.move(mousePos);
		this.starsHolder.update(this.joystick);
		this.portalsHolder.update();
	}
	else
	{
		var _this = this;
		TweenMax.to(this.starsHolder.starsInUse[0].mesh.scale, 0.2, {x: 2, y: 2, z: 2, onComplete: function(){
																												TweenMax.to(_this.starsHolder.starsInUse[0].mesh.scale, 0.2, {x: 0.1, y: 0.1, z: 0.1, onComplete: function(){
																																																								_this.scene.remove(_this.starsHolder.starsInUse[0].mesh);
																																																							}});
																											}});
		this.particlesHolder.speed = 0.1;
		this.gDOM.endEvent();
		this.status = 'waiting';
	}
}

Game.prototype.pause = function()
{
	// Pause animation, show controls stop update, glitch postprocessing?
	if(isMobile.any())
	{
		this.joystick.removeEvents();
	}

	TweenMax.to(this.camera.position, 3, {y: -10});
	TweenMax.to(this.camera.rotation, 3, {x: 25*Math.PI/180});

	this.gAudio.audio.pause();

	this.gDOM.pauseEvent();

	this.status = 'paused';
}

Game.prototype.update = function()
{
	/*this.newTime = new Date().getTime();
	this.deltaTime = this.newTime-this.oldTime;
	this.oldTime = this.newTime;*/

	//this.scene.simulate();
	
	//console.log(this.gAudio.audio.duration);
	//console.log(this.gAudio.audio.currentTime);
	this.gCollision.update(this.renderer, this.planetHolder, this.gColor, this.blurPass);
	this.gAudio.update();
	this.gScore.update();
	this.particlesHolder.update();
	this.wallsHolder.update();

	this.planetHolder.atmosphere.move(this.gAudio);
	this.planetHolder.planet.move(this.gAudio);

	this.planetHolder.planet.mesh.rotation.y += 0.0005;
	this.planetHolder.planet.mesh.rotation.z += 0.005;

	this.planetHolder.atmosphere.mesh.rotation.x += 0.0005;
	this.planetHolder.atmosphere.mesh.rotation.y += 0.0005;

	this.planetHolder.rotateSatellites();
	this.planetHolder.moveFragments();
	this.cometsHolder.update();
	//this.spaceship.move(mousePos);
	this.starsHolder.update(this.joystick);
	this.portalsHolder.update();
	

	if(this.gAudio.check(this.wallsHolder))
	{
		this.wallsHolder.spawnWalls();
	}
	


	if(Math.floor(this.gAudio.audio.currentTime)%10 == 0 && !this.gAudio.audio.paused && Math.floor(this.gAudio.audio.currentTime) > this.portalsHolder.portalLastSpawn)
	{
		// initial speed 0.4 add 0.005 every seconds
		this.portalsHolder.spawnPortals(Math.floor(this.gAudio.audio.currentTime));

		/*var _this = this;

		TweenMax.to(this.blurPass.params.delta, 0.25, {x: 50, onComplete: function(){
				TweenMax.to(_this.blurPass.params.delta, 0.25, {x:0});
			}});
		
		this.wallsHolder.resetColor(this.gColor);
		this.planetHolder.resetColor(this.gColor, this.cometsHolder, this.portalsHolder);

		this.starsHolder.resetColor(this.gColor, this.planetHolder.clearColor)

		this.renderer.setClearColor(this.wallsHolder.clearColor.replace('0x', '#'));*/
	}

	

	if(Math.floor(this.gAudio.audio.currentTime)%4 == 0 && !this.gAudio.audio.paused && Math.floor(this.gAudio.audio.currentTime) > this.cometsHolder.cometLastSpawn)
	{
		// spawn Comet every 8 seconds and do or add something...
		this.cometsHolder.spawnComets(Math.floor(this.gAudio.audio.currentTime));
	}

	
	if(Math.floor(this.gAudio.audio.currentTime)%15 == 0 && !this.gAudio.audio.paused && Math.floor(this.gAudio.audio.currentTime) > this.speedLastUpdate)
	{	
		this.speedLastUpdate = Math.floor(this.gAudio.audio.currentTime);
		
		var decimal = Math.round( ((Math.round((this.wallsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.wallsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.1 : 0.2;

		this.particlesHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

		var decimal = Math.round( ((Math.round((this.portalsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.portalsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

		var decimal = Math.round( ((Math.round((this.cometsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.cometsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

	}

	this.pointLight.position.copy(new THREE.Vector3(this.starsHolder.starsInUse[0].mesh.position.x*2, this.starsHolder.starsInUse[0].mesh.position.y + 5, 15));
	//this.directionalLight.position.copy(new THREE.Vector3(this.starsHolder.starsInUse[0].mesh.position.x*2, -50, 0));
	TweenMax.to(this.planetHolder.mesh.position, 0.5, {x: -this.starsHolder.starsInUse[0].mesh.position.x*0.2, y: 125-(this.starsHolder.starsInUse[0].mesh.position.y*0.2)});
	TweenMax.to(this.wallsHolder.mesh.position, 0.5, {x: -this.starsHolder.starsInUse[0].mesh.position.x*0.5, y: -(this.starsHolder.starsInUse[0].mesh.position.y*0.5)});
	TweenMax.to(this.cometsHolder.mesh.position, 0.5, {x: -this.starsHolder.starsInUse[0].mesh.position.x*0.2, y: -(this.starsHolder.starsInUse[0].mesh.position.y*0.2)});
	TweenMax.to(this.portalsHolder.mesh.position, 0.5, {x: -this.starsHolder.starsInUse[0].mesh.position.x*0.2, y: -(this.starsHolder.starsInUse[0].mesh.position.y*0.2)});
	TweenMax.to(this.particlesHolder.mesh.position, 0.5, {x: -this.starsHolder.starsInUse[0].mesh.position.x*0.5, y: -(this.starsHolder.starsInUse[0].mesh.position.y*0.5)});
	/*	USE TWEEN.JS
		var tween = new TWEEN.Tween( this.starsHolder.starsInUse[0].mesh.position )
						.to( {x: mousePos.x, y: mousePos.y} , 500 )
						.repeat( Infinity )
						.onUpdate( function() {
							console.log("works")
						})
						.start();
	*/
	this.gDOM.updateScore();
	
}

Game.prototype.render = function()
{
	this.composer.reset();
	this.composer.render( this.scene, this.camera );
	this.composer.pass( this.noisePass );
	this.composer.pass( this.blurPass );
	this.composer.pass( this.fxaaPass );
	this.composer.pass( this.vignettePass );
	this.composer.toScreen();
}

Game.prototype.createObjects = function()
{
	var colors = this.gColor.colors;

	this.addParticles();
	this.addWalls(colors);
	this.addPlanet(colors);
	this.addPortals(colors);
	this.addComets(colors);
	//this.addSpaceShip();
	this.addStars();
}

	/*
		_ADD OBJECTS
	*/

Game.prototype.addParticles = function()
{
	this.particlesHolder = new ParticlesHolder();

	this.particlesHolder.createParticles(0.4, true, 0.4, false, 0xffffff, true, 10, 50);
	this.particlesHolder.createParticles(0.2, true, 0.6, false, 0xffffff, true, 10, 50);

	this.scene.add(this.particlesHolder.mesh);
}

Game.prototype.addWalls = function(colors)
{
	this.wallsHolder = new WallsHolder();

	this.wallsHolder.clearColor = colors.blue.clear;
	this.wallsHolder.darkColor = colors.blue.dark;

	for(var i=0; i<10; i++)
	{
		var wall = new Wall(this.wallsHolder.clearColor, this.wallsHolder.darkColor);
		this.wallsHolder.wallsPool.push(wall);
	}

	this.gAudio.addObject(this.wallsHolder, 25, 150, 250);
	this.scene.add(this.wallsHolder.mesh);
}

Game.prototype.addPlanet = function(colors)
{
	this.planetHolder = new PlanetHolder();

	this.planetHolder.clearColor = colors.white.clear;
	this.planetHolder.darkColor = colors.white.dark;

	this.planetHolder.mesh.position.z = -175;
	this.planetHolder.mesh.position.y = 125;

	this.planetHolder.createPlanet();
	this.planetHolder.createSatellites();
	this.planetHolder.createFragments();

	this.gAudio.addObject(this.planetHolder.atmosphere, 4, 0, 250);
	this.gAudio.addObject(this.planetHolder.planet, 4, 0, 250);

	this.scene.add(this.planetHolder.mesh);
}

Game.prototype.addPortals = function(colors)
{
	this.portalsHolder = new PortalsHolder();

	this.portalsHolder.clearColor = colors.white.clear;
	this.portalsHolder.darkColor = colors.white.dark;

	this.scene.add(this.portalsHolder.mesh);
}

Game.prototype.addComets = function(colors)
{
	this.cometsHolder = new CometsHolder();

	this.cometsHolder.clearColor = colors.white.clear;
	this.cometsHolder.darkColor = colors.white.dark;

	for(var i=0; i<5; i++)
	{
		var comet = new Comet(this.cometsHolder.clearColor, this.cometsHolder.darkColor);
		this.cometsHolder.cometsPool.push(comet);
	}
	this.scene.add(this.cometsHolder.mesh);
}

Game.prototype.addSpaceShip = function()
{
	this.spaceship = new SpaceShip();
	this.scene.add(this.spaceship.mesh);
}

Game.prototype.addStars = function()
{
	this.starsHolder = new StarHolder();
	this.starsHolder.createStar();
	//this.starsHolder.createStar(true);
	this.scene.add(this.starsHolder.mesh);
}

Game.prototype.initCollisions = function()
{
	this.gCollision = new GameCollision(this);
}

	/*
		_POSTPROCESSING
	*/

Game.prototype.postprocessing = function()
{
	WAGNER.vertexShadersPath = 'src/js/postprocessing/vertex-shaders';
	WAGNER.fragmentShadersPath = 'src/js/postprocessing/fragment-shaders';

	this.composer = new WAGNER.Composer(this.renderer);
	this.composer.setSize(this.WIDTH, this.HEIGHT);


	this.noisePass = new WAGNER.NoisePass();
	this.noisePass.params.amount = 0.02;
	this.noisePass.params.speed = 0.4;

	this.blurPass = new WAGNER.BoxBlurPass();

	this.fxaaPass = new WAGNER.FXAAPass();

	this.vignettePass = new WAGNER.VignettePass();

	this.vignettePass.params.amount = 0.4;
	this.vignettePass.params.falloff = 0.2;
}


	/*
		_LIGHTS
	*/

Game.prototype.lights = function()
{
	this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	this.scene.add(this.ambientLight);

	this.pointLight = new THREE.PointLight(0xffffff, 0.6);
	this.pointLight.position.set(0, 0, 0);
	this.scene.add(this.pointLight);

	this.p = this.pointLight.clone();
	this.p.intensity = 0.2;

	this.p.position.set(0, -175, 0);
	this.scene.add(this.p)
}
	/*
	 	_HANDLE EVENTS 
	*/

Game.prototype.handleWindowResize = function(event)
{
	this.WIDTH = window.innerWidth;
	this.HEIGHT = window.innerHeight;
	this.aspectRatio = this.WIDTH/this.HEIGHT;

	this.renderer.setSize(this.WIDTH, this.HEIGHT);
	this.camera.aspect = this.aspectRatio;
	this.camera.updateProjectionMatrix();
}
var mousePos = {x:0, y:0}
function handleMouseMouve(event)
{
	mx = (event.clientX / window.innerWidth) * 2 - 1;
	my = - (event.clientY / window.innerHeight) * 2 + 1;

  	var vector = new THREE.Vector3(mx, my, 0.5);
	vector.unproject( game.camera );
	var dir = vector.sub( game.camera.position ).normalize();
	var distance = - game.camera.position.z / dir.z;
	var pos = game.camera.position.clone().add( dir.multiplyScalar( distance  ) );

	mousePos.x = pos.x;
	mousePos.y = pos.y;
}

// _EVENTS //

Game.prototype.addMultiListener = function (el, s, fn) {
  s.split(' ').forEach(e => el.addEventListener(e, fn, false));
}

window.addEventListener('load', init, false);

window.addEventListener('resize', function(){
	game.handleWindowResize();
});

window.addEventListener('click', function(){

	if(game.status == 'paused')
	{
			game.gDOM.pause.div.style.display = 'none';
			game.gDOM.gameContainer.style.opacity = 1;
			game.status = 'start';
	}
	else if(game.status == 'playing')
	{
		game.status = 'paused';
	}
		
	TweenMax.to(game.blurPass.params.delta, 0.25, {x: 50, onComplete: function(){
			TweenMax.to(game.blurPass.params.delta, 0.25, {x:0});
		}});

});

document.addEventListener('mousemove', handleMouseMouve, false);

// GAME OBJECTS //

	/*
		DOM
	*/

GameDOM = function(game)
{
	this.game = game;

	// DOM elements
	this.intro = {
		title: document.getElementById("title"),
		subtitle: document.getElementById("subtitle"),
		description: document.getElementById("description"),
		play: document.getElementById("play"), 
		div: document.getElementById("intro")
	};

	this.pause = {
		resume: document.getElementById("resume"),
		replay: document.getElementById("reset"),
		change: document.getElementById("changeMusic"),
		div: document.getElementById("pause")
	};

	this.scores = {
		portals: document.getElementById("portalPoints"),
		comets: document.getElementById("cometPoints"),
		walls: document.getElementById("wallPoints"),
		total: document.getElementById("scorePoints"),
		change: document.getElementById("change"),
		replay: document.getElementById("replay"),
		div: document.getElementById("scores")
	};

	this.score = {
		points: document.getElementById("points"),
		text: document.getElementById("text"),
		div: document.getElementById("score")
	}

	this.gameContainer = document.getElementById("gameContainer");
}

GameDOM.prototype.updateScore = function()
{
	this.score.points.innerHTML = this.game.gScore.score;
	this.score.text.style.color = this.game.planetHolder.clearColor.replace('0x', '#'); /* MOVE TO PORTALS COLLISION */
}

GameDOM.prototype.introEvent = function()
{
	this.gameContainer.style.cursor = 'pointer';

	var _this = this;
	this.intro.play.addEventListener('click', function(){
		_this.intro.div.style.display = 'none';
		_this.game.status = "init";
		_this.score.div.style.display = 'block';
	});
}

GameDOM.prototype.endEvent = function()
{
	this.gameContainer.style.cursor = 'pointer';

	this.score.div.style.display ='none';
	this.scores.div.style.display = 'block';

	this.scores.portals.innerHTML = this.game.gScore.portalScore;
	this.scores.comets.innerHTML = this.game.gScore.cometScore;
	this.scores.walls.innerHTML = this.game.gScore.wallScore;
	this.scores.total.innerHTML = this.game.gScore.score;

	var _this = this;
	this.scores.replay.addEventListener('click', function(){
		_this.scores.div.style.display = 'none';
		_this.score.div.style.display = 'block';
		_this.game.status = "init";
	});

	this.scores.change.addEventListener('click', function(){ // IMPLEMENT CHANGE MUSIC
		_this.scores.div.style.display = 'none';
		_this.intro.div.style.display = 'block';
		_this.game.status = 'waiting';
	});
}

GameDOM.prototype.pauseEvent = function()
{
	this.gameContainer.style.cursor = 'pointer';

	this.gameContainer.style.opacity = 0.8;
	this.pause.div.style.display = 'block';

	var _this = this;
	this.pause.resume.addEventListener('click', function(){
		_this.pause.div.style.display = 'none';
		_this.gameContainer.style.opacity = 1;
		_this.game.status = 'start';
	});

	this.pause.replay.addEventListener('click', function(){ // IMPLEMENT CHANGE MUSIC
		_this.pause.div.style.display = 'none';
		_this.gameContainer.style.opacity = 1;
		_this.game.status = 'init';
	});

	this.pause.change.addEventListener('click', function(){ // IMPLEMENT CHANGE MUSIC
		_this.pause.div.style.display = 'none';
		_this.gameContainer.style.opacity = 1;
		_this.score.div.style.display = 'none';
		_this.intro.div.style.display = 'block';
		_this.game.resetVariables();
		_this.game.scene.remove(_this.game.starsHolder.starsInUse[0].mesh);
		_this.game.status = 'waiting';
	});
}

// DOM animation functions

	/*
		_SCORE
	*/

GameScore = function(gAudio)
{
	this.gAudio = gAudio;

	this.score = 0, this.wallScore = 0, this.cometScore = 0, this.portalScore = 0;
	this.wallPoints = -500, this.cometPoints = 100, this.portalPoints = 1000;
}

GameScore.prototype.update = function()
{
	var points = (this.portalScore*this.portalPoints) + (this.cometScore*this.cometPoints) + (this.wallScore*this.wallPoints);
	this.score = Math.floor( (this.gAudio.audio.currentTime*10) + points);
}

	/*
		_COLOR
	*/

GameColor = function()
{
	this.colors;
}

GameColor.prototype.setUp = function()
{
	this.colors = {
		red : {
			dark: '0xc0392b',
			clear: '0xe74c3c',
		},
		purple : {
			dark: '0x8e44ad',
			clear: '0x9b59b6',
		},
		yellow : {
			dark: '0xf39c12',
			clear: '0xf1c40f',
		},
		blue : {
			dark: '0x2980b9',
			clear: '0x3498db',
		},
		green : {
			dark: '0x27ae60',
			clear: '0x2ecc71',
		},
		orange : {
			dark: '0xd35400',
			clear: '0xe67e22',
		},
		darkBlue : {
			dark: '0x2c3e50',
			clear: '0x34495e',
		},
		darkGreen : {
			dark: '0x16a085',
			clear: '0x1abc9c',
		},
		white : {
			dark: '0xecf0f1',
			clear: '0xbdc3c7',
		}
	}

	this.size = this.sizeColors();
	this.lastColorNum = this.size;
}

GameColor.prototype.sizeColors = function()
{
	var count = 0;
	for(var color in this.colors)
	{
		count++;
	}
	return count;
}

GameColor.prototype.getRandom = function()
{
    var count = 0;
    var color = this.colors['purple'];

    do{
    	randomColor = Math.floor(Math.random()*(this.size));
    }while(randomColor == this.lastColorNum);

    this.lastColorNum = randomColor;

    for(var key in this.colors)
    {
    	if(randomColor == count)
    	{
    		color = this.colors[key];
    	}
    	count++;
    }

    return color;
}

GameColor.prototype.setObjectColor = function(color, object)
{
	object.material.color.setHex(color);
}

	/*
		_AUDIO
	*/

GameAudio = function()
{
	this.audio, this.context, this.analyser, this.source;
}

GameAudio.prototype.setUp = function()
{
	this.audio = new Audio();
	this.audio.src = 'assets/sounds/monody.mp3';
	this.audio.controls = false;
	this.audio.loop = false;
	this.audio.autoplay = false;

	this.context = new AudioContext();
	
	this.analyser = this.context.createAnalyser();
	this.analyser.fftSize = 1024;
	this.analyser.minDecibels = -75;
	this.analyser.maxDecibels = 10;
	this.analyser.smoothingTimeConstant = 0.75;

	this.source = this.context.createMediaElementSource(this.audio);
	
	this.source.connect(this.analyser);
	this.analyser.connect(this.context.destination);

	this.audio.addEventListener("ended", function(){
   		
		if(game.status == 'playing')
		{
   			game.status = 'finished';
		}
	
	});
}

GameAudio.prototype.addObject = function(object, threshold, min, max)
{
	object.threshold = threshold;
	object.baseThreshold = object.threshold*3;
	object.decayRate = object.threshold/10;
	object.fMin = min;
	object.fMax = max;
}

GameAudio.prototype.update = function()
{
	this.data_array = new Uint8Array(this.analyser.frequencyBinCount);
	this.analyser.getByteFrequencyData(this.data_array);
	console.log(this.data_array.length);
}

GameAudio.prototype.getMag = function(min, max)
{
	var total = 0;
	for(var i=min; i<max; i++)
	{
		total += this.data_array[i];
	}

	return total/(max-min+1);
}

GameAudio.prototype.isBeat = function(magnitude, object)
{
	if(magnitude>object.threshold)
	{
		object.threshold = object.baseThreshold+(magnitude/object.baseThreshold);
		return true;
	}
	else
	{
		object.threshold -= object.decayRate;
		return false;
	}
}

GameAudio.prototype.check = function(object)
{
	this.magnitude = this.getMag(object.fMin, object.fMax);
	return this.isBeat(this.magnitude, object);
}

	/*
		_PARTICLES
	*/

Particle = function(x, y, z)
{
	this.mesh = new THREE.Vector3(x, y, z);
}

Particles = function(size, transparent, opacity, vertexColors, sizeAttenuation, color, number, range)
{
	this.geometry = new THREE.Geometry();
	this.material = new THREE.PointsMaterial({
												size: size,
												transparent: transparent, 
												opacity: opacity, 
												vertexColors: vertexColors, 
												sizeAttenuation: sizeAttenuation, 
												color: color,
												blending: THREE.AdditiveBlending,
												map: this.generateSprite()
											});
	return this;
}

Particles.prototype.create = function(number, range)
{
	for(var x=-number; x<number; x++)
	{
		for(var y=-number; y<number; y++)
		{
			var particle = new Particle(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random()*(50+150)-150);
			this.geometry.vertices.push(particle.mesh);
		}
	}
	this.points = new THREE.Points(this.geometry, this.material);
}

Particles.prototype.generateSprite = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        var context = canvas.getContext('2d');
        var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(128,128,128,1)');
        gradient.addColorStop(0.4, 'rgba(64,64,64,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        context.fillStyle = gradient;
        context.arc(0, 0, 50, 0, 2 * Math.PI);
        context.fill();
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
}

ParticlesHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.particlesInUse = [];

	this.speed = 0.2;
}

ParticlesHolder.prototype.createParticles = function(size=0.4, transparent=true, opacity=0.2, vertexColors=false, sizeAttenuation=true, color=0xffffff, number=10, range=50)
{	
	var particles = new Particles(size, transparent, opacity, vertexColors, sizeAttenuation, color);
	particles.create(number, range);
	this.particlesInUse.push(particles.points);
	this.mesh.add(particles.points); 
}

ParticlesHolder.prototype.update = function()
{
	var _this = this;
	for(var i=0; i<this.particlesInUse.length; i++)
	{
		this.particlesInUse[i].geometry.vertices.forEach(function(particle){
			
			
			particle.z += _this.speed;
				
			if(particle.z > 100)
			{
				particle.x = Math.random() * 50 - 50 / 2;
				particle.y = Math.random() * 50 - 50 / 2;
				particle.z = Math.random()*(-100+150)-150;
			}
		});
		this.particlesInUse[i].geometry.verticesNeedUpdate = true;
	}
}

ParticlesHolder.prototype.wallExplode = function(mesh) {
           
    var particleMesh = new Particles(0.5, true, 1, false, true, 0xffffff);
    var geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 100);
    var particles = new THREE.Points(geometry, particleMesh.material);
    particles.sortParticles = true;

    particles.scale.set(mesh.scale.x, mesh.scale.y, 100);
    particles.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    particles.rotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    
    return particles;
}

	/*
		_WALLS
	*/

Wall = function(clearColor, darkColor)
{
	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var material = new THREE.MeshPhongMaterial({
		color: clearColor.replace('0x', '#'),
		specular: clearColor.replace('0x', '#'),
		transparent: true,
		opacity: 0.8
	});
	this.mesh = new THREE.Mesh(geometry, material);
	this.angle = 0;
	this.height = 0;
}

WallsHolder = function(clearColor, darkColor)
{
	this.mesh = new THREE.Object3D();
	this.wallsInUse = [];
	this.wallsPool = [];
	this.wallsList = [];

	this.speed = 0.5;
	this.clearColor, this.darkColor;
}

WallsHolder.prototype.spawnWalls = function()
{
	var numWalls = 1;
	for(var i=0; i<numWalls; i++)
	{
		if(this.wallsPool.length)
		{
			wall = this.wallsPool.pop();
		}
		else
		{
			wall = new Wall(this.clearColor, this.darkColor);
		}

		wall.angle = Math.random()*Math.PI*2/numWalls;
		wall.height = 25;
		wall.mesh.position.x = Math.cos(wall.angle)*wall.height;
		wall.mesh.position.y = Math.sin(wall.angle)*wall.height;
		wall.mesh.position.z = -100;
		wall.mesh.scale.z = 0.1;

		wall.mesh.lookAt(new THREE.Vector3( (Math.random()*(25+25)-25) , (Math.random()*(25+25)-25) , wall.mesh.position.z));

		TweenMax.to(wall.mesh.scale, 1, {z: 250});

		this.mesh.add(wall.mesh);
		this.wallsInUse.push(wall);
		this.wallsList.push(wall.mesh);
	}
}

WallsHolder.prototype.update = function()
{
	//this.speed = 0.5;

	for(var i=0; i<this.wallsInUse.length; i++)
	{
		var wall = this.wallsInUse[i];

		wall.mesh.position.z += this.speed;

		if(wall.mesh.position.z < 5 + this.speed*2 && wall.mesh.position.z > 5)
		{
			TweenMax.to(wall.mesh.scale, (1/this.speed)*0.2, {z: 0.1});
		}
		if(wall.mesh.position.z > 10)
		{
			this.wallsPool.unshift(this.wallsInUse.splice(i, 1)[0]);
			this.wallsList.splice(i, 1);
			this.mesh.remove(wall.mesh);
			i--;
		}
	}
}

WallsHolder.prototype.resetColor = function(gColor)
{
	var color = gColor.getRandom();
	
	this.darkColor = color.dark;
	this.clearColor = color.clear;

	for(var i=0; i<this.wallsPool.length; i++)
	{
		var wall = this.wallsPool[i];
		gColor.setObjectColor(this.darkColor, wall.mesh);
	}

	for(var i=0; i<this.wallsInUse.length; i++)
	{
		var wall = this.wallsInUse[i];
		gColor.setObjectColor(this.darkColor, wall.mesh);
	}
}


	/*
		_PLANET
	*/

		/*
			_ATMOSPHERE
		*/

Atmosphere = function(clearColor, darkColor)
{
	var geometry = new THREE.DodecahedronGeometry(100, 1);
	var material = new THREE.MeshPhongMaterial({
													color: clearColor.replace('0x', '#'), 
													specular: clearColor.replace('0x', '#'),
													transparent: true, 
													opacity: 1,
													wireframe: true
												});

	this.mesh = new THREE.Mesh(geometry, material);
}

Atmosphere.prototype.move = function(gAudio)
{
	var value = 1;
	if(gAudio.check(this))
	{
		value += gAudio.magnitude*0.008;
	}
	TweenMax.to(this.mesh.scale, 0.25, {x: value, y: value, z: value});
}

Planet = function(clearColor, darkColor)
{
	var geometry = new THREE.DodecahedronGeometry(75, 1);
	var material = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'), 
												//specular: 0x3498db, 
												transparent: true, 
												opacity: 0.6,
											});

	var wireframeMaterial = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'), 
												//specular: 0x3498db, 
												transparent: true, 
												opacity: 0.6,
												wireframe: true
											});


	this.mesh = new THREE.SceneUtils.createMultiMaterialObject(geometry, [material, wireframeMaterial]);


	this.mesh.castShadow = true;
	this.mesh.receiveShadow = true;

}

Planet.prototype.move = function(gAudio)
{
	var value = 1;
	if(gAudio.check(this))
	{
		value += gAudio.magnitude*0.008;
	}
	TweenMax.to(this.mesh.scale, 0.25, {x: 1/value, y: 1/value, z: 1/value});
}

		/*
			_SATELLITE
		*/

Satellite = function(radius, clearColor, darkColor)
{
	var geometry = new THREE.DodecahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: darkColor.replace('0x', '#'),
												specular: darkColor.replace('0x', '#'),
												transparent: true,
												opacity: 1
											});

	this.height = 0;
	this.angle = 0;
	this.speed = 0;

	this.mesh = new THREE.Mesh(geometry, material);
}

Satellite.prototype.move = function()
{
	this.angle += this.speed;
	if(this.angle < Math.PI*2) this.angle -= Math.PI*2;

	this.mesh.position.x = Math.cos(this.angle)*this.height;
	this.mesh.position.y = Math.sin(this.angle)*this.height;
		
	this.mesh.rotation.z += 0.01;
}

		/*
			_FRAGMENT
		*/

Fragment = function(radius, clearColor, darkColor)
{
	var geometry = new THREE.IcosahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'),
												specular: clearColor.replace('0x', '#'),
												transparent: true,
												opacity: 0.8
											});

	this.mesh = new THREE.Mesh(geometry, material);

	this.speed = 0;
}

Fragment.prototype.move = function()
{

	if(this.mesh.position.y > 400)
	{
		this.mesh.position.y = -400;
		this.mesh.position.x = Math.random()*(350+350)-350;
		this.mesh.position.z = Math.random()*(0+50)-50;
		this.speed = Math.random()*(0.5-0.1)+0.1;
	}

	this.mesh.position.y += this.speed;

	this.mesh.rotation.x += 0.01;	
	this.mesh.rotation.y += 0.01;
}

	/*
		_PLANETHOLDER
	*/

PlanetHolder = function()
{
	this.mesh = new THREE.Object3D();

	this.clearColor, this.darkColor;

	this.numSatellites = 10;
	this.satellitesInUse = [];

	this.numFragments = 20;
	this.fragmentsInUse = [];
}

PlanetHolder.prototype.createPlanet = function()
{
	this.planet = new Planet(this.clearColor, this.darkColor);
	this.atmosphere = new Atmosphere(this.clearColor, this.darkColor);

	this.mesh.add(this.planet.mesh);
	this.mesh.add(this.atmosphere.mesh);
}

PlanetHolder.prototype.createSatellites = function()
{
	var step = Math.PI*2/this.numSatellites;
	for(var i=0; i<this.numSatellites; i++)
	{
		var radius = Math.random()*(2-0.5)+0.5;
		var satellite = new Satellite(radius, this.clearColor, this.darkColor);

		satellite.angle = i*step;
		satellite.height = Math.random()*(98-78)+78;
		satellite.speed = Math.random()*(0.01-0.005)+0.005;

		satellite.mesh.position.x = Math.cos(satellite.angle*i)*satellite.height;
		satellite.mesh.position.y = Math.sin(satellite.angle*i)*satellite.height;

		this.mesh.add(satellite.mesh);
		this.satellitesInUse.push(satellite);
	}
}

PlanetHolder.prototype.rotateSatellites = function()
{
	for(var i=0; i<this.satellitesInUse.length; i++)
	{
		var satellite = this.satellitesInUse[i];

		satellite.move();
	}
}

PlanetHolder.prototype.createFragments = function()
{
	for(var i=0; i<this.numFragments; i++)
	{
		var radius = Math.random()*(2-0.5)+0.5;
		var fragment = new Fragment(radius, this.clearColor, this.darkColor);

		fragment.speed = Math.random()*(0.5-0.1)+0.1;

		fragment.mesh.position.x = Math.random()*(350+350)-350;
		fragment.mesh.position.y = Math.random()*(400+400)-400;
		fragment.mesh.position.z = Math.random()*(-50+50)-50;

		this.mesh.add(fragment.mesh);
		this.fragmentsInUse.push(fragment);
	}
}

PlanetHolder.prototype.moveFragments = function()
{
	for(var i=0; i<this.fragmentsInUse.length; i++)
	{
		var fragment = this.fragmentsInUse[i];

		fragment.move();
	}
}

PlanetHolder.prototype.resetColor = function(gColor, cometsHolder, portalsHolder)
{
	var color = gColor.getRandom();

	this.darkColor = color.dark;
	this.clearColor = color.clear;

	gColor.setObjectColor(this.clearColor, this.planet.mesh.children[0]);
	gColor.setObjectColor(this.clearColor, this.planet.mesh.children[1]);

	gColor.setObjectColor(this.clearColor, this.atmosphere.mesh);

	for(var i=0; i<this.satellitesInUse.length; i++)
	{
		var satellite = this.satellitesInUse[i];
		gColor.setObjectColor(this.darkColor, satellite.mesh);
	}

	for(var i=0; i<this.fragmentsInUse.length; i++)
	{
		var fragment = this.fragmentsInUse[i];
		gColor.setObjectColor(this.clearColor, fragment.mesh);
	}

	cometsHolder.resetColor(gColor, color);
	portalsHolder.resetColor(gColor, color);
}

	/*
		_PORTAL
	*/

Portal = function(tubularSegments=3, clearColor, darkColor)
{
	this.mesh = new THREE.Object3D();

	var geomFirstLayer = new THREE.TorusGeometry(1, 1*0.1, 2, tubularSegments);
	var matFirstLayer = new THREE.MeshPhongMaterial({
													color: clearColor.replace('0x', '#'), 
													specular: clearColor.replace('0x', '#'),
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.firstLayer = new THREE.Mesh(geomFirstLayer, matFirstLayer);
	this.mesh.add(this.firstLayer);

	var geomSecondLayer = new THREE.TorusGeometry(0.8, 0.8*0.1, 2, tubularSegments);
	var matSecondLayer = new THREE.MeshPhongMaterial({
													color: 0xecf0f1, 
													specular: 0xecf0f1,
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.secondLayer = new THREE.Mesh(geomSecondLayer, matSecondLayer);
	this.mesh.add(this.secondLayer);

	var geomThirdLayer = new THREE.TorusGeometry(0.6, 0.6*0.1, 3, tubularSegments);
	var matThirdLayer = new THREE.MeshPhongMaterial({
													color: clearColor.replace('0x', '#'), 
													specular: clearColor.replace('0x', '#'),
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.thirdLayer = new THREE.Mesh(geomThirdLayer, matThirdLayer);
	this.mesh.add(this.thirdLayer);

	var geomFourthLayer = new THREE.TorusGeometry(0.4, 0.4*0.1, 3, tubularSegments);
	var matFourthLayer = new THREE.MeshPhongMaterial({
													color: 0xecf0f1, 
													specular: 0xecf0f1,
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.fourthLayer = new THREE.Mesh(geomFourthLayer, matFourthLayer);
	this.mesh.add(this.fourthLayer);

	var geomFifthLayer = new THREE.TorusGeometry(0.2, 0.2*0.1, 3, tubularSegments);
	var matTFifthLayer = new THREE.MeshPhongMaterial({
													color: clearColor.replace('0x', '#'), 
													specular: clearColor.replace('0x', '#'),
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.fifthLayer = new THREE.Mesh(geomFifthLayer, matTFifthLayer);
	this.mesh.add(this.fifthLayer);

	var geometry = new THREE.CircleGeometry(1.2, tubularSegments);
	var material = new THREE.MeshPhongMaterial({
													color: clearColor.replace('0x', '#'),
													//specular: clearColor.replace('0x', '#'),
													transparent: true,
													opacity: 0.4,
													side: THREE.DoubleSide
												});
	this.collisionMesh = new THREE.Mesh(geometry, material);
	this.mesh.add(this.collisionMesh);
}

PortalsHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.portalsInUse = [];
	this.portalsList = [];

	this.clearColor, this.darkColor;

	this.portalLastSpawn = 0;
	this.speed = 0.2;
}


PortalsHolder.prototype.spawnPortals = function(spawnTime)
{
	this.portalLastSpawn = spawnTime;

	var tubularSegments = Math.floor(Math.random()*((6)-3)+3);
	portal = new Portal(tubularSegments, this.clearColor, this.darkColor);

	portal.mesh.position.x = Math.random()*(6+6)-6;
	portal.mesh.position.y = Math.random()*(3+3)-3;
	portal.mesh.position.z = -100;

	portal.mesh.scale.set(0.1, 0.1, 0.1);

	TweenMax.to(portal.mesh.scale, 1, {x: 1, y: 1, z: 1});

	this.portalsInUse.push(portal);
	this.portalsList.push(portal.collisionMesh);
	this.mesh.add(portal.mesh);
}

PortalsHolder.prototype.update = function()
{
	for(var i=0; i<this.portalsInUse.length; i++)
	{
		var portal = this.portalsInUse[i];

		if(portal.mesh.position.z > 15)
		{
			this.portalsInUse.splice(i, 1);
			this.portalsList.splice(i, 1);
			this.mesh.remove(portal.mesh);
		}

		portal.mesh.position.z += this.speed;
		portal.mesh.rotation.z += 0.02;
	}
}

PortalsHolder.prototype.resetColor = function(gColor, color)
{

	this.darkColor = color.dark;
	this.clearColor = color.clear;

	for(var i=0; i<this.portalsInUse.length; i++)
	{
		var portal = this.portalsInUse[i];
		gColor.setObjectColor(this.clearColor, portal.firstLayer);
		gColor.setObjectColor(this.clearColor, portal.thirdLayer);
	}
}

	/*
		_COMET
	*/

		/*
			_COMA
		*/

Coma = function(clearColor, darkColor)
{
	this.mesh = new THREE.Object3D();

	var geomFirstPoint = new THREE.IcosahedronGeometry(0.1, 0);
	var matFirstPoint = new THREE.MeshPhongMaterial({
													color: darkColor.replace('0x', '#'), 
													specular: darkColor.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.firstPoint = new THREE.Mesh(geomFirstPoint, matFirstPoint);

	var geomSecondPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matSecondPoint = new THREE.MeshPhongMaterial({
													color: darkColor.replace('0x', '#'), 
													specular: darkColor.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.secondPoint = new THREE.Mesh(geomSecondPoint, matSecondPoint);

	var geomThirdPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matThirdPoint = new THREE.MeshPhongMaterial({
													color: darkColor.replace('0x', '#'), 
													specular: darkColor.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.thirdPoint = new THREE.Mesh(geomThirdPoint, matThirdPoint);

	var geomFourthPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matFourthPoint = new THREE.MeshPhongMaterial({
													color: darkColor.replace('0x', '#'), 
													specular: darkColor.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.fourthPoint = new THREE.Mesh(geomFourthPoint, matFourthPoint);

	this.mesh.add(this.firstPoint);
	this.mesh.add(this.secondPoint);
	this.mesh.add(this.thirdPoint);
	this.mesh.add(this.fourthPoint);

	this.firstPoint.speed = Math.random()*(0.9-0.1)+0.1;
	this.secondPoint.speed = Math.random()*(0.9-0.1)+0.1;
	this.thirdPoint.speed = Math.random()*(0.9-0.1)+0.1;
	this.fourthPoint.speed = Math.random()*(0.9-0.1)+0.1;

	this.angle = 0;
	this.height = 0.6;
}

Coma.prototype.move = function()
{
	this.angle += 0.2;

	this.firstPoint.position.y = Math.sin(this.angle*this.firstPoint.speed)*this.height;
	this.firstPoint.position.z = Math.cos(this.angle*this.firstPoint.speed)*this.height;

	this.secondPoint.position.x = Math.cos(this.angle*this.secondPoint.speed)*this.height;
	this.secondPoint.position.z = Math.sin(this.angle*this.secondPoint.speed)*this.height;

	this.thirdPoint.position.y = Math.cos(this.angle*this.thirdPoint.speed)*this.height;
	this.thirdPoint.position.z = Math.sin(this.angle*this.thirdPoint.speed)*this.height;
	this.thirdPoint.position.x = Math.cos(this.angle*this.thirdPoint.speed)*this.height;

	this.fourthPoint.position.y = Math.cos(this.angle*this.fourthPoint.speed)*this.height;
	this.fourthPoint.position.z = Math.sin(this.angle*this.fourthPoint.speed)*this.height;
	this.fourthPoint.position.x = -Math.cos(this.angle*this.fourthPoint.speed)*this.height;
}

		/*
			_COMETCORE
		*/

CometCore = function(clearColor, darkColor)
{
	var geometry = new THREE.DodecahedronGeometry(0.2, 0);
	var material = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'), 
												//specular: clearColor.replace('0x', '#'), 
												transparent: true, 
												opacity: 0.8,
											});

	var wireframeMaterial = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'), 
												//specular: clearColor.replace('0x', '#'), 
												transparent: true, 
												opacity: 0.8,
												wireframe: true
											});


	this.mesh = new THREE.SceneUtils.createMultiMaterialObject(geometry, [material, wireframeMaterial]);
}

Comet = function(clearColor, darkColor)
{
	this.mesh = new THREE.Object3D();

	this.core = new CometCore(clearColor, darkColor);
	this.mesh.add(this.core.mesh);

	this.coma = new Coma(clearColor, darkColor);
	this.coma.mesh.position.x = this.core.mesh.position.x;
	this.coma.mesh.position.y = this.core.mesh.position.y;
	this.coma.mesh.position.z = this.core.mesh.position.z;
	this.mesh.add(this.coma.mesh);

	var geometry = new THREE.DodecahedronGeometry(0.4, 0);
	var material = new THREE.MeshPhongMaterial({
												color: clearColor.replace('0x', '#'), 
												//specular: clearColor.replace('0x', '#'),
												transparent: true, 
												opacity: 0.,
											});
	this.collisionMesh = new THREE.Mesh(geometry, material);
	this.mesh.add(this.collisionMesh);
}

CometsHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.cometsPool = [];
	this.cometsInUse = [];
	this.cometsList = [];

	this.clearColor, this.darkColor;

	this.cometLastSpawn = 0;
	this.speed = 0.3;
}

CometsHolder.prototype.spawnComets = function(spawnTime)
{
	this.cometLastSpawn = spawnTime;
	var nComets = 1;
	for(var i=0; i<nComets; i++)
	{
		if(this.cometsPool.length)
		{
			comet = this.cometsPool.pop();
		}
		else
		{
			comet = new Comet(this.clearColor, this.darkColor);
		}

		comet.mesh.position.x = Math.random()*(6+6)-6;
		comet.mesh.position.y = Math.random()*(3+3)-3;
		comet.mesh.position.z = -100;

		comet.mesh.scale.set(0.1, 0.1, 0.1);

		TweenMax.to(comet.mesh.scale, 1, {x: 1, y: 1, z: 1});

		this.cometsInUse.push(comet);
		this.cometsList.push(comet.collisionMesh);
		this.mesh.add(comet.mesh);
	}
}

CometsHolder.prototype.update = function()
{
	for(var i=0; i<this.cometsInUse.length; i++)
	{
		var comet = this.cometsInUse[i];

		comet.mesh.position.z += this.speed;

		comet.core.mesh.rotation.x += 0.01;
		comet.core.mesh.rotation.y += 0.01;

		comet.coma.move();

		if(comet.mesh.position.z > 15)
		{
			this.cometsPool.unshift(this.cometsInUse.splice(i, 1)[0]);
			this.cometsList.splice(i, 1);
			this.mesh.remove(comet.mesh);
			i--;
		}
	}
}

CometsHolder.prototype.resetColor = function(gColor, color)
{

	this.darkColor = color.dark;
	this.clearColor = color.clear;

	for(var i=0; i<this.cometsPool.length; i++)
	{
		var comet = this.cometsPool[i];
		gColor.setObjectColor(this.darkColor, comet.coma.firstPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.secondPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.thirdPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.fourthPoint);		
		gColor.setObjectColor(this.clearColor, comet.core.mesh.children[0]);
		gColor.setObjectColor(this.clearColor, comet.core.mesh.children[1]);
	}

	for(var i=0; i<this.cometsInUse.length; i++)
	{
		var comet = this.cometsInUse[i];
		gColor.setObjectColor(this.darkColor, comet.coma.firstPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.secondPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.thirdPoint);
		gColor.setObjectColor(this.darkColor, comet.coma.fourthPoint);		
		gColor.setObjectColor(this.clearColor, comet.core.mesh.children[0]);
		gColor.setObjectColor(this.clearColor, comet.core.mesh.children[1]);
	}
}

	/*
		_SPACESHIP
	*/
	
		/*
			_ENGINE
		*/

Engine = function()
{
	var geometry = new THREE.ConeGeometry(1*0.2, 2*0.2, 3, 1, false, 60*Math.PI/180);
	var material = new THREE.MeshPhongMaterial({
												color: 0xecf0f1,
												specular: 0xecf0f1,
												transparent: true,
												opacity: 1
											});

	this.mesh = new THREE.Mesh(geometry, material);
	this.mesh.rotation.x = -90*Math.PI/180;
	this.mesh.position.z = 0.5-0.2;
	this.angle = 0;
	this.height = 0;
}

SpaceShip = function()
{
	this.mesh = new THREE.Object3D();

	this.numEngines = 3;
	this.enginesHeight = 0.5;
	this.step = Math.PI/6;

	var geomCockpit = new THREE.ConeGeometry(1*0.4, 2*0.4, 3);
	var matCockpit = new THREE.MeshPhongMaterial({
												color: 0xecf0f1,
												specular: 0xecf0f1,
												transparent: true,
												opacity: 1
											});
	this.cockpit = new THREE.Mesh(geomCockpit, matCockpit);
	this.cockpit.rotation.x = -90*Math.PI/180;
	//this.cockpit.rotation.y = 60*Math.PI/180;

	this.firstEngine = new Engine();
	this.firstEngine.angle = this.step;
	this.firstEngine.height = this.enginesHeight;

	this.secondEngine = new Engine();
	this.secondEngine.angle = this.step*5;
	this.secondEngine.height = this.enginesHeight;

	this.thirdEngine = new Engine();
	this.thirdEngine.angle = this.step*9;
	this.thirdEngine.height = this.enginesHeight;
	

	this.firstEngine.mesh.position.x = Math.cos(this.firstEngine.angle)*this.firstEngine.height;
	this.firstEngine.mesh.position.y = Math.sin(this.firstEngine.angle)*this.firstEngine.height;

	this.secondEngine.mesh.position.x = Math.cos(this.secondEngine.angle)*this.secondEngine.height;
	this.secondEngine.mesh.position.y = Math.sin(this.secondEngine.angle)*this.secondEngine.height;

	this.thirdEngine.mesh.position.x = Math.cos(this.thirdEngine.angle)*this.thirdEngine.height;
	this.thirdEngine.mesh.position.y = Math.sin(this.thirdEngine.angle)*this.thirdEngine.height;

	this.mesh.add(this.cockpit);
	this.mesh.add(this.firstEngine.mesh);
	this.mesh.add(this.secondEngine.mesh);
	this.mesh.add(this.thirdEngine.mesh);
}

SpaceShip.prototype.move = function(/*keyboard*/mousePos)
{
	/*var xPos = this.mesh.position.x, yPos = this.mesh.position.y;;

	if ( keyboard.pressed("left") )
		xPos -= 0.2;
	if ( keyboard.pressed("right") )
		xPos += 0.2;
	if ( keyboard.pressed("up") )
		yPos += 0.2;
	if ( keyboard.pressed("down") )
		yPos -= 0.2;

	this.mesh.position.x = xPos;
	this.mesh.position.y = yPos;*/
	TweenMax.to(this.mesh.position, 1, {x: mousePos.x, y: ( ( mousePos.y > -90) ? mousePos.y : -90 )});
}

// 2Player: TETRAHEDRON 2, Torus (3, 5)

	/*
		_STAR
	*/

		/*
			_RING
		*/

Ring = function(radius, tube, tubularSegments, opacity)
{
	this.speed = 0.05;

	var geomRing = new THREE.TorusGeometry(radius, tube, 2, tubularSegments);
	var matRing = new THREE.MeshPhongMaterial({
													color: 0x2c3e50, 
													specular: 0x2c3e50,
													transparent: true,
													opacity: opacity,
													side: THREE.DoubleSide
												});
	this.mesh = new THREE.Mesh(geomRing, matRing);
}

Ring.prototype.rotate = function()
{
	this.mesh.rotation.x += this.speed;
	this.mesh.rotation.y += this.speed;
	//this.mesh.rotation.z += this.speed;
}

Star = function()
{
	this.mesh = new THREE.Object3D();

	this.numRings = 12;
	this.tubularSegments = 20
	this.ringsInUse = [];
	this.negative = false;
	//this.tubularSegments = Math.random()*(6-3)+3;

	for(var i=1; i<this.numRings+1; i++)
	{
		var radius = i*0.08;
		var tube = radius*0.08;
		var speed = Math.random()*(0.1-0.05)+0.05;

		var ring = new Ring(radius, tube, this.tubularSegments, 0.8);
		ring.mesh.rotation.x = (Math.random()*360)*Math.PI/180;

		ring.speed = speed;

		//ring.mesh.rotation.x = i*12*Math.PI/180;

		this.ringsInUse.push(ring);
		this.mesh.add(ring.mesh);
	}
	
	this.collisionRings = [];
	
	/*var ring = new Ring(0.6, 0.04, this.tubularSegments, 0);
	ring.mesh.opacity = 0;
	this.mesh.add(ring.mesh);
	this.ringsInUse.push(ring);

	var ring = new Ring(0.6, 0.04, this.tubularSegments, 0);
	ring.mesh.opacity = 0;
	ring.mesh.rotation.x = 90*Math.PI/180;
	this.mesh.add(ring.mesh);
	this.ringsInUse.push(ring);*/

	/*var geometry = new THREE.SphereGeometry(0.1, 10, 10);
	var material = new THREE.MeshBasicMaterial( {color: 0xbdc3c7, transparent: true, opacity: 0.4, wireframe: true } );
	this.sphere = new THREE.Object3D();
	this.sphere.mesh = new THREE.Mesh(geometry, material);
	this.mesh.add(this.sphere.mesh);
	this.collisionRings.push(this.sphere)*/

	var geomCore = new THREE.SphereGeometry(0.03, 10, 10);
	var matCore = new THREE.MeshPhongMaterial({color: 0xbdc3c7,wireframe: true});
	this.core = new THREE.Mesh(geomCore, matCore);
	this.mesh.add(this.core);

	/*var geomSphere = new THREE.SphereGeometry(0.4, 10, 10);
	var matSphere = new THREE.MeshBasicMaterial({color: 0xbdc3c7, transparent: true, opacity: 0.4});
	this.sphere = new THREE.Mesh(geomSphere, matSphere);
	this.mesh.add(this.sphere);*/
}

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

Star.prototype.move = function(joystick)
{
	for(var i=0; i<this.numRings; i++)
	{
		var ring = this.ringsInUse[i];
		ring.rotate();
	}

	//this.core.rotation.x += 0.02;
	//this.core.rotation.y += 0.02;
	var posX = this.mesh.position.x, posY = this.mesh.position.y;

	/*if( joystick.right() ){
		posX += 2;    
	}
	if( joystick.left() ){
		posX -= 2;  
	}
	if( joystick.up() ){
		posY += 2;  
	}
	if( joystick.down() ){
		posY -= 2;  
	}*/

	posX = posX + joystick.deltaX()*(0.05);
	posY = posY + joystick.deltaY()*(-0.05);


	if(isMobile.any())
	{
		if( !( (posX > 20) || (posX < -20)))
		{
			TweenMax.to(this.mesh.position, 1, {x: posX});
		}
		if( !( (posY > 12) || (posY < -12) ))
		{
			TweenMax.to(this.mesh.position, 1, {y: posY});
		}
	}
	else
	{
		TweenMax.to(this.mesh.position, 1, {x: !this.negative ? mousePos.x : -mousePos.x, y: !this.negative ? mousePos.y : -mousePos.y});
	}
}

StarHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.starsInUse = [];
}

StarHolder.prototype.update = function(joystick)
{
	for(var i=0; i<this.starsInUse.length; i++)
	{
		var star = this.starsInUse[i];
		star.move(joystick);
	}
}

StarHolder.prototype.resetColor = function(gColor, color)
{
	//var color = gColor.getRandom();

	//this.darkColor = color.dark;
	//this.clearColor = color.clear;
	for(var i =0; i<this.starsInUse.length; i++)
	{
		var star = this.starsInUse[i]
		for(var j=0; j<star.ringsInUse.length; j++)
		{
			var ring = star.ringsInUse[j];
			/*if(i%2==0)
				gColor.setObjectColor(0xbdc3c7, ring.mesh);
			else*/
				gColor.setObjectColor(color, ring.mesh);
		}
	}
}

StarHolder.prototype.createStar = function(negative=false)
{
	var star = new Star();
	star.negative = negative;
	this.starsInUse.push(star);
	//this.mesh.add(star.mesh);
}

	/*
		_COLLISIONS
	*/

GameCollision = function(game)
{
	this.game = game;
}

/*GameCollision.prototype.group = function(walls, portals, comets)
{
	this.collidableMeshList = walls.concat(portals, comets);
}*/

GameCollision.prototype.update = function()
{
	//this.group(walls, portals, comets);
	var _this = this;
	for(var i=0; i<this.game.starsHolder.starsInUse.length; i++)
	{
		var star = this.game.starsHolder.starsInUse[i];
		var originPoint = star.mesh.position.clone();
		for(var j=0; j<star.ringsInUse.length; j++)
		{
			//if(j%3 ==0)
			//{
				var ring = star.ringsInUse[j];
				for (var vertexIndex = 0; vertexIndex < ring.mesh.geometry.vertices.length-1; vertexIndex++)
				{		
					var localVertex = ring.mesh.geometry.vertices[vertexIndex].clone();
					var globalVertex = localVertex.applyMatrix4( ring.mesh.matrix );
					var directionVector = globalVertex.sub( ring.mesh.position );
					
					var ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
					
					if(this.game.portalsHolder.portalsList.length)
					{
						var portalsCollision = ray.intersectObjects( this.game.portalsHolder.portalsList );
						if ( portalsCollision.length > 0 && portalsCollision[0].distance < directionVector.length() ) 
						{
							var collisionMesh = portalsCollision[0].object;
							var portal = this.game.portalsHolder.portalsInUse[this.game.portalsHolder.portalsList.indexOf(collisionMesh)];

							

							this.game.wallsHolder.resetColor(this.game.gColor);
							this.game.planetHolder.resetColor(this.game.gColor, this.game.cometsHolder, this.game.portalsHolder);

							this.game.starsHolder.resetColor(this.game.gColor, this.game.planetHolder.clearColor)

							this.game.renderer.setClearColor(this.game.wallsHolder.clearColor.replace('0x', '#'));

							this.game.portalsHolder.portalsList.splice(this.game.portalsHolder.portalsList.indexOf(collisionMesh), 1);
							
							TweenMax.to(portal.mesh.scale, 0.1, {x: 200, y: 200, z: 200, onComplete: function(){
									_this.game.portalsHolder.mesh.remove(portal.mesh);
									TweenMax.to(_this.game.blurPass.params.delta, 0.3, {x: 50, onComplete: function(){
									TweenMax.to(_this.game.blurPass.params.delta, 0.3, {x:0});
								}});
							}});
							this.game.gScore.portalScore++;
						}
					}
					
					if(this.game.wallsHolder.wallsList.length)
					{
						var wallsCollision = ray.intersectObjects( this.game.wallsHolder.wallsList );
						if ( wallsCollision.length > 0 && wallsCollision[0].distance < directionVector.length() )
						{

							TweenMax.to(star.mesh.scale, 0.1, {x: 2, y: 2, z: 2, onComplete: function(){
								TweenMax.to(star.mesh.scale, 0.2, {x: 1, y: 1, z: 1});
							}});

							var wall = wallsCollision[0].object;
							
							this.game.wallsHolder.wallsPool.unshift(this.game.wallsHolder.wallsInUse.splice(this.game.wallsHolder.wallsList.indexOf(wall), 1)[0]);
							this.game.wallsHolder.wallsList.splice(this.game.wallsHolder.wallsList.indexOf(wall), 1);
							var particleWall = this.game.particlesHolder.wallExplode(wall);
	
							this.game.wallsHolder.mesh.remove(wall);
							this.game.scene.add(particleWall);
							TweenMax.to(particleWall.material, 2, {size: 0.1, onUpdate: function(){particleWall.geometry.verticesNeedUpdate = true}, onComplete: function(){_this.game.scene.remove(particleWall);}});
						    for(var i=0; i<particleWall.geometry.vertices.length; i++)
						    {
						    	var point = particleWall.geometry.vertices[i];

						    	TweenMax.to(point, 10, {x: Math.random()*(50+50)-50, y: Math.random()*(50+50)-50, z: Math.random()*(50+50)-50});
						    }
						    this.game.gScore.wallScore++;
						} 
					}

					if(this.game.cometsHolder.cometsList.length)
					{
						var cometsCollision = ray.intersectObjects( this.game.cometsHolder.cometsList );
						if ( cometsCollision.length > 0 && cometsCollision[0].distance < directionVector.length() ) 
						{
							var collisionMesh = cometsCollision[0].object;
							var comet = this.game.cometsHolder.cometsInUse[this.game.cometsHolder.cometsList.indexOf(collisionMesh)];

							this.game.cometsHolder.cometsPool.unshift(this.game.cometsHolder.cometsInUse.splice(this.game.cometsHolder.cometsList.indexOf(collisionMesh), 1)[0]);
							this.game.cometsHolder.cometsList.splice(this.game.cometsHolder.cometsList.indexOf(collisionMesh), 1);

							this.game.ambientLight.intensity = 0.8;
							TweenMax.to(this.game.ambientLight, 0.5, {intensity: 0.6});
							TweenMax.to(star.mesh.scale, 0.1, {x: 0.1, y: 0.1, z: 0.1, onComplete: function(){
									TweenMax.to(star.mesh.scale, 0.2, {x: 1, y: 1, z: 1});
								}});

							this.game.cometsHolder.mesh.remove(comet.mesh);
							this.game.gScore.cometScore++;
						}
					}

					// Use index of to get position from value this.wallsHolder.wallsInUse.splice(this.wallsHolder.wallsInUse.indexOf(wallsCollision[0].object), 1); === array.indexOf(value);

				}
			//}
		}	
	}
}

GameCollision.prototype.collision = function(holder)
{

}

// _LOOP //

function loop()
{
	if(game.status == 'playing')
	{
		game.update();
	}
	else if(game.status == 'finished')
	{
		// Ending animation, score calculations
		game.end();
	}
	else if(game.status == 'paused')
	{
		// Show pause menu
		game.pause();
	}
	else if(game.status == 'waiting')
	{
		// Show score and wait for replay
		game.wait();
	}
	else if(game.status == 'init')
	{
		game.initStart();
	}
	else if(game.status = 'start')
	{
		game.start();
	}

	this.game.render();
	requestAnimationFrame(loop);
}

// _INITIALIZATION //

var game;

function init()
{
	game = new Game();

	game.initVariables();
	game.createObjects();
	game.initCollisions();

	loop();
}