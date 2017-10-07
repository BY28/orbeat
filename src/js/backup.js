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

		BEGIN SPEED AT 1 ? YES

		TWO STARS BUG (0 INITSTART/COMETCOLLISION/END)- FIXED

		FIX JOYSTICK DISPLAY END
		
		USE CREATEJS TWEENJS - IMPORTANT: GSAP NEEDS LICENCE - 
		CONVERT TO CREATEJS

		PAUsE BUTTON

		MAKE INFINITE MODE (NCS SOUNDS LOOP)

		ADD CREDIAT AT GAME END ( BOTTOM RIGHT )

		USE SOUNDJS CORDOVA ?

		USE WEBAUDIOJS <-- USED
		INFO IN sound._context (suspend(), resume(), currentTime) sound._duration

		PHONE ONENDED FIX -FIXED-

		SET MAX PERCENT TO 100 -DONE-

		TRY TO ADD SHADER PLANE IN BACKGROUND 											<----------
 		ONCLICK:REMOVE OBJECTS > SHOW LOADER > ADD OBJECTS > PLAY SOUND/BEGIN GAME     	<---------- -DONE-
	

*/



/* _GAME */

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
	
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(this.fieldOfView, this.aspectRatio, this.nearPlane, this.farPlane);
	this.renderer = new THREE.WebGLRenderer();
	this.container = document.getElementById('webglContainer');

	this.camera.position.z = 15;
	this.renderer.setSize(this.WIDTH, this.HEIGHT);
	this.renderer.setPixelRatio(window.devicePixelRatio);
	this.container.appendChild(this.renderer.domElement);

	this.gAudio = new GameAudio();

	this.gColor = new GameColor();
	this.gColor.setUp();

	this.gCollision = new GameCollision(this);

	this.gScore = new GameScore(this.gAudio);

	this.gDOM = new GameDOM(this);

	this.stage = new createjs.Stage("gameTween");
 	createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener("tick", this.stage);
	
	this.speedLastUpdate = 0;

	this.mousePos = {x:0, y:0}

	this.joystick	= new VirtualJoystick({
		container	: document.getElementById('joystickContainer')
	});
	
	if(!isMobile.any())
	{
		this.joystick.removeEvents();
	}

	this.worldColor = this.gColor.colors.darkBlue;
	this.objectsColor = this.gColor.colors.white;

	this.mode = "orb";

	this.renderer.setClearColor(this.worldColor.clear.replace('0x', '#'));
	
	this.postprocessing();
	this.lights();
	this.events();
}

	/*
		_FUNCTIONS
	*/

Game.prototype.removeObjects = function()
{
	this.scene.remove(this.planetHolder.mesh);
	this.scene.remove(this.wallsHolder.mesh);
	this.scene.remove(this.portalsHolder.mesh);
	this.scene.remove(this.cometsHolder.mesh);
	for(var i=0; i<this.starsHolder.starsInUse.length; i++)
	{
		var star = this.starsHolder.starsInUse[i];
		this.scene.remove(star.mesh);
	}
}

Game.prototype.resetObjects = function()
{
	this.scene.add(this.planetHolder.mesh);
	this.scene.add(this.wallsHolder.mesh);
	this.scene.add(this.portalsHolder.mesh);
	this.scene.add(this.cometsHolder.mesh);
	this.scene.add(this.cometsHolder.mesh);
	var _this = this;
	createjs.Tween.get(this.blurPass.params.delta, {override:true})
        .to({x: 50}, 250)
        .call(function(){
			createjs.Tween.get(_this.blurPass.params.delta, {override:true})
          		.to({x:0}, 250);
	});
}

Game.prototype.update = function()
{
	this.updateObjects();
	this.spawnObjects();
}

Game.prototype.createObjects = function()
{
	this.addParticles();
	this.addWalls();
	this.addPlanet();
	this.addPortals();
	this.addComets();
	this.addStars();
}

Game.prototype.updateObjects = function()
{
	this.particlesHolder.update();
	this.wallsHolder.update();
	this.planetHolder.update(this.gAudio);
	this.portalsHolder.update();
	this.cometsHolder.update();
	this.starsHolder.update(this.mousePos, this.joystick);
	this.gCollision.update();
	this.gScore.update();
	this.gDOM.updateScore();
	this.gAudio.update(this);

	this.pointLight.position.copy(new THREE.Vector3(this.starsHolder.starsInUse[0].mesh.position.x, this.starsHolder.starsInUse[0].mesh.position.y + 5, 15));

	var starPos = {
		x: this.starsHolder.starsInUse[0].mesh.position.x,
		y: this.starsHolder.starsInUse[0].mesh.position.y
	};

	createjs.Tween.get(this.planetHolder.mesh.position, {override:true})
        .to({x: -starPos.x*0.2, y: 125-(starPos.y*0.2)}, 250);

	createjs.Tween.get(this.wallsHolder.mesh.position, {override:true})
        .to({x: -starPos.x*0.6, y: -(starPos.y*0.6)}, 250);

	createjs.Tween.get(this.cometsHolder.mesh.position, {override:true})
        .to({x: -starPos.x*0.2, y: -(starPos.y*0.2)}, 250);

	createjs.Tween.get(this.portalsHolder.mesh.position, {override:true})
        .to({x: -starPos.x*0.2, y: -(starPos.y*0.2)}, 250);

	createjs.Tween.get(this.particlesHolder.mesh.position, {override:true})
        .to({x: -starPos.x*0.6, y: -(starPos.y*0.6)}, 250);


	if(this.starsHolder.life <= 0)
	{
		this.status = 'finished';
	}
}

Game.prototype.initJoystick = function()
{

}

