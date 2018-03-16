var container;
var camera, scene, renderer, directionalLight1, directionalLight2;
var clock = new THREE.Clock();
var shapes;
var shapeSize = 0.08;
var isResetting = false;

var bigTetra;
var deformationRange = 0.2;

var PI = Math.PI;
var angle = 50;
var radius = 0.02;
var cos = Math.cos;
var sin = Math.sin;

// sound reactivity

var fftSize = 64;
var soundReactive = false;
var context;
var source, sourceJs;
var microphone;
var analyser;
var buffer;
var byteArray = new Array();

var total = 0;
var maxTotal = 0;
var threshhold = maxTotal - (maxTotal * 0.1);

function init() {

  container = document.querySelector('.three-container');

  renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2;
  scene = new THREE.Scene();

  var lightColor1 = tinycolor.random();
  var lightColor2 = lightColor1.complement();

  TweenMax.set(document.body, {backgroundColor: lightColor1.toHexString(), ease:Elastic.easeOut});

  renderer.setClearColor(lightColor1.toHexString(), 0);

  directionalLight1 = new THREE.DirectionalLight( lightColor1.toHexString(), 1 );
  directionalLight1.position.set( 200, 350, 100 );
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  directionalLight2 = new THREE.DirectionalLight( lightColor2.toHexString(), 1 );
  directionalLight2.position.set( -200, -350, -100 );
  directionalLight2.castShadow = true;
  scene.add(directionalLight2);

  shapes = new THREE.Object3D();
  scene.add(shapes);

  // var sphereGeometry = new THREE.SphereGeometry(shapeSize, 32, 32);
  var sphereGeometry = new THREE.IcosahedronGeometry(0.1);
  var tetraGeometry = new THREE.TetrahedronGeometry(10, 2);
  var bigIcosaGeometry = new THREE.IcosahedronGeometry(10, 2);

  var sphereMaterial = new THREE.MeshPhongMaterial(
    { color: tinycolor.random().toHexString(),
      specular: tinycolor.random().toHexString(),
      emissive: 0x121212,
      reflectivity: 10,
      shininess: 50,
      flatShading: true,
      needsUpdate: true,
      side: THREE.DoubleSide
    });

  for(var c = 0; c < fftSize/2; c++) {
    var shapeContainer = new THREE.Object3D();
    shapeContainer.scale.x = 0.1 + (c * 0.05);
    shapeContainer.scale.y = 0.1 + (c * 0.05);
    shapeContainer.scale.z = 0.1 + (c * 0.05);

    shapes.add(shapeContainer);

    for(var s = 0; s < fftSize/2; s++) {
      var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      shapeContainer.add(sphere);
    }
  }

  bigTetra = new THREE.Mesh(tetraGeometry, sphereMaterial);
  bigTetra.verticesOrigin = new Array();
  for ( var i = 0; i < bigTetra.geometry.vertices.length; i ++ ) {
    bigTetra.verticesOrigin.push({x:bigTetra.geometry.vertices[i].x, y:bigTetra.geometry.vertices[i].y, z:bigTetra.geometry.vertices[i].z});
  }

  scene.add(bigTetra);

  container.appendChild(renderer.domElement);

  // init sound reactivity

  navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
  if(navigator.getUserMedia) {
    navigator.getUserMedia({
        audio: true,
        video: false
      },
      function(mediaStream) {
        context = new AudioContext();
        microphone = context.createMediaStreamSource(mediaStream);
        if(microphone) {
          soundReactive = true;
        }

        sourceJs = context.createScriptProcessor(2048, 1, 1);
        sourceJs.connect(context.destination);
        analyser = context.createAnalyser();
        analyser.smoothingTimeConstant = 0.5;
        analyser.fftSize = fftSize;

        microphone.connect(analyser);
        analyser.connect(sourceJs);
        sourceJs.connect(context.destination);

        sourceJs.onaudioprocess = function(e) {
            byteArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(byteArray);
            total = 0;
            for (var i = 0; i < byteArray.length; i++) {
              total += byteArray[i];
            }

            if(total > maxTotal) {
              maxTotal = total;
              threshhold = maxTotal - (maxTotal * 0.1)
            }
        };
      },
      function(error) {
        console.log("There was an error when getting microphone input: " + error);
      }
    );
  }

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onWindowResize, false);
  renderer.animate(render);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
  var delta1 = clock.getDelta(), time1 = clock.getElapsedTime() * 0.0005;
  var delta2 = clock.getDelta(), time2 = clock.getElapsedTime() * 0.00045;
  var delta3 = clock.getDelta(), time3 = clock.getElapsedTime() * 0.0006;

  angle += 0.001;

  if(total > threshhold && !isResetting) {
    // console.log('threshhold was: ', threshhold);
    changeColor();
  }

  for(var c = 0; c < shapes.children.length; c++) {
    var shapeContainer = shapes.children[c];
    shapeContainer.rotation.x = cos(angle * 4) * sin(angle * c);
    shapeContainer.rotation.y = sin(angle * 4) * sin(angle * c);
    shapeContainer.rotation.z = cos(angle * 4) * sin(angle * c);

    for(var s = 0; s < shapeContainer.children.length; s++) {
      var shape = shapeContainer.children[s];
      shape.position.x = cos(angle * s) * sin(angle * s);
      shape.position.y = sin(angle * s) * sin(angle * s);
      shape.position.z = cos(angle * s) * sin(angle * s);

      shape.scale.set(0.1 + byteArray[c] * 0.01, 0.1 + byteArray[c] * 0.01, 0.1 + byteArray[c] * 0.01);
    }
  }

  for (var i = 0; i < bigTetra.geometry.vertices.length; i ++) {
    if(byteArray[i]) {
      bigTetra.geometry.vertices[i].x =  bigTetra.verticesOrigin[i].x * ((1-deformationRange) + noise.perlin3(bigTetra.verticesOrigin[i].x, i+1, noise.perlin3(time1, 42, total * 0.0005)) * (byteArray[i] * 0.004));
      bigTetra.geometry.vertices[i].y = bigTetra.verticesOrigin[i].y * ((1-deformationRange) + noise.perlin3(bigTetra.verticesOrigin[i].y, i+1, noise.perlin3(time2, 42, total * 0.0005)) * (byteArray[i] * 0.004));
      bigTetra.geometry.vertices[i].z = bigTetra.verticesOrigin[i].z * ((1-deformationRange) + noise.perlin3(bigTetra.verticesOrigin[i].z, i+1, noise.perlin3(time3, 42, total * 0.0005)) * (byteArray[i] * 0.004));
    }
  }

  bigTetra.geometry.verticesNeedUpdate = true;

  shapes.rotation.x += 0.0052;
  shapes.rotation.y += 0.0051;
  shapes.rotation.z += 0.006;

  bigTetra.rotation.x -= 0.0052;
  bigTetra.rotation.y -= 0.0051;
  bigTetra.rotation.z -= 0.006;

	renderer.render( scene, camera );
}

function update() {

}

function changeColor() {
  isResetting = true;

  threshhold = 0;

  var lightColor1 = tinycolor.random();
  var lightColor2 = lightColor1.complement();

  // TweenMax.to(document.body, 2, {backgroundColor: lightColor1.toHexString(), ease:Back.easeOut});

  TweenMax.to(directionalLight1.color, 2, {r:lightColor1.toRgb().r / 256.0, g:lightColor1.toRgb().g / 256.0, b:lightColor1.toRgb().b / 256.0, ease:Quad.easeOut});
  TweenMax.to(directionalLight2.color, 2, {r:lightColor2.toRgb().r / 256.0, g:lightColor2.toRgb().g / 256.0, b:lightColor2.toRgb().b / 256.0, ease:Quad.easeOut, delay: 0.1, onComplete: function() {
    isResetting = false;
  }});
}

function onClick(e) {
  changeColor();
}

window.addEventListener('load', init);
