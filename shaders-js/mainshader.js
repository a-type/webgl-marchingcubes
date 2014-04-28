THREE.MainShader = {
    
    
    //if you were ever curious about the most obnoxious way you could ever write GLSL, look no further.    
    
    uniforms: {
        "ambient": { type: "c", value: new THREE.Color( 0xffffff ) },
        "diffuse": { type: "c", value: new THREE.Color( 0xeeeeee ) },
        "emissive": { type: "c", value: new THREE.Color( 0x000000 ) },
        "ambientLightColor": { type: "fv", value: [] },
        "shadowMatrix": { type: "m4", value: new THREE.Matrix4() },
        "shadowMap": { type: "t", value: null },
        "shadowMapSize": { type: "v2", value: [] },
        "shadowDarkness": { type: "f", value: null },
        "directionalLightColor": { type: "fv", value: [] },
        "directionalLightDirection": { type: "fv", value: [] }
    },
    
    vertexShader: [
        "uniform vec3 ambient;",
        "uniform vec3 diffuse;",
        "uniform vec3 emissive;",
        "uniform vec3 ambientLightColor;",
        "uniform vec3 directionalLightColor;",
        "uniform vec3 directionalLightDirection;",
        "uniform mat4 shadowMatrix;",  
        "varying vec4 vShadowCoord;",
        "varying vec3 vColor;",
        "varying vec3 vLightFront;",

        "void main(void)",
        "{",
            "vec3 transformedNormal = normalMatrix * normal;",
            "vLightFront = vec3(0.0);",
            "transformedNormal = normalize(transformedNormal);",
            "vec4 lDirection = viewMatrix * vec4(directionalLightDirection, 0.0);",
            "vec3 dirVector = normalize(lDirection.xyz);",
            "float dotProd = dot(transformedNormal, dirVector);",
            "vec3 directionalLightWeight = vec3(max(dotProd, 0.0));",
            "vLightFront += directionalLightColor * directionalLightWeight;",
            "vLightFront = vLightFront * diffuse + ambient * ambientLightColor + emissive;",
                
            "vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
            "vec4 worldPosition = modelMatrix * vec4(position, 1.0);",
            "gl_Position = projectionMatrix * mvPosition;",
        
            "vShadowCoord = shadowMatrix * worldPosition;",
            
            "vColor = color;",
        "}"     
    ].join("\n"),
    
    fragmentShader: [
        //parameters
        "uniform sampler2D shadowMap;",
        "uniform vec2 shadowMapSize;",
        "uniform float shadowDarkness;",
        "varying vec4 vShadowCoord;",
        "varying vec3 vColor;",
        "varying vec3 vLightFront;",

        "float unpackDepth(const in vec4 rgba_depth) {",
            "const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );",
            "float depth = dot(rgba_depth, bit_shift);",
            "return depth;",
        "}",

        //main
        "void main()",
        "{",
            "float fDepth;",
            "vec3 shadowColor = vec3( 1.0 );",
            "gl_FragColor = vec4(1.0);",
            "gl_FragColor.xyz *= vLightFront;",
            "gl_FragColor = gl_FragColor * vec4( vColor, 1.0 );",
            //"gl_FragColor.xyz = vec3( 1.0 );",

            "vec3 vShadowCoord = vShadowCoord.xyz / vShadowCoord.w;",
            
            "vShadowCoord.z += 0.0005;",

            "vec4 rgbaDepth = texture2D(shadowMap, vShadowCoord.xy);",
            "fDepth = unpackDepth(rgbaDepth);",
            "if (fDepth < vShadowCoord.z) {",
                "shadowColor = shadowColor * vec3(1.0 - shadowDarkness);",
            "}",

            //"gl_FragColor.xyz = gl_FragColor.xyz * shadowColor;",
        "}"
    ].join("\n")
};