Game.prototype.spawnObjects = function()
{
	if(this.gAudio.check(this.wallsHolder))
	{
		this.wallsHolder.spawnWalls();
	}

	if(Math.floor(this.gAudio.context.currentTime)%10 == 0 && this.gAudio.context.state == 'running' && Math.floor(this.gAudio.context.currentTime) > this.portalsHolder.portalLastSpawn)
	{
		this.portalsHolder.spawnPortals(Math.floor(this.gAudio.context.currentTime));
	}

	if(Math.floor(this.gAudio.context.currentTime)%3 == 0 && this.gAudio.context.state == 'running' && Math.floor(this.gAudio.context.currentTime) > this.cometsHolder.cometLastSpawn)
	{
		this.cometsHolder.spawnComets(Math.floor(this.gAudio.context.currentTime));
	}

	if(Math.floor(this.gAudio.context.currentTime)%15 == 0 && this.gAudio.context.state == 'running' && Math.floor(this.gAudio.context.currentTime) > this.speedLastUpdate)
	{	
		this.speedLastUpdate = Math.floor(this.gAudio.context.currentTime);
		
		var decimal = Math.round( ((Math.round((this.wallsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.wallsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.1 : 0.2;

		this.particlesHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

		var decimal = Math.round( ((Math.round((this.portalsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.portalsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

		var decimal = Math.round( ((Math.round((this.cometsHolder.speed+0.1)*10)/10)%1) * 10 ) / 10;
		this.cometsHolder.speed += !( decimal==0 || decimal == 0.7 || decimal == 0.5  ) ? 0.05 : 0.1;

	}
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

	  /*
		_GAME ATMOSPHERE
	  */

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

	this.pointLight = new THREE.PointLight(0xffffff, 0.8, 500);
	this.pointLight.position.set(0, 2, 0);
	this.scene.add(this.pointLight);

	this.pLight = this.pointLight.clone();
	this.pLight.intensity = 0.6;
	this.pLight.position.set(0, -175, 0);
	this.scene.add(this.pLight)
}

	/*
		_GAME STATUS
	*/

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

	/* STARS */

	this.starsHolder.life = this.starsHolder.maxLife;
	for(var i=0; i<this.starsHolder.starsInUse.length; i++)
	{
		var star = this.starsHolder.starsInUse[i];
		star.mesh.position.set(0, 0, 0);
	}
	
	/* WALLS */

	this.wallsHolder.speed = 1;
	

	/* PORTALS */

	this.portalsHolder.portalLastSpawn = 0;
	this.portalsHolder.speed = 0.4;

	/* COMETS */

	this.cometsHolder.cometLastSpawn = 0;
	this.cometsHolder.speed = 0.6;

	/* PARTICLES */

	this.particlesHolder.speed = 0.5;

	/* SCORE */

	this.gScore.portalScore = 0;
	this.gScore.cometScore = 0;
	this.gScore.wallScore = 0;
	this.gScore.points = 0;
	this.gScore.score = 0;

	/* DOM */

	this.gDOM.score.points.innerHTML = 0;
	this.gDOM.score.life.style.width = '10vw';

	/* AUDIO */

}

	/*
		_FUNCTIONS
	*/

Game.prototype.load = function()
{
	this.gDOM.loadEvent();
	this.removeObjects();
}

Game.prototype.wait = function()
{
	if(isMobile.any())
	{	
		this.joystick.removeEvents();
	}

	this.gDOM.introEvent();

	this.particlesHolder.update();

	this.planetHolder.planet.mesh.rotation.y += 0.0005;
	this.planetHolder.planet.mesh.rotation.z += 0.005;

	this.planetHolder.atmosphere.mesh.rotation.x += 0.0005;
	this.planetHolder.atmosphere.mesh.rotation.y += 0.0005;

	this.planetHolder.rotateSatellites();
	this.planetHolder.moveFragments();
	this.cometsHolder.update();

	createjs.Tween.get(this.camera.position, {override:true})
        .to({y: -10}, 3000);
    createjs.Tween.get(this.camera.rotation, {override:true})
        .to({x: 25*Math.PI/180}, 2500);
}

Game.prototype.start = function()
{
	if(isMobile.any())
	{	
		this.joystick.addEvents();
	}

	this.gDOM.gameContainer.style.cursor = 'none';

	createjs.Tween.get(this.camera.position, {override:true})
        .to({y: 0}, 2500);
    createjs.Tween.get(this.camera.rotation, {override:true})
        .to({x: 0}, 2500);
	

	if(this.gAudio.context.state == "suspended")
    {
    	this.gAudio.context.resume();
    }

	this.status = 'playing';
}

Game.prototype.initStart = function()
{
	var _this = this;	

	this.resetVariables();
	this.resetObjects();
	this.gDOM.startEvent();
	this.gDOM.resetColors();

	this.addStars();
	this.scene.add(this.starsHolder.starsInUse[0].mesh);

	createjs.Tween.get(this.starsHolder.starsInUse[0].mesh.scale, {override:true})
    	.to({x: 1.5, y: 1.5, z: 1.5}, 200)
    	.call(function(){
    		createjs.Tween.get(_this.starsHolder.starsInUse[0].mesh.scale, {override:true})
          		.to({x: 1, y: 1, z: 1}, 100);
			if(_this.starsHolder.starsInUse.length > 1)
			{
				_this.scene.add(_this.starsHolder.starsInUse[1].mesh);
				createjs.Tween.get(_this.starsHolder.starsInUse[1].mesh.scale, {override:true})
          			.to({x: 0.1, y: 0.1, z: 0.1}, 100)
          			.call(function(){
          				createjs.Tween.get(_this.starsHolder.starsInUse[1].mesh.scale, {override:true})
          					.to({x: 1, y: 1, z: 1}, 100);
          		});
			}
    });

	this.status = 'start';
}

Game.prototype.end = function()
{

	if(this.wallsHolder.wallsInUse.length || this.portalsHolder.portalsInUse.length || this.cometsHolder.cometsInUse.length)
	{
		this.updateObjects();
	}
	else
	{
		var _this = this;

		createjs.Tween.get(this.starsHolder.starsInUse[0].mesh.scale, {override:true})
          .to({x: 2, y: 2, z: 2}, 200)
          .call(function(){
          		createjs.Tween.get(_this.starsHolder.starsInUse[0].mesh.scale, {override:true})
          			.to({x: 0.1, y: 0.1, z: 0.1}, 200)
          			.call(function(){
          					_this.scene.remove(_this.starsHolder.starsInUse[0].mesh);
							if(_this.starsHolder.starsInUse.length > 1)
							{
								createjs.Tween.get(_this.starsHolder.starsInUse[1].mesh.scale, {override:true})
         							.to({x: 2, y: 2, z: 2}, 200)
         							.call(function(){
         								createjs.Tween.get(_this.starsHolder.starsInUse[1].mesh.scale, {override:true})
          									.to({x: 0.1, y: 0.1, z: 0.1}, 200)
          									.call(function(){
          											_this.scene.remove(_this.starsHolder.starsInUse[1].mesh);
          								});
         						});
							}
          		});
         });

		this.gAudio.context.suspend();
		this.particlesHolder.speed = 0.1;
		this.gDOM.endEvent();
		this.status = 'waiting';
	}
}

Game.prototype.pause = function()
{
	if(isMobile.any())
	{	
		this.joystick.removeEvents();
	}

	createjs.Tween.get(this.camera.position, {override:true})
        .to({y: -10}, 2500);
    createjs.Tween.get(this.camera.rotation, {override:true})
        .to({x: 25*Math.PI/180}, 2500);

	this.gAudio.context.suspend();

	this.gDOM.pauseEvent();

	this.status = 'paused';
}

	/*
		_ADD OBJECTS
	*/

Game.prototype.addParticles = function()
{
	this.particlesHolder = new ParticlesHolder();

	this.particlesHolder.createParticles(0.2, true, 1, false, 0xffffff, true, 6, 60);

	this.scene.add(this.particlesHolder.mesh);
}

Game.prototype.addWalls = function()
{
	this.wallsHolder = new WallsHolder();

	this.wallsHolder.color = this.worldColor;

	for(var i=0; i<6; i++)
	{
		var wall = new Wall(this.wallsHolder.color);
		this.wallsHolder.wallsPool.push(wall);
	}

	this.gAudio.addObject(this.wallsHolder, 25, 150, 250);
	this.scene.add(this.wallsHolder.mesh);
}

Game.prototype.addPlanet = function()
{
	this.planetHolder = new PlanetHolder();

	this.planetHolder.color = this.objectsColor;

	this.planetHolder.mesh.position.z = -175;
	this.planetHolder.mesh.position.y = 125;

	this.planetHolder.createPlanet();
	this.planetHolder.createSatellites();
	this.planetHolder.createFragments();

	this.gAudio.addObject(this.planetHolder.atmosphere, 4, 0, 250);
	this.gAudio.addObject(this.planetHolder.planet, 4, 0, 250);

	this.scene.add(this.planetHolder.mesh);
}

Game.prototype.addPortals = function()
{
	this.portalsHolder = new PortalsHolder();

	this.portalsHolder.color = this.objectsColor;

	this.scene.add(this.portalsHolder.mesh);
}

Game.prototype.addComets = function()
{
	this.cometsHolder = new CometsHolder();

	this.cometsHolder.color = this.objectsColor;

	for(var i=0; i<6; i++)
	{
		var comet = new Comet(this.cometsHolder.color);
		this.cometsHolder.cometsPool.push(comet);
	}
	this.scene.add(this.cometsHolder.mesh);
}

Game.prototype.addStars = function()
{
	this.starsHolder = new StarHolder();
	if(this.mode == "twins")
	{
		this.starsHolder.createStar(this.objectsColor);
		this.starsHolder.createStar(this.objectsColor, true);
	}
	else
	{
		this.starsHolder.createStar(this.objectsColor);
	}
	
	this.scene.add(this.starsHolder.mesh);
}

	/*
	 	_HANDLE EVENTS 
	*/

Game.prototype.handleWindowResize = function()
{
	this.WIDTH = window.innerWidth;
	this.HEIGHT = window.innerHeight;
	this.aspectRatio = this.WIDTH/this.HEIGHT;

	this.renderer.setSize(this.WIDTH, this.HEIGHT);
	this.camera.aspect = this.aspectRatio;
	this.camera.updateProjectionMatrix();
}

Game.prototype.handleMouseClick = function()
{
	var _this = this;
	if(this.status == 'paused')
	{
			this.gDOM.pause.div.style.display = 'none';
			this.gDOM.gameContainer.style.opacity = 1;
			this.status = 'start';
	}
	else if(this.status == 'playing')
	{
		this.status = 'paused';
	}

	createjs.Tween.get(this.blurPass.params.delta, {override:true})
        .to({x: 50}, 250)
        .call(function(){
			createjs.Tween.get(_this.blurPass.params.delta, {override:true})
          		.to({x:0}, 250);
	});

}

Game.prototype.handleMouseMove = function(event)
{
	mx = (event.clientX / window.innerWidth) * 2 - 1;
	my = - (event.clientY / window.innerHeight) * 2 + 1;

  	var vector = new THREE.Vector3(mx, my, 0.5);
	vector.unproject( this.camera );
	var dir = vector.sub( this.camera.position ).normalize();
	var distance = - this.camera.position.z / dir.z;
	var pos = this.camera.position.clone().add( dir.multiplyScalar( distance  ) );

	this.mousePos.x = pos.x;
	this.mousePos.y = pos.y;
}

Game.prototype.events = function()
{
	var _this = this;
	window.addEventListener('resize', function(){ _this.handleWindowResize(); });
	window.addEventListener('click', function(){ _this.handleMouseClick(); });
	document.addEventListener('mousemove', _this.handleMouseMove.bind(_this), false);
}

/* _GLOBAL EVENTS */

window.addEventListener('load', init, false);

/* _GAME OBJECTS */

	/*
		DOM
	*/

GameDOM = function(game)
{
	this.game = game;

	this.intro = {
		title: document.getElementById("title"),
		subtitle: document.getElementById("subtitle"),
		description: document.getElementById("description"),
		play: document.getElementById("play"),
		sounds: document.getElementsByClassName("item"),
		choices: document.getElementsByClassName("choice"),
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

	this.progression = {
		text: document.getElementById("progressionText"),
		percent: document.getElementById("percent"),
		rect: document.getElementById("progressionRectFront"),
		div: document.getElementById("progression")
	}

	this.score = {
		points: document.getElementById("points"),
		text: document.getElementById("text"),
		life: document.getElementById("lifeRectFront"),
		div: document.getElementById("score")
	}
	this.loader = {
		div: document.getElementById("loader")
	}

	this.gameContainer = document.getElementById("gameContainer");
}

GameDOM.prototype.updateScore = function()
{
	this.score.points.innerHTML = this.game.gScore.score;
}

GameDOM.prototype.updateLife = function(starLife, maxStarLife)
{	
  	var l = 10*starLife/maxStarLife;
  	this.score.life.style.width = l+'vw';
}

GameDOM.prototype.updateProgression = function()
{
	this.progression.text.style.color = this.game.planetHolder.color.clear.replace('0x', '#');
	this.progression.rect.style.background = this.game.planetHolder.color.clear.replace('0x', '#');
	
	var p = Math.min(Math.floor(100 * this.game.gAudio.context.currentTime/this.game.gAudio.sound._duration), 100);
	this.progression.rect.style.width = p*0.1+'vw';
	this.progression.percent.innerHTML = p+' %';
}

GameDOM.prototype.introEvent = function()
{
	this.gameContainer.style.cursor = 'pointer';
	var _this = this;
	for (var i = 0; i < this.intro.sounds.length; i++) 
	{
   		this.intro.sounds[i].addEventListener('click', function(){ 
   																	if(!_this.game.gAudio.onLoad)
   																	{
   																		_this.game.gAudio.setSoundPath(this);
   																		_this.game.gAudio.change(_this); 
																		_this.game.gAudio.onLoad = !_this.game.gAudio.onLoad;
   																	}
   																
   																} , false);
	}
	for (var i = 0; i < this.intro.choices.length; i++) 
	{
   		this.intro.choices[i].addEventListener('click', function(){ 
   																	if(this.getAttribute('data-mode') != _this.game.mode)
   																	{	
	   																	this.classList.add("on");
	   																	_this.game.mode =  this.getAttribute('data-mode');
	   																	for (var j = 0; j < _this.intro.choices.length; j++)
	   																	{
	   																		if(_this.intro.choices[j] != this)
	   																		{
	   																			_this.intro.choices[j].classList.remove("on");
	   																		}
	   																	}
   																	}
   																} , false);
	}
}

GameDOM.prototype.endEvent = function()
{
	this.gameContainer.style.cursor = 'pointer';

	this.score.div.style.display ='none';
	this.scores.div.style.display = 'block';
	this.progression.div.style.display = 'block';

	this.scores.portals.innerHTML = this.game.gScore.portalScore;
	this.scores.comets.innerHTML = this.game.gScore.cometScore;
	this.scores.walls.innerHTML = this.game.gScore.wallScore;
	this.scores.total.innerHTML = this.game.gScore.score;

	this.game.joystick.reset();

	this.updateProgression();

	var _this = this;
	this.scores.replay.addEventListener('click', function(){
		_this.scores.div.style.display = 'none';
		_this.progression.div.style.display = 'none';

		if(!_this.game.gAudio.onLoad)
   		{
   			_this.game.gAudio.change(_this); 
			_this.game.gAudio.onLoad = !_this.game.gAudio.onLoad;
   		}
	});

	this.scores.change.addEventListener('click', function(){
		_this.scores.div.style.display = 'none';
		_this.progression.div.style.display = 'none';
		_this.intro.div.style.display = 'block';
		_this.game.resetVariables();
		for(var i=0; i<_this.game.starsHolder.starsInUse.length; i++)
		{
			var star = _this.game.starsHolder.starsInUse[i];
			_this.game.scene.remove(star.mesh);
		}
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

	this.pause.replay.addEventListener('click', function(){
		_this.pause.div.style.display = 'none';
		_this.gameContainer.style.opacity = 1;

		if(!_this.game.gAudio.onLoad)
   		{
   			_this.game.gAudio.change(_this); 
			_this.game.gAudio.onLoad = !_this.game.gAudio.onLoad;
   		}
	});

	this.pause.change.addEventListener('click', function(){
		_this.pause.div.style.display = 'none';
		_this.gameContainer.style.opacity = 1;
		_this.score.div.style.display = 'none';
		_this.intro.div.style.display = 'block';
		_this.game.resetVariables();
		for(var i=0; i<_this.game.starsHolder.starsInUse.length; i++)
		{
			var star = _this.game.starsHolder.starsInUse[i];
			_this.game.scene.remove(star.mesh);
		}
		_this.game.status = 'waiting';
	});
}

GameDOM.prototype.loadEvent = function()
{
	this.loader.div.style.display = 'block';
	this.pause.div.style.display = 'none';
	this.gameContainer.style.opacity = 1;
	this.score.div.style.display = 'none';
	this.intro.div.style.display = 'none';
	this.progression.div.style.display = 'none';
}

GameDOM.prototype.startEvent = function()
{
	this.loader.div.style.display = 'none';
}

GameDOM.prototype.resetColors = function()
{
	this.score.text.style.color = this.game.planetHolder.color.clear.replace('0x', '#');
	this.score.life.style.background = this.game.planetHolder.color.clear.replace('0x', '#');
}

	/*
		_SCORE
	*/

GameScore = function(gAudio)
{
	this.gAudio = gAudio;

	this.score = 0, this.wallScore = 0, this.cometScore = 0, this.portalScore = 0;
	this.wallPoints = -1500, this.cometPoints = 100, this.portalPoints = 1000;
	this.points = 0;
}

GameScore.prototype.update = function()
{
	this.score = Math.max(0, Math.floor( (this.gAudio.context.currentTime*10) + this.points));
}


GameScore.prototype.wallScoreUpdate = function()
{
	this.wallScore++;
	this.points = Math.max(0, this.points+this.wallPoints);
}

GameScore.prototype.cometScoreUpdate = function()
{
	this.cometScore++;
	this.points = Math.max(0, this.points+this.cometPoints);
}

GameScore.prototype.portalScoreUpdate = function()
{
	this.portalScore++;
	this.points = Math.max(0, this.points+this.portalPoints);
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
	this.webaudio, this.sound, this.context;
	this.soundPath, this.onLoad = false;
}

GameAudio.prototype.addObject = function(object, threshold, min, max)
{
	object.threshold = threshold;
	object.baseThreshold = object.threshold*3;
	object.decayRate = object.threshold/10;
	object.fMin = min;
	object.fMax = max;
}

GameAudio.prototype.update = function(game)
{
	if(this.context.currentTime >= this.sound._duration)
	{
		if(game.status == 'playing')
		{
	   		game.status = 'finished';
		}
	}
}

GameAudio.prototype.getMag = function(min, max)
{
	return this.sound.magnitude(min, max);
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

GameAudio.prototype.change = function(gDOM)
{
	gDOM.game.status = 'loading';
	
	if(this.webaudio && this.sound)
	{
		this.webaudio.destroy();
		this.sound.destroy();
	}

	this.webaudio	= new WebAudio();
	this.sound	= this.webaudio.createSound();
	this.context = this.sound._context;
	this.context.suspend();

	var _this = this;

	this.sound.load(this.soundPath, function(sound){
		gDOM.game.status = 'init';
		_this.onLoad = !_this.onLoad;
   		gDOM.intro.div.style.display = 'none';
		gDOM.score.div.style.display = 'block';
		sound.loop(false).play();
	});
}

GameAudio.prototype.setSoundPath = function(item)
{
	var src = item.getAttribute('data-sound');
	this.soundPath = 'assets/sounds/'+src;
}
	/*
		_PARTICLES
	*/

Particle = function(x, y, z)
{
	this.mesh = new THREE.Vector3(x, y, z);
}

Particles = function(size, transparent, opacity, vertexColors, sizeAttenuation, color)
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
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
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

ParticlesHolder.prototype.createParticles = function(size, transparent, opacity, vertexColors, sizeAttenuation, color, number, range)
{	
	var particles = new Particles(size, transparent, opacity, vertexColors, sizeAttenuation, color);
	particles.create(number, range);
	this.particlesInUse.push(particles.points);
	this.mesh.add(particles.points);
}

ParticlesHolder.prototype.update = function()
{
	for(var i=0; i<this.particlesInUse.length; i++)
	{
		var speed = 0.5;
		this.particlesInUse[i].geometry.vertices.forEach(function(particle){
			
			
			particle.z += speed;
				
			if(particle.z > 15)
			{
				particle.x = Math.random() * 100 - 100 / 2;
				particle.y = Math.random() * 100 - 100 / 2;
				particle.z = Math.random()*(-100+150)-150;
			}
		});
		this.particlesInUse[i].geometry.verticesNeedUpdate = true;
	}
}

ParticlesHolder.prototype.wallExplode = function(mesh) {
           
    var particleMesh = new Particles(0.6, true, 1, false, true, 0xffffff);
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

Wall = function(color)
{
	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var material = new THREE.MeshPhongMaterial({
		color: color.dark.replace('0x', '#'),
		specular: color.clear.replace('0x', '#'),
		transparent: true,
		opacity: 0.8
	});
	this.mesh = new THREE.Mesh(geometry, material);
	this.angle = 0;
	this.height = 0;
}

WallsHolder = function(color)
{
	this.mesh = new THREE.Object3D();
	this.wallsInUse = [];
	this.wallsPool = [];
	this.wallsList = [];

	this.color;
	this.speed = 1;
}

WallsHolder.prototype.spawnWalls = function()
{
	var numWalls = 1;
	if(this.wallsInUse.length < 6)
	{
	for(var i=0; i<numWalls; i++)
	{
		if(this.wallsPool.length)
		{
			wall = this.wallsPool.pop();
		}
		else
		{
			wall = new Wall(this.color);
		}

		wall.angle = Math.random()*Math.PI*2/numWalls;
		wall.height = 25;
		wall.mesh.position.x = Math.cos(wall.angle)*wall.height;
		wall.mesh.position.y = Math.sin(wall.angle)*wall.height;
		wall.mesh.position.z = -100;
		wall.mesh.scale.z = 0.1;

		wall.mesh.lookAt(new THREE.Vector3( (Math.random()*(25+25)-25) , (Math.random()*(25+25)-25) , wall.mesh.position.z));

		createjs.Tween.get(wall.mesh.scale, {override:true})
        	.to({z: 250}, (1/this.speed)*1000);

		this.mesh.add(wall.mesh);
		this.wallsInUse.push(wall);
		this.wallsList.push(wall.mesh);
	}
	}
}

WallsHolder.prototype.update = function()
{
	for(var i=0; i<this.wallsInUse.length; i++)
	{
		var wall = this.wallsInUse[i];

		wall.mesh.position.z += this.speed;

		if(wall.mesh.position.z < 5 + this.speed*2 && wall.mesh.position.z > 5)
		{
			createjs.Tween.get(wall.mesh.scale, {override:true})
         		.to({z: 0.1}, (1/this.speed)*0.2*100);
		}
		if(wall.mesh.position.z > 15)
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
	this.color = gColor.getRandom();

	for(var i=0; i<this.wallsPool.length; i++)
	{
		var wall = this.wallsPool[i];
		gColor.setObjectColor(this.color.dark, wall.mesh);
	}

	for(var i=0; i<this.wallsInUse.length; i++)
	{
		var wall = this.wallsInUse[i];
		gColor.setObjectColor(this.color.dark, wall.mesh);
	}
}


	/*
		_PLANET
	*/

		/*
			_ATMOSPHERE
		*/

Atmosphere = function(color)
{
	var geometry = new THREE.DodecahedronGeometry(100, 1);
	var material = new THREE.MeshPhongMaterial({
													color: color.clear.replace('0x', '#'), 
													specular: color.clear.replace('0x', '#'),
													transparent: true, 
													opacity: 0.6,
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

	createjs.Tween.get(this.mesh.scale, {override:true})
          .to({x: value, y: value, z: value}, 100);
}

Planet = function(color)
{
	var geometry = new THREE.DodecahedronGeometry(75, 1);
	var material = new THREE.MeshPhongMaterial({
												color: color.clear.replace('0x', '#'), 
												/*specular: color.clear.replace('0x', '#'),*/
												transparent: true, 
												opacity: 0.6,
											});

	var wireframeMaterial = new THREE.MeshPhongMaterial({
												color: color.dark.replace('0x', '#'), 
												/*specular: color.clear.replace('0x', '#'),*/
												transparent: true, 
												opacity: 0.6,
												wireframe: true
											});


	this.mesh = new THREE.SceneUtils.createMultiMaterialObject(geometry, [material, wireframeMaterial]);
}

Planet.prototype.move = function(gAudio)
{
	var value = 1;
	if(gAudio.check(this))
	{
		value += gAudio.magnitude*0.008;
	}

	createjs.Tween.get(this.mesh.scale, {override:true})
    	.to({x: 1/value, y: 1/value, z: 1/value}, 100);
}

		/*
			_SATELLITE
		*/

Satellite = function(radius, color)
{
	var geometry = new THREE.DodecahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: color.dark.replace('0x', '#'),
												specular: color.dark.replace('0x', '#'),
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

Fragment = function(radius, color)
{
	var geometry = new THREE.IcosahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: color.clear.replace('0x', '#'),
												specular: color.clear.replace('0x', '#'),
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

	this.color;

	this.numSatellites = 10;
	this.satellitesInUse = [];

	this.numFragments = 20;
	this.fragmentsInUse = [];
}

PlanetHolder.prototype.createPlanet = function()
{
	this.planet = new Planet(this.color);
	this.atmosphere = new Atmosphere(this.color);

	this.mesh.add(this.planet.mesh);
	this.mesh.add(this.atmosphere.mesh);
}

PlanetHolder.prototype.createSatellites = function()
{
	var step = Math.PI*2/this.numSatellites;
	for(var i=0; i<this.numSatellites; i++)
	{
		var radius = Math.random()*(2-0.5)+0.5;
		var satellite = new Satellite(radius, this.color);

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
		var fragment = new Fragment(radius, this.color);

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

PlanetHolder.prototype.update = function(gAudio)
{
	this.atmosphere.move(gAudio);
	this.planet.move(gAudio);

	this.planet.mesh.rotation.y += 0.0005;
	this.planet.mesh.rotation.z += 0.005;

	this.atmosphere.mesh.rotation.x += 0.0005;
	this.atmosphere.mesh.rotation.y += 0.0005;

	this.rotateSatellites();
	this.moveFragments();
}

PlanetHolder.prototype.resetColor = function(gColor)
{
	this.color = gColor.getRandom();

	gColor.setObjectColor(this.color.clear, this.planet.mesh.children[0]);
	gColor.setObjectColor(this.color.clear, this.planet.mesh.children[1]);

	gColor.setObjectColor(this.color.clear, this.atmosphere.mesh);

	for(var i=0; i<this.satellitesInUse.length; i++)
	{
		var satellite = this.satellitesInUse[i];
		gColor.setObjectColor(this.color.dark, satellite.mesh);
	}

	for(var i=0; i<this.fragmentsInUse.length; i++)
	{
		var fragment = this.fragmentsInUse[i];
		gColor.setObjectColor(this.color.clear, fragment.mesh);
	}
}

	/*
		_PORTAL
	*/

PortalLayer = function(radius, tube, tubularSegments, color)
{
	var geomLayer = new THREE.TorusGeometry(radius, tube, 2, tubularSegments);
	var matLayer = new THREE.MeshPhongMaterial({
													color: color.replace('0x', '#'), 
													specular: color.replace('0x', '#'),
													transparent: true,
													opacity: 0.8,
													side: THREE.DoubleSide
												});
	this.mesh = new THREE.Mesh(geomLayer, matLayer);
}

Portal = function(color)
{
	this.mesh = new THREE.Object3D();

	this.layersInUse = [];
	this.numLayers = 5;

	var tubularSegments = Math.floor(Math.random()*(6-3)+3);

	for(var i=1; i<this.numLayers+1; i++)
	{
		var radius = i*0.2;
		var tube = radius*0.1;

		if(i%2==0)
		{
			layer = new PortalLayer(radius, tube, tubularSegments, '0xecf0f1');
		}
		else
		{
			layer = new PortalLayer(radius, tube, tubularSegments, color.clear);
		}

		this.mesh.add(layer.mesh);
		this.layersInUse.push(layer);
	}

	var geometry = new THREE.CircleGeometry(1.2, tubularSegments);
	var material = new THREE.MeshPhongMaterial({
													color: color.clear.replace('0x', '#'),
													specular: color.clear.replace('0x', '#'),
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

	this.color;

	this.portalLastSpawn = 0;
	this.speed = 0.4;
}


PortalsHolder.prototype.spawnPortals = function(spawnTime)
{
	this.portalLastSpawn = spawnTime;

	portal = new Portal(this.color);

	portal.mesh.position.x =  Math.random()*(6+6)-6;
	portal.mesh.position.y = Math.random()*(3+3)-3;
	portal.mesh.position.z = -100;

	portal.mesh.scale.set(0.1, 0.1, 0.1);

	createjs.Tween.get(portal.mesh.scale, {override:true})
    	.to({x: 1.5, y: 1.5, z: 1.5}, 1000);

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

	this.color = color;

	for(var i=0; i<this.portalsInUse.length; i++)
	{
		var portal = this.portalsInUse[i];
		for(var j=0; j<portal.layersInUse.length; j++)
		{
			var layer = portal.layersInUse[j];
			if(((j+1)%2)==0)
				gColor.setObjectColor('0xecf0f1', layer.mesh);
			else
				gColor.setObjectColor(color.clear, layer.mesh);
		}
	}
}

	/*
		_COMET
	*/

		/*
			_COMA
		*/

Coma = function(color)
{
	this.mesh = new THREE.Object3D();

	var geomFirstPoint = new THREE.IcosahedronGeometry(0.1, 0);
	var matFirstPoint = new THREE.MeshPhongMaterial({
													color: color.dark.replace('0x', '#'), 
													specular: color.dark.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.firstPoint = new THREE.Mesh(geomFirstPoint, matFirstPoint);

	var geomSecondPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matSecondPoint = new THREE.MeshPhongMaterial({
													color: color.dark.replace('0x', '#'), 
													specular: color.dark.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.secondPoint = new THREE.Mesh(geomSecondPoint, matSecondPoint);

	var geomThirdPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matThirdPoint = new THREE.MeshPhongMaterial({
													color: color.dark.replace('0x', '#'), 
													specular: color.dark.replace('0x', '#'), 
													transparent: true, 
													opacity: 1,
													wireframe: false
												});
	this.thirdPoint = new THREE.Mesh(geomThirdPoint, matThirdPoint);

	var geomFourthPoint = new THREE.IcosahedronGeometry(0.1, 1);
	var matFourthPoint = new THREE.MeshPhongMaterial({
													color: color.dark.replace('0x', '#'), 
													specular: color.dark.replace('0x', '#'), 
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

CometCore = function(color)
{
	var geometry = new THREE.DodecahedronGeometry(0.2, 0);
	var material = new THREE.MeshPhongMaterial({
												color: color.clear.replace('0x', '#'), 
												specular: color.clear.replace('0x', '#'),
												transparent: true, 
												opacity: 0.8,
											});

	var wireframeMaterial = new THREE.MeshPhongMaterial({
												color: color.clear.replace('0x', '#'), 
												specular: color.clear.replace('0x', '#'),
												transparent: true, 
												opacity: 0.8,
												wireframe: true
											});


	this.mesh = new THREE.SceneUtils.createMultiMaterialObject(geometry, [material, wireframeMaterial]);
}

Comet = function(color)
{
	this.mesh = new THREE.Object3D();

	this.core = new CometCore(color);
	this.mesh.add(this.core.mesh);

	this.coma = new Coma(color);
	this.coma.mesh.position.x = this.core.mesh.position.x;
	this.coma.mesh.position.y = this.core.mesh.position.y;
	this.coma.mesh.position.z = this.core.mesh.position.z;
	this.mesh.add(this.coma.mesh);

	var geometry = new THREE.DodecahedronGeometry(0.4, 0);
	var material = new THREE.MeshPhongMaterial({
												color: '#ffffff', 
												specular: '#ffffff',
												transparent: true, 
												opacity: 0.2,
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

	this.color;

	this.cometLastSpawn = 0;
	this.speed = 0.6;
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
			comet = new Comet(this.color);
		}

		comet.mesh.position.x = Math.random()*(6+6)-6;
		comet.mesh.position.y = Math.random()*(3+3)-3;
		comet.mesh.position.z = -100;

		comet.mesh.scale.set(0.1, 0.1, 0.1);

		createjs.Tween.get(comet.mesh.scale, {override:true})
    		.to({x: 1.5, y: 1.5, z: 1.5}, 1000);

		this.mesh.add(comet.mesh);
		this.cometsList.push(comet.collisionMesh);
		this.cometsInUse.push(comet);
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

	this.color = color;

	for(var i=0; i<this.cometsPool.length; i++)
	{
		var comet = this.cometsPool[i];
		gColor.setObjectColor(this.color.dark, comet.coma.firstPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.secondPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.thirdPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.fourthPoint);		
		gColor.setObjectColor(this.color.clear, comet.core.mesh.children[0]);
		gColor.setObjectColor(this.color.clear, comet.core.mesh.children[1]);
	}

	for(var i=0; i<this.cometsInUse.length; i++)
	{
		var comet = this.cometsInUse[i];
		gColor.setObjectColor(this.color.dark, comet.coma.firstPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.secondPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.thirdPoint);
		gColor.setObjectColor(this.color.dark, comet.coma.fourthPoint);		
		gColor.setObjectColor(this.color.clear, comet.core.mesh.children[0]);
		gColor.setObjectColor(this.color.clear, comet.core.mesh.children[1]);
	}
}

	/*
		_STAR
	*/

		/*
			_RING
		*/

Ring = function(color, radius, tube, tubularSegments, opacity)
{
	this.speed = 0.05;

	var geomRing = new THREE.TorusGeometry(radius, tube, 2, tubularSegments);
	var matRing = new THREE.MeshPhongMaterial({
													color: color.clear.replace('0x', '#'), 
													/*specular: color.clear.replace('0x', '#'),*/
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
}

Star = function(color)
{
	this.mesh = new THREE.Object3D();

	this.numRings = 12;
	this.tubularSegments = 20
	this.ringsInUse = [];
	this.negative = false;

	for(var i=1; i<this.numRings+1; i++)
	{
		var radius = i*0.08;
		var tube = radius*0.08;
		var speed = Math.random()*(0.1-0.05)+0.05;

		var ring = new Ring(color, radius, tube, this.tubularSegments, 0.8);
		ring.mesh.rotation.x = (Math.random()*360)*Math.PI/180;

		ring.speed = speed;

		this.ringsInUse.push(ring);
		this.mesh.add(ring.mesh);
	}

	var geomCore = new THREE.SphereGeometry(0.03, 10, 10);
	var matCore = new THREE.MeshPhongMaterial({color: '#ffffff',wireframe: true});
	this.core = new THREE.Mesh(geomCore, matCore);
	this.mesh.add(this.core);
}

Star.prototype.move = function(mousePos, joystick, limit)
{
	for(var i=0; i<this.numRings; i++)
	{
		var ring = this.ringsInUse[i];
		ring.rotate();
	}

	if(isMobile.any())
	{
		var joystickPos = {
			x: this.mesh.position.x,
			y: this.mesh.position.y
		}

		joystickPos.x = joystickPos.x + (!this.negative ? joystick.deltaX()*(0.05) : joystick.deltaX()*(-0.05));
		joystickPos.y = joystickPos.y + (!this.negative ? joystick.deltaY()*(-0.05) : joystick.deltaY()*(0.05));

		createjs.Tween.get(this.mesh.position, {override: true})
          .to({x: !( (joystickPos.x > limit.x) || (joystickPos.x < -limit.x) ) ? joystickPos.x : (joystickPos.x = Math.sign(joystickPos.x)*1*limit.x), y: !( (joystickPos.y > limit.y) || (joystickPos.y < -limit.y) ) ? joystickPos.y : (joystickPos = Math.sign(joystickPos.y)*1*limit.y)}, 500);
	}
	else
	{
		createjs.Tween.get(this.mesh.position,{override:true})
          .to({x: !this.negative ? mousePos.x : -mousePos.x, y: !this.negative ? mousePos.y : -mousePos.y}, 500);
	}
}

StarHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.starsInUse = [];
	this.maxLife = 12;
	this.life = this.maxLife;
	this.limit = {
		x: 20,
		y: 12
	};
}

StarHolder.prototype.update = function(mousePos, joystick)
{
	for(var i=0; i<this.starsInUse.length; i++)
	{
		var star = this.starsInUse[i];
		star.move(mousePos, joystick, this.limit);

		if(this.starsInUse.length > 1 && !joystick._pressed && isMobile.any())
		{
			createjs.Tween.get(star.mesh.position,{override:true})
          		.to({x: 0, y: 0}, 50);
		}
	}
}

StarHolder.prototype.resetColor = function(gColor, color)
{
	for(var i =0; i<this.starsInUse.length; i++)
	{
		var star = this.starsInUse[i]
		for(var j=0; j<star.ringsInUse.length; j++)
		{
			var ring = star.ringsInUse[j];
			gColor.setObjectColor(color.clear, ring.mesh);
		}
	}
}

StarHolder.prototype.createStar = function(color, negative=false)
{
	var star = new Star(color);
	star.negative = negative;
	this.starsInUse.push(star);
}

	/*
		_COLLISIONS
	*/

GameCollision = function(game)
{
	this.game = game;
}

GameCollision.prototype.update = function()
{
	var _this = this;
	for(var i=0; i<this.game.starsHolder.starsInUse.length; i++)
	{
		var star = this.game.starsHolder.starsInUse[i];
		var originPoint = star.mesh.position.clone();
		for(var j=0; j<star.ringsInUse.length; j++)
		{
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

							this.game.planetHolder.resetColor(this.game.gColor);
							this.game.starsHolder.resetColor(this.game.gColor, this.game.planetHolder.color);
							this.game.cometsHolder.resetColor(this.game.gColor, this.game.planetHolder.color);
							this.game.portalsHolder.resetColor(this.game.gColor, this.game.planetHolder.color);
							this.game.wallsHolder.resetColor(this.game.gColor);
							this.game.renderer.setClearColor(this.game.wallsHolder.color.clear.replace('0x', '#'));

							this.game.objectsColor = this.game.planetHolder.color;
							this.game.worldColor = this.game.wallsHolder.color;

							this.game.portalsHolder.portalsList.splice(this.game.portalsHolder.portalsList.indexOf(collisionMesh), 1);

							createjs.Tween.get(portal.mesh.scale,{override:true})
          						.to({x: 200, y: 200, z: 200}, 100)
          						.call(function(){
									_this.game.portalsHolder.mesh.remove(portal.mesh);
									createjs.Tween.get(_this.game.blurPass.params.delta,{override:true})
        							  .to({x: 50}, 250)
        							  .call(function(){
										createjs.Tween.get(_this.game.blurPass.params.delta,{override:true})
         								 .to({x:0}, 250);
									});
							});

							this.game.gScore.portalScoreUpdate();
							this.game.gDOM.resetColors();
						}
					}
					
					if(this.game.wallsHolder.wallsList.length)
					{
						var wallsCollision = ray.intersectObjects( this.game.wallsHolder.wallsList );
						if ( wallsCollision.length > 0 && wallsCollision[0].distance < directionVector.length() )
						{

							 createjs.Tween.get(star.mesh.scale,{override:true})
        					  .to({x: 2, y: 2, z: 2}, 100)
        					  .call(function(){
								createjs.Tween.get(star.mesh.scale,{override:true})
          							.to({x: 1, y: 1, z: 1}, 200);
							});

							var wall = wallsCollision[0].object;
							
							this.game.wallsHolder.wallsPool.unshift(this.game.wallsHolder.wallsInUse.splice(this.game.wallsHolder.wallsList.indexOf(wall), 1)[0]);
							this.game.wallsHolder.wallsList.splice(this.game.wallsHolder.wallsList.indexOf(wall), 1);
							var particleWall = this.game.particlesHolder.wallExplode(wall);
	
							this.game.wallsHolder.mesh.remove(wall);
							this.game.scene.add(particleWall);

							createjs.Tween.get(particleWall.material,{override:true})
        					  .to({size: 0.}, 2000)
        					  .call(function(){
        					  	_this.game.scene.remove(particleWall);
        					 })
        					  .addEventListener('change', function(){
        					  	particleWall.geometry.verticesNeedUpdate = true;
        					  });

						    for(var i=0; i<particleWall.geometry.vertices.length; i++)
						    {
						    	var point = particleWall.geometry.vertices[i];

						    	createjs.Tween.get(point, {override:true})
         							.to({x: Math.random()*(50+50)-50, y: Math.random()*(50+50)-50, z: Math.random()*(50+50)-50}, 10000);
						    }
						    if(this.game.starsHolder.life > 0)
						    {
							    this.game.starsHolder.life--;
							    this.game.gScore.wallScoreUpdate();
							    this.game.gDOM.updateLife(this.game.starsHolder.life, this.game.starsHolder.maxLife);
						    }
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
							createjs.Tween.get(this.game.ambientLight, {override:true})
         							.to({intensity: 0.6}, 500);

							var starMesh = star.mesh;

							createjs.Tween.get(starMesh.scale, {override:true})
         						.to({x: 0.1, y: 0.1, z: 0.1}, 50)
         						.call(function(){
									createjs.Tween.get(starMesh.scale, {override:true})
         							.to({x: 1, y: 1, z: 1}, 150);
							});

							this.game.cometsHolder.mesh.remove(comet.mesh);
							this.game.gScore.cometScoreUpdate();
						}
					}

				}
		}	
	}
}

/* LOOP */

function loop()
{
	if(game.status == 'playing')
	{
		game.update();
	}
	else if(game.status == 'finished')
	{
		game.end();
	}
	else if(game.status == 'paused')
	{
		game.pause();
	}
	else if(game.status == 'waiting')
	{
		game.wait();
	}
	else if(game.status == 'init')
	{
		game.initStart(); /* Add objects removed by game.load() */
	}
	else if(game.status == 'start')
	{
		game.start();
	}
	else if(game.status == 'loading')
	{
		/* LOADING ANIMATION (remove objects and show loader)*/
		game.load();
		
	}

	game.render();
	requestAnimationFrame(loop);
}


/* _INITIALIZATION */

var game;

function init()
{
	game = new Game();

	game.initVariables();
	game.createObjects();

	loop();
}