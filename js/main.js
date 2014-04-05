/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, renderer, camera, scene, controls;

$(document).ready(function () {
    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    //generate terrain noise
    var terrain = PerlinNoise;
    var cubeprocessor = new MARCH.MarchingCubesGenerator();
    //create noise function for our density
    //var densityFunction = function(point) { return terrain.noise(point.x, point.y, point.z); }
    var densityFunction = function(point) { return Math.random(); };
    //iterate through chunks and create polys
    var size = 10, stepSize = 1, x = 0, y = 0, z = 0, geometry = new THREE.Geometry(), triIdx = 0;
    var cubes = getCubes(size, stepSize, densityFunction);
    for (x = 0; x < size / stepSize; x++) {
        for (y = 0; y < size / stepSize; y++) {
            for (z = 0; z < size / stepSize; z++) {
                var cube = cubes[x][y][z];
                var triangles = cubeprocessor.processCube(cube);
                for (var t = 0; t < triangles.length; t++) {
                    for (var tv = 0; tv < 3; tv++) {
                        geometry.vertices.push(triangles[t].points[tv]);   
                    }
                    /*var normal = triangles[t].points[0].sub(triangles[t].points[1]).normalize().cross(
                        triangles[t].points[0].sub(triangles[t].points[2]).normalize());*/
                    geometry.vertices.push(new THREE.Face3(triIdx, triIdx + 1, triIdx + 2));
                }
            }
        }
    }
    geometry.computeCentroids();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    //create the scene
    scene = new THREE.Scene();
    //create final mesh
    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x88ff77 }));
    scene.add(mesh);
    //create reference cube
    var geometry = new THREE.CubeGeometry( 1, 1, 1 );
    var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    var cube = new THREE.Mesh( geometry, material );
    scene.add( cube );
    //create the renderer
    camera = new THREE.PerspectiveCamera(50, document.width / document.height, 1, 1000); 
    renderer = new THREE.WebGLRenderer();
    $("#container").append(renderer.domElement);
    renderer.clearColor = new THREE.Color(0x000000);
    //renderer.setViewport(0, 0, $("#three-viewport").width(), $("#three-viewport").height);
    controls = new THREE.DragControls(camera, renderer.domElement);
    //begin render cycle
    render();
});

function getCubes(size, stepSize, densityFunction) {
    var temp = [];
    for (var x = 0; x < size; x += stepSize)
    {
        temp[x / stepSize] = [];
        for (var y = 0; y <size; y += stepSize)
        {
            temp[x / stepSize][y / stepSize] = [];
            for (var z = 0; z < size; z += stepSize)
            {
                var Vector3 = THREE.Vector3;
                var corners = [ new Vector3(x,y,z), new Vector3(x,y+stepSize,z),new Vector3(x+stepSize,y+stepSize,z),new Vector3(x+stepSize,y,z), new Vector3(x,y,z+stepSize), new Vector3(x,y+stepSize,z+stepSize),
                   new Vector3(x+stepSize,y+stepSize,z+stepSize), new Vector3(x+stepSize,y,z+stepSize)];
                var densities = [ densityFunction(corners[0]), densityFunction(corners[1]), densityFunction(corners[2]), densityFunction(corners[3]), densityFunction(corners[4]),
                                        densityFunction(corners[5]), densityFunction(corners[6]), densityFunction(corners[7])];
                temp[x / stepSize][y / stepSize][z / stepSize] = { val: densities, points: corners };
            }
        }
    }
    return temp;
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(33);
}