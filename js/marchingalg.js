/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false*/


MARCH.MarchingCubesGenerator = function () {
    this.isoLevel = 0.01;

    /* Interpolates between two vertices (v1 and v2) according to values val1 and val2 */
    this.interpolateVertices = function(v1, v2, val1, val2) {
        var abs = Math.abs;
        var epsilon = 0.00001;
        if (abs(this.isoLevel - val1) < epsilon) {
            return v1; //suitably close to v1
        } else if (abs(this.isoLevel - val2) < epsilon) {
            return v2; //suitably close to v2
        } else if (abs(val1 - val2) < epsilon) {
            return v1; //suitably close together
        }
        
        var mu = (this.isoLevel - val1) / (val2 - val1);
        
        return new THREE.Vector3(
            v1.x + mu * (v2.x - v1.x), 
             v1.y + mu * (v2.y - v1.y), 
             v1.z + mu * (v2.z - v1.z)
        );
    };
    
    /* Polygonizes a single grid cube 
    *  returns array of triangles created
    */
    this.processCube = function (cube) {
        var cubeIndex = 0,
            vertList = [],
            i = 0, 
            ntriangle = 0,
            triangles = [];
        
        for (i = 0; i < 8; i++) {
            if (cube.val[i] < this.isoLevel) { cubeIndex |= 1 << i; }
        }
        
        //cube is enclosed in or excluded from the surface
        if (MARCH.edges[cubeIndex] === 0)
            return triangles;
        
        //find surface intersections with cube
        if (MARCH.edges[cubeIndex] & 1) {
            vertList[0] = this.interpolateVertices(cube.points[0], cube.points[1], cube.val[0], cube.val[1]);   
        }
        if (MARCH.edges[cubeIndex] & 2) {
            vertList[1] = this.interpolateVertices(cube.points[1], cube.points[2], cube.val[1], cube.val[2]);
        }
        if (MARCH.edges[cubeIndex] & 4) {
            vertList[2] = this.interpolateVertices(cube.points[2], cube.points[3], cube.val[2], cube.val[3]);   
        }
        if (MARCH.edges[cubeIndex] & 8) {
            vertList[3] = this.interpolateVertices(cube.points[3], cube.points[0], cube.val[3], cube.val[0]);
        }
        if (MARCH.edges[cubeIndex] & 16) {
            vertList[4] = this.interpolateVertices(cube.points[4], cube.points[5], cube.val[4], cube.val[5]);   
        }
        if (MARCH.edges[cubeIndex] & 32) {
            vertList[5] = this.interpolateVertices(cube.points[5], cube.points[6], cube.val[5], cube.val[6]);
        }
        if (MARCH.edges[cubeIndex] & 64) {
            vertList[6] = this.interpolateVertices(cube.points[6], cube.points[7], cube.val[6], cube.val[7]);
        }
        if (MARCH.edges[cubeIndex] & 128) {
            vertList[7] = this.interpolateVertices(cube.points[7], cube.points[4], cube.val[7], cube.val[4]);
        }
        if (MARCH.edges[cubeIndex] & 256) {
            vertList[8] = this.interpolateVertices(cube.points[0], cube.points[4], cube.val[0], cube.val[4]);
        }
        if (MARCH.edges[cubeIndex] & 512) {
            vertList[9] = this.interpolateVertices(cube.points[1], cube.points[5], cube.val[1], cube.val[5]);
        }
        if (MARCH.edges[cubeIndex] & 1024) {
            vertList[10] = this.interpolateVertices(cube.points[2], cube.points[6], cube.val[2], cube.val[6]);
        }
        if (MARCH.edges[cubeIndex] & 2048) {
            vertList[11] = this.interpolateVertices(cube.points[3], cube.points[7], cube.val[3], cube.val[7]);
        }
        
        for (i = 0; MARCH.tris[cubeIndex][i] !== -1; i += 3) {
            triangles[ntriangle] = {
                points: [
                    vertList[MARCH.tris[cubeIndex][i]],
                    vertList[MARCH.tris[cubeIndex][i + 1]],
                    vertList[MARCH.tris[cubeIndex][i + 2]]
                ]
            };
            ntriangle++;
        }
        
        return triangles;
    };
};