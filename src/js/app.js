
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
	this.container = document.getElementById('world');

	//this.scene.setGravity(new THREE.Vector3(0, 0, 0));
	this.camera.position.z = 10;
	this.renderer.setSize(this.WIDTH, this.HEIGHT);
	this.renderer.setPixelRatio(window.devicePixelRatio);
	this.renderer.setClearColor(0x9b59b6);
	this.container.appendChild(this.renderer.domElement);

	this.gAudio = new GameAudio();
	this.gAudio.setUp();

	this.postprocessing();
	this.lights();
}

	/*
		_FUNCTIONS
	*/

Game.prototype.update = function()
{
	/*this.newTime = new Date().getTime();
	this.deltaTime = this.newTime-this.oldTime;
	this.oldTime = this.newTime;*/

	//this.scene.simulate();
	this.gAudio.update();
	this.particlesHolder.update();

	if(this.gAudio.check(this.wallsHolder))
	{
		this.wallsHolder.spawnWalls();
	}

	this.wallsHolder.update();

	this.planetHolder.atmosphere.move(this.gAudio);
	this.planetHolder.planet.move(this.gAudio);

	this.planetHolder.rotateSatellites();
	this.planetHolder.moveFragments();

	this.render();
}

Game.prototype.render = function()
{
	this.composer.reset();
	this.composer.render( this.scene, this.camera );
	this.composer.pass( this.noisePass );
	this.composer.pass( this.fxaaPass );
	this.composer.pass( this.vignettePass );
	this.composer.toScreen();
}

Game.prototype.createObjects = function()
{
	this.addParticles();
	this.addWalls();

	this.addPlanet();
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

Game.prototype.addWalls = function()
{
	this.wallsHolder = new WallsHolder();

	for(var i=0; i<10; i++)
	{
		var wall = new Wall();
		this.wallsHolder.wallsPool.push(wall);
	}

	this.gAudio.addObject(this.wallsHolder, 25, 200, 250);
	this.scene.add(this.wallsHolder.mesh);
}

Game.prototype.addPlanet = function()
{
	this.planetHolder = new PlanetHolder();
	this.planetHolder.mesh.position.z = -175;
	this.planetHolder.mesh.position.y = 125;

	this.planetHolder.createSatellites();
	this.planetHolder.createFragments();

	this.gAudio.addObject(this.planetHolder.atmosphere, 4, 0, 250);
	this.gAudio.addObject(this.planetHolder.planet, 4, 0, 250);

	this.scene.add(this.planetHolder.mesh);
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
	var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	this.scene.add(ambientLight);

	var pointLight = new THREE.PointLight(0xffffff, 0.8);
	pointLight.position.set(-5, 5, 5);
	this.scene.add(pointLight);
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

// _EVENTS //

window.addEventListener('load', init, false);

window.addEventListener('resize', function(){
	game.handleWindowResize();
});

window.addEventListener('click', function(){
	if(game.gAudio.audio.paused)
	{
		game.gAudio.audio.play();
	}
	else
	{
		game.gAudio.audio.pause();
	}	
});

// GAME OBJECTS //

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
	this.createParticles(number, range);
}

Particles.prototype.createParticles = function(number, range)
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
        context.fillRect(0, 0, canvas.width, canvas.height);
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
}

ParticlesHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.particlesInUse = [];
}

ParticlesHolder.prototype.createParticles = function(size=0.4, transparent=true, opacity=0.2, vertexColors=false, sizeAttenuation=true, color=0xffffff, number=10, range=50)
{	
	var particles = new Particles(size, transparent, opacity, vertexColors, sizeAttenuation, color, number, range);
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

	/*
		_WALLS
	*/

Wall = function()
{
	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var material = new THREE.MeshPhongMaterial({
		color: 0x8e44ad,
		specular: 0x8e44ad,
		transparent: true,
		opacity: 0.8
	});
	this.mesh = new THREE.Mesh(geometry, material);
	this.angle = 0;
	this.height = 0;
}

WallsHolder = function()
{
	this.mesh = new THREE.Object3D();
	this.wallsInUse = [];
	this.wallsPool = [];
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
			wall = new Wall();
		}

		wall.angle = Math.random()*Math.PI*2/numWalls;
		wall.height = 50;
		wall.mesh.position.x = Math.cos(wall.angle)*wall.height;
		wall.mesh.position.y = Math.sin(wall.angle)*wall.height;
		wall.mesh.position.z = -75;

		wall.mesh.lookAt(new THREE.Vector3( (Math.random()*(25+25)-25) , (Math.random()*(25+25)-25) , wall.mesh.position.z));

		TweenMax.to(wall.mesh.scale, 1, {z: 250});

		this.mesh.add(wall.mesh);
		this.wallsInUse.push(wall);
	}
}

