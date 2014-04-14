function createChunk(size, stepSize, chunkSize, chunkX, chunkY, chunkZ) {
    //create return data object
    var returnData = {},

        cubeprocessor = new MARCH.MarchingCubesGenerator(),

    //create geom for this chunk
        geometry = new THREE.Geometry(),

    //define cubes for chunk
        cubes = getCubes(size, stepSize, density, chunkX, chunkX + chunkSize,
        chunkY, chunkY + chunkSize, chunkZ, chunkZ + chunkSize),

        x = 0,
        y = 0,
        z = 0,
        triIdx = 0;

    for (x = 0; x < chunkSize; x++) {
        for (y = 0; y < chunkSize; y++) {
            for (z = 0; z < chunkSize; z++) {
                //get individual cube and create polys
                var cube = cubes[x][y][z];
                var triangles = cubeprocessor.processCube(cube);
                for (var t = 0; t < triangles.length; t++) {
                    for (var tv = 0; tv < 3; tv++) {
                        geometry.vertices.push(triangles[t].points[tv].clone());
                    }
                    geometry.faces.push(new THREE.Face3(triIdx, triIdx + 1, triIdx + 2));
                    //geometry.faceVertexUVs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);
                    triIdx += 3;
                }
            }
        }
    }
    
    //finalize mesh
    geometry.computeCentroids();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    
    //return all to caller
    returnData.mesh = mesh;
    returnData.chunkX = chunkX;
    returnData.chunkY = chunkY;
    returnData.chunkZ = chunkZ;
    console.log("Chunk " + chunkX + "," + chunkY + "," + chunkZ + " has finished.");
    postMessage(returnData);
}


function getCubes(size, stepSize, densityFunction, minX, maxX, minY, maxY, minZ, maxZ) {
    var temp = [],
        halfSize = size / 2,
        x = minX - halfSize,
        y = minY - halfSize,
        z = minZ - halfSize;
    for (x = minX - halfSize; x < maxX - halfSize; x += stepSize) {
        temp[(x + halfSize) / stepSize - minX] = [];
        for (y = minY - halfSize; y < maxY - halfSize; y += stepSize) {
            temp[(x + halfSize) / stepSize - minX][(y + halfSize) / stepSize - minY] = [];
            for (z = minZ - halfSize; z < maxZ - halfSize; z += stepSize) {
                var Vector3 = THREE.Vector3;
                var corners = [new Vector3(x, y, z),
                    new Vector3(x, y + stepSize, z),
                    new Vector3(x + stepSize, y + stepSize, z),
                    new Vector3(x + stepSize, y, z),
                    new Vector3(x, y, z + stepSize),
                    new Vector3(x, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y, z + stepSize)];
                var densities = [densityFunction(corners[0], size),
                    densityFunction(corners[1], size),
                    densityFunction(corners[2], size),
                    densityFunction(corners[3], size),
                    densityFunction(corners[4], size),
                    densityFunction(corners[5], size),
                    densityFunction(corners[6], size),
                    densityFunction(corners[7], size)];
                temp[(x + halfSize) / stepSize - minX][(y + halfSize) / stepSize - minY][(z + halfSize) / stepSize - minZ] = { val: densities, points: corners };
            }
        }
    }
    return temp;
}

//noise function for our density
function density(point, size) {
    var x = point.x / (size / 2),
        y = point.y / (size / 2),
        z = point.z / (size / 2);
    return y + noise.perlin3(x * 2 + 5, y * 2 + 3, z * 2 + 0.6);
}




onmessage = function (oEvent) {

    //load worker dependencies
    importScripts("/lib/noise/noise.js", "/lib/threejs/three.js", "/js/marchingcubes.js", "/js/marchingalg.js");
    //pass our chunk data
    createChunk(oEvent.data.size, oEvent.data.stepSize, oEvent.data.chunkSize, oEvent.data.chunkX, oEvent.data.chunkY, oEvent.data.chunkZ);
}