function createChunk(size, stepSize, chunkSize, chunkX, chunkY, chunkZ, voxelData) {
    //create return data object
    var returnData = {},

        cubeprocessor = new MARCH.MarchingCubesGenerator(),

    //create geom for this chunk
        verts = [],
        faces = [],

    //define cubes for chunk
        cubes = getCubes(size, stepSize, chunkX, chunkX + chunkSize,
        chunkY, chunkY + chunkSize, chunkZ, chunkZ + chunkSize, voxelData),

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
                        verts.push(triangles[t].points[tv].clone());
                    }
                    faces.push(new THREE.Face3(triIdx, triIdx + 1, triIdx + 2));
                    //geometry.faceVertexUVs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);
                    triIdx += 3;
                }
            }
        }
    }
    
    //return all to caller
    returnData.verts = verts;
    returnData.faces = faces;
    returnData.chunkX = chunkX;
    returnData.chunkY = chunkY;
    returnData.chunkZ = chunkZ;
    //console.log("Chunk " + chunkX + "," + chunkY + "," + chunkZ + " has finished.");
    postMessage(returnData);
}


function getCubes(size, stepSize, minX, maxX, minY, maxY, minZ, maxZ, voxelData) {
    var temp = [],
        halfSize = size / 2,
        x = 0,  //physical position vars
        y = 0,
        z = 0,
        ix = 0, //temp index vars
        iy = 0,
        iz = 0,
        ax = 0, //absolute index vars (into voxel array)
        ay = 0,
        az = 0;
    for (ix = 0; ix < maxX - minX; ix++) {
        ax = ix + minX;
        x = ax * stepSize - halfSize;
        temp[ix] = [];
        for (iy = 0; iy < maxY - minY; iy++) {
            ay = iy + minY;
            y = ay * stepSize - halfSize;
            temp[ix][iy] = [];
            for (iz = 0; iz < maxZ - minZ; iz++) {
                az = iz + minZ;
                z = az * stepSize - halfSize;
                var Vector3 = THREE.Vector3;
                var corners = [
                    new Vector3(x, y, z),
                    new Vector3(x, y + stepSize, z),
                    new Vector3(x + stepSize, y + stepSize, z),
                    new Vector3(x + stepSize, y, z),
                    new Vector3(x, y, z + stepSize),
                    new Vector3(x, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y, z + stepSize)];
                var densities = [
                    voxelData[ax][ay][az],
                    voxelData[ax][ay + 1][az],
                    voxelData[ax + 1][ay + 1][az],
                    voxelData[ax + 1][ay][az],
                    voxelData[ax][ay][az + 1],
                    voxelData[ax][ay + 1][az + 1],
                    voxelData[ax + 1][ay + 1][az + 1],
                    voxelData[ax + 1][ay][az + 1]];
                temp[ix][iy][iz] = { val: densities, points: corners };
            }
        }
    }
    return temp;
}

onmessage = function (oEvent) {

    //load worker dependencies
    importScripts("/lib/threejs/three.js", "/js/marchingcubes.js", "/js/marchingalg.js");
    //pass our chunk data
    createChunk(oEvent.data.size, oEvent.data.stepSize, oEvent.data.chunkSize, oEvent.data.chunkX, oEvent.data.chunkY, oEvent.data.chunkZ, oEvent.data.voxelData);
}