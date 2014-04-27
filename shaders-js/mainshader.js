THREE.MainShader = {
    
    uniforms: {
        "modelView": { type: "m4", value: null },
        "shadowMatrix": { type: "m4", value: null },
        "worldNormalMatrix": { type: "m3", value: null },
        "shadowMap": { type: "t", value: null },
        "shadowMapSize": { type: "v2", value: null },
        "shadowDarkness": { type: "f", value: null },
        "directionalLightColor": { type: "fv", value: [] },
        "directionalLightDirection": { type: "fv", value: [] }
    },
    
    vertexShader: [
        "uniform mat4 modelView;",
        "uniform mat4 shadowMatrix;",
        "uniform mat3 worldNormalMatrix;",
        "attribute vec4 position;",
        "attribute vec3 aNormal;",
        "varying vec3 vNormal;",
        "varying vec4 shadowCoord;",

        "void main(void)",
        "{",
            "shadowCoord = shadowMatrix * position;",
            "vNormal = worldNormalMatrix * aNormal;",
            "gl_Position = modelView * position;",
        "}"     
    ].join("\n"),
    
    fragmentShader: [
        //parameters
        "uniform sampler2D shadowMap;",
        "uniform vec2 shadowMapSize;",
        "uniform float shadowDarkness;",
        "varying vec4 vShadowCoord;",

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

            "vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;",
            "bvec4 inFrustumVec = bvec4(shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0);",
            "bool inFrustum = all(inFrustumVec);",
            "bvec2 frustumTestVec = bvec2(inFrustum, shadowCoord.z <= 1.0);",
            "bool frustumTest = all(frustumTestVec);",

            "if (frustumTest) {",
                "shadowCoord.z += 0.0005;",

                "vec4 rgbaDepth = texture2D(shadowMap, shadowCoord.xy);",
                "float fDepth = unpackDepth(rgbaDepth);",
                "if (fDepth < shadowCoord.z) {",
                    "shadowColor = shadowColor * vec3(1.0 - shadowDarkness);",
                "}",
            "}",

            "gl_FragColor.xyz = gl_FragColor.xyz * shadowColor;",
        "}"
    ].join("\n")
};