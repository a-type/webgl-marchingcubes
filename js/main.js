/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, 
    renderer, 
    camera, 
    cubemesh, 
    light,
    scene, 
    controls, 
    chunks, 
    lastMousePos, 
    projector, 
    width, 
    height, 
    size = 64, 
    stepSize = 1, 
    chunkSize = 8, 
    batchSize = 4, //size of chunk batches for initial load
    digStrength = 1;



$(document).ready(function () {
    //check browser compatibility status
    if (typeof (Worker) === "undefined") {
        alert("You browser must support Web Workers to run this application.");
        return;
    }

    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    
    //gen terrain
    VOXEL.generateCubic(size + 1, stepSize);
    //VOXEL.generate(size + 1, stepSize);

    //create the scene
    scene = new THREE.Scene();

    //iterate through chunks and create workers
    var chunkX, chunkY, chunkZ;
    chunks = [];
    
    for (chunkX = 0; chunkX < size / chunkSize; chunkX += 1) {
        chunks[chunkX] = [];
        for (chunkY = 0; chunkY < size / chunkSize; chunkY += 1) {
            chunks[chunkX][chunkY] = [];
        }
    }
    
    for (chunkX = 0; chunkX < size; chunkX += chunkSize * batchSize) {
        for (chunkY = 0; chunkY < size; chunkY += chunkSize * batchSize) {
            for (chunkZ = 0; chunkZ < size; chunkZ += chunkSize * batchSize) {
                buildChunk(chunkX, chunkY, chunkZ, batchSize);
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
    plane.receiveShadow = true;
    scene.add(plane);
    //add lights
    var spotLight;
    spotLight = new THREE.SpotLight(0xeeeeee);
    spotLight.castShadow = true;
    spotLight.shadowDarkness = 0.5;
    spotLight.position = new THREE.Vector3(0, 100, 24);
    spotLight.intensity = 2;
    //spotLight.shadowCameraVisible = true;
    light = spotLight;
    scene.add(light);
    //create the renderer / camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    //camera.add(light);
    //scene.add(camera);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    $("#container").append(renderer.domElement);
    
    width = $("#container").width();
    height = $("#container").height();
    
    renderer.clearColor = new THREE.Color(0xFFFFFF);
    renderer.shadowMapEnabled = true;
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

function buildChunk(chunkX, chunkY, chunkZ, batchSize, batchSizeY, batchSizeZ) {
    if (batchSize === undefined) {
        batchSize = 1;
        console.log("Rebuild " + chunkX + "," + chunkY + "," + chunkZ);
    }
    if (batchSizeY === undefined) {
        batchSizeY = batchSize;
    }
    if (batchSizeZ === undefined) {
        batchSizeZ = batchSize;
    }
    
    //boundary checks
    if (chunkX < 0) {
        if (batchSize * chunkSize < -chunkX)
            return;
        while (chunkX < 0) {
            chunkX += chunkSize;
            batchSize --;
        }
    } else if (chunkX + (batchSize * chunkSize) > size) {
        batchSize --;
        if (batchSize === 0)
            return;
    }
    
    if (chunkY < 0) {
        if (batchSize * chunkSize < -chunkY)
            return;
        while (chunkY < 0) {
            chunkY += chunkSize;
            batchSize --;
        }
    } else if (chunkY + (batchSizeY * chunkSize) > size) {
        batchSizeY --;
        if (batchSizeY === 0)
            return;
    }
    
    if (chunkZ < 0) {
        if (batchSizeZ * chunkSize < -chunkZ)
            return;
        while (chunkZ < 0) {
            chunkZ += chunkSize;
            batchSizeZ --;
        }
    } else if (chunkZ + (batchSizeZ * chunkSize) > size) {
        batchSizeZ --;
        if (batchSizeZ === 0)
            return;
    }
    
    //create worker and pass chunk data
    var chunkData = { size: size, stepSize: stepSize, chunkSize: chunkSize, chunkX: chunkX, chunkY: chunkY, chunkZ: chunkZ, voxelData: VOXEL.voxels, batchSizeX: batchSize, batchSizeY: batchSizeY, batchSizeZ: batchSizeZ };
    var chunkWorker = new Worker("js/cubeworker.js");
    chunkWorker.onmessage = function (oEvent) {
        //add to chunk array
        var data = oEvent.data,
            bx = 0,
            by = 0,
            bz = 0;
        
        for (bx = 0; bx < data.verts.length; bx++) {
            for (by = 0; by < data.verts[bx].length; by++) {
                for (bz = 0; bz < data.verts[bx][by].length; bz++) {
                    var chunkX = data.chunkX / chunkSize + bx,
                        chunkY = data.chunkY / chunkSize + by,
                        chunkZ = data.chunkZ / chunkSize + bz,
                        i = 0,
                        geometry = new THREE.Geometry();

                    for (i = 0; i < data.verts[bx][by][bz].length; i++) {
                        geometry.vertices.push(new THREE.Vector3(data.verts[bx][by][bz][i].x, data.verts[bx][by][bz][i].y, data.verts[bx][by][bz][i].z));
                    }
                    for (i = 0; i < data.faces[bx][by][bz].length; i++) {
                        geometry.faces.push(new THREE.Face3(data.faces[bx][by][bz][i].a, data.faces[bx][by][bz][i].b, data.faces[bx][by][bz][i].c));

                    }

                    //finalize mesh
                    geometry.computeCentroids();
                    geometry.computeFaceNormals();
                    geometry.computeVertexNormals();
                    var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xdd9999 }));

                    //remove old
                    if (chunks[chunkX] && chunks[chunkX][chunkY] && chunks[chunkX][chunkY][chunkZ]) {
                        //remove previous mesh
                        scene.remove(chunks[chunkX][chunkY][chunkZ]);
                    }

                    //add mesh to scene
                    scene.add(mesh);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    chunks[chunkX][chunkY][chunkZ] = mesh;
                    //console.log("Mesh added for chunk " + data.chunkX + "," + data.chunkY + "," + data.chunkZ);
                }
            }
        }
    }
    chunkWorker.postMessage(chunkData);
}

var right = new THREE.Vector3(1, 0, 0);
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(33);
    light.position.applyAxisAngle(right, 0.0002);
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
        //for all surrounding voxels, add strength
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y - 0.5), parseInt(z - 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y - 0.5), parseInt(z + 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y + 0.5), parseInt(z - 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y + 0.5), parseInt(z + 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y - 0.5), parseInt(z - 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y - 0.5), parseInt(z + 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y + 0.5), parseInt(z - 0.5), size, stepSize, digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y + 0.5), parseInt(z + 0.5), size, stepSize, digStrength);
        
        var ix = parseInt(x),
            iy = parseInt(y),
            iz = parseInt(z);
                
        //detect if we are on a chunk edge, if so build adjacent(s)
        //flags:
        var rebuildLeft = false,
            rebuildRight = false,
            rebuildTop = false,
            rebuildBottom = false,
            rebuildFront = false,
            rebuildBack = false;
        rebuildLeft = ((ix) % chunkSize === 0);
        rebuildRight = ((ix + 1) % chunkSize === 0);
        rebuildBottom = ((iy) % chunkSize === 0);
        rebuildTop = ((iy + 1) % chunkSize == 0);
        rebuildBack = ((iz) % chunkSize === 0);
        rebuildFront = ((iz + 1) % chunkSize == 0);
        //to avoid a ton of conditional checking which I really don't want to write right now...  just rebuild entire batch
        if (rebuildLeft || rebuildRight || rebuildBottom || rebuildTop || rebuildBack || rebuildFront) {
            buildChunk((parseInt((ix + (size / 2)) / chunkSize) - 1) * chunkSize, (parseInt((iy + (size / 2)) / chunkSize) - 1) * chunkSize, (parseInt((iz + (size / 2)) / chunkSize) - 1) * chunkSize, 3);
        } else {
            buildChunk(parseInt((ix + (size / 2)) / chunkSize) * chunkSize, parseInt((iy + (size / 2)) / chunkSize) * chunkSize, parseInt((iz + (size / 2)) / chunkSize) * chunkSize);
        }
    }
}