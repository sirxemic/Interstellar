varying vec2 vRayPos;

void main() {
  vRayPos = position.xy;

  gl_Position = vec4(position.xy, 0.0, 1.0);
}
