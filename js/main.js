/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, renderer, camera, cubemesh, scene, controls, chunks, lastMousePos, projector, width, height, size, stepSize, chunkSize, digStrength = -1;



$(document).ready(function () {
    //check browser compatibility status
    if (typeof (Worker) === "undefined") {
        alert("You browser must support Web Workers to run this application.");
        return;
    }

    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    
    //define constants
    size = 64;
    chunkSize = 32;
    stepSize = 1;
    
    //gen terrain
    VOXEL.generate(size + 1, stepSize);

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
                buildChunk(chunkX, chunkY, chunkZ);
            }
        }
    }

    //create reference cube
    var cubegeometry = new THREE.CubeGeometry( 0.1, 0.1, 0.1 );
    var cubematerial = new THREE.MeshLambertMaterial( {color: 0x00ff00} );
    cubemesh = new THREE.Mesh(cubegeometry, cubematerial);
    cubemesh.position.set(-1000, -1000, -1000);
    scene.add(cubemesh);
    //create 'water'
    var planegeometry = new THREE.PlaneGeometry(size, size);
    var planematerial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    var plane = new THREE.Mesh(planegeometry, planematerial);
    plane.lookAt(new THREE.Vector3(0, 1, 0));
    plane.position.set(0, -1.5, 0);
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
    
    width = $("#container").width();
    height = $("#container").height();
    
    renderer.clearColor = new THREE.Color(0xFFFFFF);
    controls = new THREE.DragControls(camera, renderer.domElement);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.position.set(0, 0, 2);
    //ensure frustum culling is on
    camera.frustumCulled = true;
    //make projector
    projector = new THREE.Projector();
    //bind inputs
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', interact, false);
    //begin render cycle
    render();
});

function buildChunk(chunkX, chunkY, chunkZ) {
    if (chunks[chunkX] && chunks[chunkX][chunkY] && chunks[chunkX][chunkY][chunkZ]) {
        //remove previous mesh
        scene.remove(chunks[chunkX][chunkY][chunkZ]);
    }
    
    //create worker and pass chunk data
    var chunkData = { size: size, stepSize: stepSize, chunkSize: chunkSize, chunkX: chunkX, chunkY: chunkY, chunkZ: chunkZ, voxelData: VOXEL.voxels };
    var chunkWorker = new Worker("js/cubeworker.js");
    chunkWorker.onmessage = function (oEvent) {
        //add to chunk array
        data = oEvent.data;
        var geometry = new THREE.Geometry();

        var i = 0;
        for (i = 0; i < data.verts.length; i++) {
            geometry.vertices.push(new THREE.Vector3(data.verts[i].x, data.verts[i].y, data.verts[i].z));
        }
        for (i = 0; i < data.faces.length; i++) {
            geometry.faces.push(new THREE.Face3(data.faces[i].a, data.faces[i].b, data.faces[i].c));

        }

        //finalize mesh
        geometry.computeCentroids();
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));

        //add mesh to scene
        scene.add(mesh);
        chunks[data.chunkX / chunkSize][data.chunkY / chunkSize][data.chunkZ / chunkSize] = mesh;
        //console.log("Mesh added for chunk " + data.chunkX + "," + data.chunkY + "," + data.chunkZ);
    }
    chunkWorker.postMessage(chunkData);
}


function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(33);
}

function interact(event) {
    switch (event.keyCode) {
        case 69:
            dig();
            break;
    }
}

function onMouseMove(mouseEvent) {
    lastMousePos = new THREE.Vector3(mouseEvent.pageX, mouseEvent.pageY);
}

function dig() {
    //cast ray from mouse to terrain
    var mousePos = lastMousePos.clone();
    mousePos.x = (mousePos.x - (width / 2)) / (width / 2);
    mousePos.y = ((height / 2) - mousePos.y) / (height / 2);
    var ray = projector.pickingRay(mousePos, camera);
    var allIntersects = ray.intersectObjects(scene.children);
    if (allIntersects.length > 0) {
        console.log("hit");   
        var x = allIntersects[0].point.x,
            y = allIntersects[0].point.y,
            z = allIntersects[0].point.z;
        cubemesh.position.set(x, y, z);
        
        VOXEL.influenceFromPhysicalPosition(parseInt(x), parseInt(y), parseInt(z), size, stepSize, digStrength);
        buildChunk(parseInt(parseInt(x) / chunkSize), parseInt(parseInt(y) / chunkSize), parseInt(parseInt(z) / chunkSize));
    }
}