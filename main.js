function main() {
    var canvas = document.getElementById("myCanvas");
    var gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL tidak tersedia di browser ini.");
        return;
    }

    // === Buffer posisi vertex ===
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // === Buffer warna ===
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // === Buffer indeks ===
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // === Shader ===
    var vertexShaderCode = `
        attribute vec3 aPosition;
        attribute vec3 aColor;
        attribute vec3 aNormal;

        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;
        uniform mat3 uNormal;

        varying vec3 vPosition;
        varying vec3 vColor;
        varying vec3 vNormal;

        void main(void) {
            gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            vPosition = vec3(uModel * vec4(aPosition, 1.0));
            vColor = aColor;
            vNormal = aNormal;
        }
    `;

    var fragmentShaderCode = `
        precision mediump float;
        varying vec3 vPosition;
        varying vec3 vColor;
        varying vec3 vNormal;

        uniform vec3 uAmbientColor;
        uniform float uAmbientIntensity;
        uniform vec3 uDiffuseColor;
        uniform vec3 uDiffusePosition;
        uniform mat3 uNormal;
        uniform vec3 uViewerPosition;

        void main(void) {
            vec3 lightPos = uDiffusePosition;
            vec3 vlight = normalize(lightPos - vPosition);
            vec3 normalizedNormal = normalize(uNormal * vNormal);

            // ambient
            vec3 ambient = vColor * uAmbientColor * uAmbientIntensity;

            // diffuse
            float cosTheta = max(dot(normalizedNormal, vlight), 0.0);
            vec3 diffuse = vColor * uDiffuseColor * cosTheta;

            // specular
            vec3 reflector = reflect(-vlight, normalizedNormal);
            vec3 normalizedViewer = normalize(uViewerPosition - vPosition);
            float cosPhi = max(dot(reflector, normalizedViewer), 0.0);
            float shininess = 50.0;
            vec3 specular = uDiffuseColor * pow(cosPhi, shininess);

            vec3 phong = ambient + diffuse + specular;
            gl_FragColor = vec4(phong, 1.0);
        }
    `;

    // === Compile shader ===
    function compileShader(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderCode);
    var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderCode);

    // === Buat dan link program ===
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // === Tentukan atribut posisi dan warna ===
    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColor);

    // === Normal (hitung per vertex sementara secara sederhana) ===
    var normals = [];
    for (let i = 0; i < vertices.length; i += 3) {
        normals.push(0.0, 0.0, 1.0);
    }

    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    var aNormal = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    // === Uniform ===
    var uModel = gl.getUniformLocation(program, "uModel");
    var uView = gl.getUniformLocation(program, "uView");
    var uProjection = gl.getUniformLocation(program, "uProjection");
    var uNormal = gl.getUniformLocation(program, "uNormal");
    var uViewerPosition = gl.getUniformLocation(program, "uViewerPosition");
    var uAmbientColor = gl.getUniformLocation(program, "uAmbientColor");
    var uAmbientIntensity = gl.getUniformLocation(program, "uAmbientIntensity");
    var uDiffuseColor = gl.getUniformLocation(program, "uDiffuseColor");
    var uDiffusePosition = gl.getUniformLocation(program, "uDiffusePosition");

    // === Atur nilai uniform pencahayaan ===
    gl.uniform3fv(uAmbientColor, [1.0, 1.0, 1.0]);
    gl.uniform1f(uAmbientIntensity, 0.3);
    gl.uniform3fv(uDiffuseColor, [1.0, 1.0, 1.0]);
    gl.uniform3fv(uDiffusePosition, [0.0, 0.25, 1.0]);

    // === Kamera dan transformasi ===
    var model = glMatrix.mat4.create();
    var view = glMatrix.mat4.create();
    var projection = glMatrix.mat4.create();

    var camera = [0.0, 0.0, 1.75];
    glMatrix.mat4.lookAt(view, camera, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
    glMatrix.mat4.perspective(projection, glMatrix.glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 10.0);
    gl.uniform3fv(uViewerPosition, camera);

    // === Pengaturan WebGL dasar ===
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    var theta = glMatrix.glMatrix.toRadian(1);

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (!freeze) {
            glMatrix.mat4.rotateY(model, model, theta);
            glMatrix.mat4.rotateX(model, model, theta / 2);
        }

        gl.uniformMatrix4fv(uModel, false, model);
        gl.uniformMatrix4fv(uView, false, view);
        gl.uniformMatrix4fv(uProjection, false, projection);

        var normalMatrix = glMatrix.mat3.create();
        glMatrix.mat3.normalFromMat4(normalMatrix, model);
        gl.uniformMatrix3fv(uNormal, false, normalMatrix);

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
