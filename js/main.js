/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, 
    renderer, 
    camera, 
    cubemesh, 
    directionalLight,
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
    digStrength = 1,
    mainUniforms,
    waterUniforms,
    shadowProcessor,
    shadowMaterial;



$(document).ready(function () {
    //check browser compatibility status
    if (typeof (Worker) === "undefined") {
        alert("You browser must support Web Workers to run this application.");
        return;
    }

    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    
    //gen terrain
    if (window.location.hash) {
        var hash = window.location.hash.substring(1);
        if (hash == "flat") {
            VOXEL.generateFlat(size + 1, stepSize);
        } else {
            VOXEL.generateCubic(size + 1, stepSize);   
        }
    } else {
        VOXEL.generateCubic(size + 1, stepSize);
    }
    
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
    var cubematerial = new THREE.MeshLambertMaterial( {color: 0x448844} );
    cubemesh = new THREE.Mesh(cubegeometry, cubematerial);
    cubemesh.position.set(-1000, -1000, -1000);
    scene.add(cubemesh);
    
    //add lights
    directionalLight = new THREE.DirectionalLight(0xffffcc);
    //directionalLight.castShadow = true;
    directionalLight.shadowDarkness = 0.5;
    directionalLight.position = new THREE.Vector3(0, 100, 0);
    directionalLight.intensity = 2;
    //directionalLight.target = new THREE.Object3D();
    //directionalLight.target.position = new THREE.Vector3(0, 0, 0);
    //scene.add(directionalLight.target);
    light = directionalLight;
    
    //add a visible indicator for light
    var spheregeometry = new THREE.SphereGeometry(1, 1, 1);
    var spherematerial = new THREE.MeshBasicMaterial( {color: 0xffff88} );
    var spheremesh = new THREE.Mesh(spheregeometry, spherematerial);
    light.add(spheremesh);
    
    //directionalLight.shadowCameraVisible = true;
    scene.add(directionalLight);
    //create the renderer / camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    //camera.add(light);
    //scene.add(camera);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    $("#container").append(renderer.domElement);
    
    width = $("#container").width();
    height = $("#container").height();
    
    renderer.setClearColor(new THREE.Color(0x444444));
    //renderer.shadowMapEnabled = true; //THREEjs default shadow mapping
    shadowProcessor = new MARCH.Shadows();    
    renderer.addPrePlugin(shadowProcessor);
    //var postShadowViewer = new MARCH.Shadows();
    //postShadowViewer.drawMapOnScreen = true;
    //renderer.addPostPlugin(postShadowViewer);

    mainUniforms = {
        "ambient": { type: "c", value: new THREE.Color( 0x444444 ) },
        "diffuse": { type: "c", value: new THREE.Color( 0xcc7766 ) },
        "emissive": { type: "c", value: new THREE.Color( 0x000000 ) },
        "ambientLightColor": { type: "fv", value: [0.25, 0.25, 0.25] },
        "shadowMatrix": { type: "m4", value: new THREE.Matrix4() },
        "shadowMap": { type: "t", value: light.shadowMap },
        "shadowMapSize": { type: "v2", value: new THREE.Vector2(500, 500) },
        "shadowDarkness": { type: "f", value: 0.5 },
        "directionalLightColor": { type: "fv", value: [1.0, 1.0, 0.8] },
        "directionalLightDirection": { type: "fv", value: [] }
    };
    
    //create shadow material
    shadowMaterial = new THREE.ShaderMaterial( { 
        vertexShader: document.getElementById('mainVertexShader').textContent, 
        fragmentShader: document.getElementById('mainFragmentShaderPCF').textContent, 
        uniforms: mainUniforms, 
        vertexColors: true, 
        color: 0xcc7766 
    });
    
    waterUniforms = {
        "ambient": { type: "c", value: new THREE.Color( 0x444444 ) },
        "diffuse": { type: "c", value: new THREE.Color( 0x6677cc ) },
        "emissive": { type: "c", value: new THREE.Color( 0x000000 ) },
        "ambientLightColor": { type: "fv", value: [0.25, 0.25, 0.25] },
        "shadowMatrix": { type: "m4", value: new THREE.Matrix4() },
        "shadowMap": { type: "t", value: light.shadowMap },
        "shadowMapSize": { type: "v2", value: new THREE.Vector2(500, 500) },
        "shadowDarkness": { type: "f", value: 0.5 },
        "directionalLightColor": { type: "fv", value: [1.0, 1.0, 0.8] },
        "directionalLightDirection": { type: "fv", value: [] }
    };
    
    //create shadow material
    waterMaterial = new THREE.ShaderMaterial( { 
        vertexShader: document.getElementById('mainVertexShader').textContent, 
        fragmentShader: document.getElementById('mainFragmentShaderPCF').textContent, 
        uniforms: waterUniforms, 
        vertexColors: true, 
        color: 0x6677cc 
    });
    //shadowMaterial = new THREE.MeshLambertMaterial({color: 0xee9988});
    
    //create 'water'
    var planegeometry = new THREE.PlaneGeometry(size, size);
    var planematerial = shadowMaterial;
    var plane = new THREE.Mesh(planegeometry, waterMaterial);
    plane.lookAt(new THREE.Vector3(0, 1, 0));
    plane.position.set(0, -1.5, 0);
    scene.add(plane);
    
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
                    var mesh = new THREE.Mesh(geometry, shadowMaterial);

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
    mainUniforms.shadowMap.value = light.shadowMap;
    mainUniforms.directionalLightDirection.value = [
        light.position.x, 
        light.position.y, 
        light.position.z
    ];
    waterUniforms.directionalLightDirection.value =
        mainUniforms.directionalLightDirection.value;
    if (light.shadowMatrix !== null) {
        mainUniforms.shadowMatrix.value = light.shadowMatrix;
        waterUniforms.shadowMatrix.value = light.shadowMatrix;
    }
    renderer.render(scene, camera);
    controls.update(33);
    light.position.applyAxisAngle(right, 0.00005);
    if (Math.abs(light.position.z - 100) < 0.1) {
        light.position.z = -100;   
    }
    //light.lookAt(new THREE.Vector3(0, 0, 0));
}

function interact(event) {
    switch (event.keyCode) {
        case 69:
            dig();
            break;
        case 81:
            build();
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

function build() {
    //cast ray from mouse to terrain
    var mousePos = lastMousePos.clone();
    mousePos.x = (mousePos.x - (width / 2)) / (width / 2);
    mousePos.y = ((height / 2) - mousePos.y) / (height / 2);
    var ray = projector.pickingRay(mousePos, camera);
    var allIntersects = ray.intersectObjects(scene.children);
    if (allIntersects.length > 0) {
        console.log("hit");
        //subtract 1 from intersection point along ray
        allIntersects[0].point.sub(ray.ray.direction);
        var x = allIntersects[0].point.x,
            y = allIntersects[0].point.y,
            z = allIntersects[0].point.z;
        cubemesh.position.set(x, y, z);
        //for all surrounding voxels, add strength
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y - 0.5), parseInt(z - 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y - 0.5), parseInt(z + 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y + 0.5), parseInt(z - 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x - 0.5), parseInt(y + 0.5), parseInt(z + 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y - 0.5), parseInt(z - 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y - 0.5), parseInt(z + 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y + 0.5), parseInt(z - 0.5), size, stepSize, -digStrength);
        VOXEL.influenceFromPhysicalPosition(parseInt(x + 0.5), parseInt(y + 0.5), parseInt(z + 0.5), size, stepSize, -digStrength);
        
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