THREE.ShadowMapShader = {

    uniforms: {
        "shadowMatrix" : { type: "m4", value: null }
    },
    
    vertexShader: [
        //parameters
        "varying vec4 vShadowCoord;", //final transformed coordinate
        "uniform mat4 shadowMatrix;", //transform matrix for the light camera

        //main
        "void main()",
        "{",
            "gl_Position = shadowMatrix * vShadowCoord;",
        "}"
    ].join("\n"),
    
    fragmentShader: [
        "vec4 pack_depth(const in float depth)",
        "{",
            "const vec4 bit_shift = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);",
            "const vec4 bit_mask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);",
            "vec4 res = fract(depth * bit_shift);",
            "res -= res.xxyz * bit_mask;",
            "return res;",
        "}",

        "void main(void)",
        "{",
            "gl_FragData[0] = pack_depth(gl_FragCoord.z);",
        "}"
    ].join("\n")
}