WallsHolder.prototype.update = function()
{
	var speed = 0.5;

	for(var i=0; i<this.wallsInUse.length; i++)
	{
		var wall = this.wallsInUse[i];

		wall.mesh.position.z += speed;

		if(wall.mesh.position.z > -5 - speed*2 && wall.mesh.position.z < -5)
		{
			TweenMax.to(wall.mesh.scale, (1/speed)*0.2, {z: 0.1});
		}
		if(wall.mesh.position.z > 10)
		{
			this.wallsPool.unshift(this.wallsInUse.splice(i, 1)[0]);
			this.mesh.remove(wall.mesh);
			i--;
		}
	}
}


	/*
		_PLANET
	*/

		/*
			_ATMOSPHERE
		*/

Atmosphere = function()
{
	var geometry = new THREE.DodecahedronGeometry(100, 1);
	var material = new THREE.MeshPhongMaterial({
													color: 0xe74c3c, 
													//specular: 0x3498db, 
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
	TweenMax.to(this.mesh.scale, 0.25, {x: value, y: value, z: value});

	this.mesh.rotation.x += 0.0005;
	this.mesh.rotation.y += 0.0005;
}

Planet = function()
{
	var geometry = new THREE.DodecahedronGeometry(75, 1);
	var material = new THREE.MeshPhongMaterial({
												color: 0xe74c3c, 
												//specular: 0x3498db, 
												transparent: true, 
												opacity: 0.4,
											});

	var wireframeMaterial = new THREE.MeshPhongMaterial({
												color: 0xe74c3c, 
												//specular: 0x3498db, 
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
	TweenMax.to(this.mesh.scale, 0.25, {x: 1/value, y: 1/value, z: 1/value});

	this.mesh.rotation.y += 0.0005;
	this.mesh.rotation.z += 0.005;
}

		/*
			_SATELLITE
		*/

Satellite = function(radius)
{
	var geometry = new THREE.DodecahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: 0xc0392b,
												specular: 0xc0392b,
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

Fragment = function(radius)
{
	var geometry = new THREE.IcosahedronGeometry(radius, 0);
	var material = new THREE.MeshPhongMaterial({
												color: 0xecf0f1,
												specular: 0xecf0f1,
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

	this.numSatellites = 10;
	this.satellitesInUse = [];

	this.numFragments = 20;
	this.fragmentsInUse = [];

	this.planet = new Planet();
	this.atmosphere = new Atmosphere();

	this.mesh.add(this.planet.mesh);
	this.mesh.add(this.atmosphere.mesh);
}

PlanetHolder.prototype.createSatellites = function()
{
	var step = Math.PI*2/this.numSatellites;
	for(var i=0; i<this.numSatellites; i++)
	{
		var radius = Math.random()*(2-0.5)+0.5;
		var satellite = new Satellite(radius);

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
		var fragment = new Fragment(radius);

		fragment.speed = Math.random()*(0.5-0.1)+0.1;

		fragment.mesh.position.x = Math.random()*(350+350)-350;
		fragment.mesh.position.y = Math.random()*(400+400)-400;
		fragment.mesh.position.z = Math.random()*(-50+50)-50;

		this.mesh.add(fragment.mesh);
		this.satellitesInUse.push(fragment);
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

// _LOOP //

function loop()
{
	game.update();

	requestAnimationFrame(loop);
}

// _INITIALIZATION //

var game;

function init()
{
	game = new Game();

	game.initVariables();
	game.createObjects();

	loop();
}