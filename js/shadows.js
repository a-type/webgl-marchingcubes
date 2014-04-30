//https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk.js#L136
//http://fabiensanglard.net/shadowmapping/
MARCH.Shadows = function() {
    var GL,
        renderer,
        depthMat,
        frustum = new THREE.Frustum(),
        projMatrix = new THREE.Matrix4(),
        min = new THREE.Vector3(),
        max = new THREE.Vector3(),
        matrixWorld = new THREE.Vector3(),
        shadowRatio = 0.8,
        shadowMapSize = 2048;
    
    this.drawMapOnScreen = false;
    
    this.init = function(rend) {
        GL = rend.context;
        renderer = rend;
        
        depthMat = new THREE.ShaderMaterial( {
            uniforms: {},
            vertexShader: document.getElementById("shadowVertexShader").textContent,
            fragmentShader: document.getElementById("shadowFragmentShader").textContent
        });
        
        depthMat._shadowPass = true;
    };
    
    this.createShadowBuffer = function(viewWidth, viewHeight) {
        return new THREE.WebGLRenderTarget(viewWidth, viewHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
    };
    
    this.render = function(scene, camera, viewWidth, viewHeight) {
        var i, j, jl, n,
            shadowMap, shadowMatrix, shadowCamera,
            prog, buff, mat,
            webGLObject, object, light,
            renderList,
            lights = [],
            k = 0;
        
        GL.clearColor(1, 1, 1, 1);
        GL.disable(GL.BLEND);
        GL.enable(GL.CULL_FACE);
        GL.frontFace(GL.CCW);
        GL.cullFace(GL.FRONT);
        renderer.setDepthTest(true);
        
        for ( i = 0, il = scene.__lights.length; i < il; i ++ ) {

			light = scene.__lights[ i ];
            if (light instanceof THREE.DirectionalLight) {
                lights[k] = light;
                k++;
            }
        }
        
        for (i = 0; i < lights.length; i++) {
            light = lights[i];
            if (!light.shadowMap) {
                light.shadowMap = this.createShadowBuffer(shadowMapSize, shadowMapSize);
                light.shadowMapSize = new THREE.Vector2(shadowMapSize, shadowMapSize);
                light.shadowMatrix = new THREE.Matrix4();
            }
            if (!light.shadowCamera) {
                light.shadowCamera = new THREE.OrthographicCamera(
                    -500, //left
                    500, //right
                    500, //top
                    -500, //bottom
                    50, //near
                    5000 //far
                );
                scene.add(light.shadowCamera);
                if (scene.autoUpdate === true) scene.updateMatrixWorld();
            }
            shadowMap = light.shadowMap;
            shadowMatrix = light.shadowMatrix;
            shadowCamera = light.shadowCamera;
            
            shadowCamera.position.setFromMatrixPosition(light.matrixWorld);//
            matrixWorld.setFromMatrixPosition(light.target.matrixWorld);//
            shadowCamera.lookAt(matrixWorld);//
            shadowCamera.updateMatrixWorld();//
            
            shadowCamera.matrixWorldInverse.getInverse(shadowCamera.matrixWorld);//
            
            shadowMatrix.set( 0.5, 0.0, 0.0, 0.5,//
                             0.0, 0.5, 0.0, 0.5,
                             0.0, 0.0, 0.5, 0.5,
                             0.0, 0.0, 0.0, 1.0);
            shadowMatrix.multiply(shadowCamera.projectionMatrix);//
            shadowMatrix.multiply(shadowCamera.matrixWorldInverse);//
            
            projMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);//
            frustum.setFromMatrix(projMatrix);//
            
            //render
            if (!this.drawMapOnScreen) {
                renderer.setRenderTarget(shadowMap);
                renderer.clear();
            } else {
                renderer.setViewport(viewWidth / 2, viewHeight / 2, light.shadowMapSize.x, light.shadowMapSize.y);
            }
            
            renderList = scene.__webglObjects;
            
            for (j = 0; j < renderList.length; j++) {
                webGLObject = renderList[j];
                object = webGLObject.object;
                webGLObject.render = false;
                if (object.visible && object.castShadow) {
                    if (! ( object instanceof THREE.Mesh) || (object.frustumCulled) || frustum.intersectsObject(object)) {
                       //apply inverse light camera matrix to all objects 
                object._modelViewMatrix.multiplyMatrices(shadowCamera.matrixWorldInverse, object.matrixWorld);//
                        webGLObject.render = true;
                    }
                }
            }
            
            var objectMaterial;
            for (j = 0; j < renderList.length; j++) {
                webGLObject = renderList[j];
                if (webGLObject.render) {
                    object = webGLObject.object;
                    buffer = webGLObject.buffer;
                    
                    objectMaterial = object.material;
                    material = depthMat;
                    
                    if (buffer instanceof THREE.BufferGeometry) {
                        renderer.renderBufferDirect(shadowCamera, scene.__lights, null, material, buffer, object);   
                    } else {
                        renderer.renderBuffer(shadowCamera, scene.__lights, null, material, buffer, object);   
                    }
                }
            } 
            
            // set matrices and render immediate objects

			renderList = scene.__webglObjectsImmediate;

			for ( j = 0, jl = renderList.length; j < jl; j ++ ) {

				webglObject = renderList[ j ];
				object = webglObject.object;

				if ( object.visible && object.castShadow ) {

					object._modelViewMatrix.multiplyMatrices( shadowCamera.matrixWorldInverse, object.matrixWorld );

					_renderer.renderImmediateObject( shadowCamera, scene.__lights, fog, depthMat, object );

				}

			}
        }
        
        //restore GL state
        if (this.drawMapOnScreen) {
            renderer.setViewport(0, 0, viewWidth, viewHeight);
        }
        
        var clearColor = renderer.getClearColor(),
            clearAlpha = renderer.getClearAlpha();
        
        GL.clearColor(clearColor.r, clearColor.g, clearColor.b, clearAlpha);
        GL.enable(GL.BLEND);
        GL.cullFace(GL.BACK);
        
    };

};