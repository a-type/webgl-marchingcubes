/*jslint plusplus: true, sloppy: true */
/*global MARCH: false, THREE: false, PerlinNoise: false, MarchingCubesGenerator: false*/

var mesh, renderer, camera, scene, controls;

$(document).ready(function () {
    // http://stackoverflow.com/questions/11476765/using-noise-to-generate-marching-cube-terrain
    //generate terrain noise
    var cubeprocessor = new MARCH.MarchingCubesGenerator();
    //define constants
    var size = 50, stepSize = 1, x = 0, y = 0, z = 0, geometry = new THREE.Geometry(), triIdx = 0;
    //create noise function for our density
    var densityFunction = function (point) {
        var x = point.x / (size / 2),
            y = point.y / (size / 2),
            z = point.z / (size / 2);
        return y + noise.perlin3(x * 2 + 5, y * 2 + 3, z * 2 + 0.6);
    };
    //iterate through chunks and create polys
    var cubes = getCubes(size, stepSize, densityFunction);
    for (x = 0; x < size / stepSize; x++) {
        for (y = 0; y < size / stepSize; y++) {
            for (z = 0; z < size / stepSize; z++) {
                var cube = cubes[x][y][z];
                var triangles = cubeprocessor.processCube(cube);
                for (var t = 0; t < triangles.length; t++) {
                    for (var tv = 0; tv < 3; tv++) {
                        geometry.vertices.push(triangles[t].points[tv].clone());   
                    }
                    /*var normal = triangles[t].points[0].sub(triangles[t].points[1]).normalize().cross(
                        triangles[t].points[0].sub(triangles[t].points[2]).normalize());*/
                    geometry.faces.push(new THREE.Face3(triIdx, triIdx + 1, triIdx + 2));
                    geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0), new THREE.Vector2(0, 1), new THREE.Vector2(1, 1)]);
                    triIdx += 3;
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
    mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    scene.add(mesh);
    //create reference cube
    var cubegeometry = new THREE.CubeGeometry( 1, 1, 1 );
    var cubematerial = new THREE.MeshLambertMaterial( {color: 0x00ff00} );
    var cube = new THREE.Mesh(cubegeometry, cubematerial);
    cube.position.set(0, 0.5, 0);
    scene.add(cube);
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

function getCubes(size, stepSize, densityFunction) {
    var temp = [];
    var halfSize = size / 2;
    for (var x = -halfSize; x < halfSize; x += stepSize)
    {
        temp[(x + halfSize) / stepSize] = [];
        for (var y = -halfSize; y < halfSize; y += stepSize)
        {
            temp[(x + halfSize) / stepSize][(y + halfSize) / stepSize] = [];
            for (var z = -halfSize; z < halfSize; z += stepSize)
            {
                var Vector3 = THREE.Vector3;
                var corners = [new Vector3(x, y, z),
                    new Vector3(x, y + stepSize, z),
                    new Vector3(x + stepSize, y + stepSize, z),
                    new Vector3(x + stepSize, y, z),
                    new Vector3(x, y, z + stepSize),
                    new Vector3(x, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y + stepSize, z + stepSize),
                    new Vector3(x + stepSize, y, z + stepSize)];
                var densities = [densityFunction(corners[0]),
                    densityFunction(corners[1]),
                    densityFunction(corners[2]),
                    densityFunction(corners[3]),
                    densityFunction(corners[4]),
                    densityFunction(corners[5]),
                    densityFunction(corners[6]),
                    densityFunction(corners[7])];
                temp[(x + halfSize) / stepSize][(y + halfSize) / stepSize][(z + halfSize) / stepSize] = { val: densities, points: corners };
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