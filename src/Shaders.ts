export const Shaders = {

    functions: {
        palettes: {
            viridis: `
                vec3 viridis( float x ) {
                    x = clamp(x, 0., 1.0);
                    vec4 x1 = vec4( 1.0, x, x * x, x * x * x ); // 1 x x2 x3
                    vec4 x2 = x1 * x1.w * x; // x4 x5 x6 x7
                    return vec3(
                        dot( x1, vec4( +0.280268003, -0.143510503, +2.225793877, -14.81508888 ) ) + dot( x2.xy, vec2( +25.212752309, -11.77258958 ) ),
                        dot( x1, vec4( -0.002117546, +1.617109353, -1.909305070, +2.701152864 ) ) + dot( x2.xy, vec2(  -1.685288385, +0.178738871 ) ),
                        dot( x1, vec4( +0.300805501, +2.614650302, -12.01913909, +28.93355911 ) ) + dot( x2.xy, vec2( -33.491294770, +13.76205384 ) )
                    );
                }
            `
        }
    }

}