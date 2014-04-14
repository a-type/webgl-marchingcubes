/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, renderer, camera, scene, controls, chunks;

$(document).ready(function () {
    //check browser compatibility status
    if (typeof (Worker) === "undefined") {
        alert("You browser must support Web Workers to run this application.");
        return;
    }



    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    
    //define constants
    var size = 50, stepSize = 1, chunkSize = 10;

    //create the scene
    scene = new THREE.Scene();

    //iterate through chunks and create workers
    var chunkX, chunkY, chunkZ;
    chunks = [];
    for (chunkX = 0; chunkX < size; chunkX += chunkSize) {
        chunks[chunkX / chunkSize] = [];
        for (chunkY = 0; chunkY < size; chunkY += chunkSize) {
            chunks[chunkX / chunkSize][chunkY / chunkSize] = [];
            for (chunkZ = 0; chunkZ < size; chunkZ += chunkSize) {
                //create worker and pass chunk data
                var chunkData = { size: size, stepSize: stepSize, chunkSize: chunkSize, chunkX: chunkX, chunkY: chunkY, chunkZ: chunkZ };
                var chunkWorker = new Worker("js/cubeworker.js");
                chunkWorker.onmessage = function (oEvent) {
                    //add to chunk array
                        data = oEvent.data;
                    chunks[data.chunkX / chunkSize][data.chunkY / chunkSize][data.chunkZ / chunkSize] = data.cubes;
                    
                    //add mesh to scene
                    scene.add(data.mesh);
                    console.log("Mesh added for chunk " + data.chunkX + "," + data.chunkY + "," + data.chunkZ);
                }
                chunkWorker.postMessage(chunkData);
            }
        }
    }

    //create reference cube
    var cubegeometry = new THREE.CubeGeometry( 1, 1, 1 );
    var cubematerial = new THREE.MeshLambertMaterial( {color: 0x00ff00} );
    var cubemesh = new THREE.Mesh(cubegeometry, cubematerial);
    cubemesh.position.set(0, 0.5, 0);
    scene.add(cubemesh);
    //create 'water'
    var planegeometry = new THREE.PlaneGeometry(size, size);
    var planematerial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    var plane = new THREE.Mesh(planegeometry, planematerial);
    plane.lookAt(new THREE.Vector3(0, 1, 0));
    plane.position.set(0, -0.5, 0);
    scene.add(plane);
    //add lights
    var pointLight;
    pointLight = new THREE.PointLight(0xeeeeee);
    //create the renderer / camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    camera.add(pointLight);
    scene.add(camera);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    $("#container").append(renderer.domElement);
    renderer.clearColor = new THREE.Color(0xFFFFFF);
    controls = new THREE.DragControls(camera, renderer.domElement);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.position.set(0, 0, 2);
    //begin render cycle
    render();
});


function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(33);
}