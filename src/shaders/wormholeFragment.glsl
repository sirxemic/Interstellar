#define ID_SATURN 0
#define ID_SATURN_RING 1
#define ID_GALAXY1 2
#define ID_GALAXY2 3
#define ID_BLACKHOLE 4
#define ID_BLACKHOLE_DISK 5
#define ID_PLANET 6

uniform mat4 cameraMatrix;
uniform int cameraGalaxy;

uniform vec3 lightDirection;

uniform vec3 planetDiffuse;
uniform vec3 planetSpecular;

uniform vec4 wormhole;
uniform float wormholeGravityRatio;
uniform vec4 blackhole;

uniform vec4 saturn;
uniform vec4 planet;

uniform vec4 blackholeDisk;
uniform vec4 saturnRings;

uniform sampler2D texSaturn;
uniform sampler2D texSaturnRings;
uniform sampler2D texGalaxy1;
uniform sampler2D texGalaxy2;
uniform sampler2D texAccretionDisk;

varying vec2 vRayPos;

const float lightSpeed = 0.2; // Not actually representing light speed :P

const float INFINITY = 1000000.0;
const float GALAXY_EDGE = 10000.0;

const float EPSILON = 0.0001;
const float r2 = 0.0625;

const float PI = 3.14159265359;
const float TWOPI = 6.28318530718;

float gravityWormhole = wormhole.w * lightSpeed * lightSpeed;
float gravityBlackhole = blackhole.w * lightSpeed * lightSpeed;

vec3 toGamma(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}

vec3 toLinear(vec3 color) {
  return pow(color, vec3(2.2));
}

vec3 saturnColor(vec3 pos)
{
  vec2 uv = vec2(
    0.5 + atan(pos.z, pos.x) / TWOPI,
    0.5 - asin(pos.y) / PI
  );
  return toLinear(texture2D(texSaturn, uv).rgb) * 1.12;
}

vec3 panoramaColor(float n, vec3 pos)
{
  vec2 uv = vec2(
    0.5 - atan(pos.z, pos.x) / TWOPI,
    0.5 - asin(pos.y) / PI
  );
  if (n < 0.5) return toLinear(texture2D(texGalaxy1, uv).rgb);
  else return toLinear(texture2D(texGalaxy2, uv).rgb);
}

vec3 accretionDiskColor(vec3 pos)
{
  pos = pos - blackhole.xyz;
  float dist = length(pos);

  float r1 = length(blackholeDisk.xyz);
  float r2 = blackholeDisk.w;

  // Important! Scale radii according to black hole
  float v = clamp((dist - r1) / (r2 - r1), 0.0, 1.0);

  vec3 base = cross(blackholeDisk.xyz, vec3(0.0, 0.0, 1.0));
  float angle = acos(dot(normalize(base), normalize(pos)));
  if (dot(cross(base, pos), blackholeDisk.xyz) < 0.0) angle = -angle;

  float u = 0.5 - angle / TWOPI;

#ifdef GL_EXT_shader_texture_lod
  vec3 color = texture2DLodEXT(texAccretionDisk, vec2(u, v), 0.0).rgb;
#else
  vec3 color = texture2D(texAccretionDisk, vec2(u, v)).rgb;
#endif

  return toLinear(color);
}

float sphereDistance(vec3 rayPosition, vec3 rayDirection, vec4 sphere)
{
  vec3 v;
  float p, d;
  v = rayPosition - sphere.xyz;
  p = dot(rayDirection, v);
  d = p * p + sphere.w * sphere.w - dot(v, v);

  return d < 0.0 ? -1.0 : -p - sqrt(d);
}

vec4 saturnRingColor(vec3 pos)
{
  pos = pos - saturn.xyz;

  float r1 = length(saturnRings.xyz);
  float r2 = saturnRings.w;

  // Important! Scale radii according to saturn
  float v = clamp((length(pos) - r1) / (r2 - r1), 0.0, 1.0);

#ifdef GL_EXT_shader_texture_lod
  vec4 color = texture2DLodEXT(texSaturnRings, vec2(0.5, v), 0.0);
#else
  vec4 color = texture2D(texSaturnRings, vec2(0.5, v));
#endif

  color.rgb = toLinear(color.rgb) * 1.15;

  float objectDistance = sphereDistance(saturn.xyz + pos, lightDirection, saturn);
  if (objectDistance > 0.0)
  {
    color.rgb *= 0.001;
  }
  color.rgb *= color.a;

  return vec4(color.rgb, -color.a);
}

float ringDistance(vec3 rayPosition, vec3 rayDirection, vec3 center, vec4 definition)
{
  float r1 = length(definition.xyz);
  float r2 = definition.w;
  vec3 normal = definition.xyz / r1;

  float denominator = dot(rayDirection, normal);
  float constant = -dot(center, normal);
  float distanceToCenter;
  if (abs(denominator) < EPSILON)
  {
    return -1.0;
  }
  else
  {
    float t = -(dot(rayPosition, normal) + constant) / denominator;
    if (t < 0.0) return -1.0;

    vec3 intersection = rayPosition + t * rayDirection;
    distanceToCenter = length(intersection - center);
    if (distanceToCenter >= r1 && distanceToCenter <= r2)
    {
      return t;
    }
    return -1.0;
  }
}

vec3 computeShading(vec3 light, vec3 view, vec3 normal, vec3 diffuse, vec3 specular, vec3 ambient)
{
  float lambertian = max(dot(light, normal), 0.0);
  vec3 reflectDir = reflect(-light, normal);
  float specAngle = max(dot(reflectDir, view), 0.0);
  float specularAmount = pow(specAngle, 4.0);
  return ambient + lambertian * diffuse + specularAmount * specular;
}

void testDistance(int i, float distance, inout float currentDistance, inout int currentObject)
{
  if (distance >= EPSILON && distance < currentDistance)
  {
    currentDistance = distance;
    currentObject = i;
  }
}

vec3 raytrace(vec3 rayPosition, vec3 rayDirection)
{
  float currentDistance = INFINITY;
  int   currentObject = -1, prevObject = -1;
  float currentGalaxy = float(cameraGalaxy);
  vec3  currentPosition;
  vec3  normal;

  float stepSize, rayDistance;
  vec3 gravityVector, rayAccel;
  float objectDistance;

  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

  for (int i = 0; i < 100; i++)
  {
    currentDistance = INFINITY;

    // Bend the light towards the wormhole
    gravityVector = wormhole.xyz - rayPosition;
    rayDistance = length(gravityVector);

    // 0.86: rate of smaller steps when approaching wormhole
    stepSize = rayDistance - wormhole.w * 0.86;

    rayDistance -= wormhole.w * (1.0 - wormholeGravityRatio);

    float amount = wormholeGravityRatio / rayDistance;
    rayAccel = normalize(gravityVector) * gravityWormhole * amount * amount;

    if (currentGalaxy > 0.5)
    {
      // Bend the light towards the black hole
      gravityVector = blackhole.xyz - rayPosition;
      rayDistance = length(gravityVector);

      // 0.05: rate of smaller steps when approaching blackhole
      stepSize = min(stepSize, rayDistance - blackhole.w * 0.05);

      // rayAccel += normalize(gravityVector) * gravityBlackhole / (rayDistance * rayDistance)
      rayAccel += gravityVector * gravityBlackhole / (rayDistance * rayDistance * rayDistance);
    }

    if (length(rayAccel) > lightSpeed)
    {
      rayAccel = normalize(rayAccel) * lightSpeed;
    }

    rayDirection = normalize(rayDirection * lightSpeed + rayAccel * stepSize);

    if (stepSize <= 0.005)
    {
      currentObject = -1;
      break;
    }

    if (currentGalaxy < 0.5)
    {
      objectDistance = sphereDistance(rayPosition, rayDirection, saturn);
      testDistance(ID_SATURN, objectDistance, currentDistance, currentObject);

      objectDistance = ringDistance(rayPosition, rayDirection, saturn.xyz, saturnRings);
      testDistance(ID_SATURN_RING, objectDistance, currentDistance, currentObject);

      testDistance(ID_GALAXY1, GALAXY_EDGE, currentDistance, currentObject);
    }
    else
    {
      objectDistance = sphereDistance(rayPosition, rayDirection, planet);
      testDistance(ID_PLANET, objectDistance, currentDistance, currentObject);

      // Test against a bit smaller sphere due to precision errors
      objectDistance = sphereDistance(rayPosition, rayDirection, vec4(blackhole.xyz, blackhole.w * 0.93));
      testDistance(ID_BLACKHOLE, objectDistance, currentDistance, currentObject);

      objectDistance = ringDistance(rayPosition, rayDirection, blackhole.xyz, blackholeDisk);
      testDistance(ID_BLACKHOLE_DISK, objectDistance, currentDistance, currentObject);

      testDistance(ID_GALAXY2, GALAXY_EDGE, currentDistance, currentObject);
    }

    rayDistance = lightSpeed * stepSize;

    // Check if we hit any object, and if so, stop integrating
    if (currentObject != -1 && currentDistance <= rayDistance)
    {
      // But if it's something transparent, get its color, and continue
      if (currentObject == ID_BLACKHOLE_DISK)
      {
        currentPosition = rayPosition + rayDirection * currentDistance;
        color.rgb += accretionDiskColor(currentPosition).rgb * color.a;
        currentObject = -1;
        prevObject = ID_BLACKHOLE_DISK;
      }
      else if (currentObject == ID_SATURN_RING)
      {
        currentPosition = rayPosition + rayDirection * currentDistance;
        if (prevObject != ID_SATURN_RING)
        {
          color += saturnRingColor(currentPosition);
        }
        currentObject = -1;
        prevObject = ID_SATURN_RING;

        // Ensure we don't overstep and go through Saturn
        rayDistance = min(rayDistance, 0.9 * (length(saturnRings.xyz) - saturn.w));
      }
      else
      {
        break;
      }
    }

    float d = sphereDistance(rayPosition, rayDirection, wormhole);
    if (d > 0.0 && d < rayDistance)
    { // Ray goes through wormhole
      currentGalaxy = 1.0 - currentGalaxy;
      vec3 intersection = rayPosition + rayDirection * d;
      gravityVector = normalize(intersection - wormhole.xyz);

      rayPosition = 2.0 * wormhole.xyz - intersection;
      rayDirection = -reflect(rayDirection, gravityVector);

      rayPosition += rayDirection * d;
    }
    else
    {
      rayPosition += rayDirection * rayDistance;
    }
  }

  currentPosition = rayPosition + rayDirection * currentDistance;

  if (currentObject == ID_GALAXY1 || currentObject == ID_GALAXY2)
  {
    color.rgb += panoramaColor(currentGalaxy, rayDirection) * color.a;
  }
  else if (currentObject == ID_SATURN)
  {
    normal = (currentPosition - saturn.xyz) / saturn.w;

    vec3 diffuse = saturnColor(normal);
    vec3 specular = vec3(0.0);
    vec3 ambient = vec3(0.0001);

    float objectDistance = ringDistance(currentPosition, lightDirection, saturn.xyz, saturnRings);
    if (objectDistance > 0.0)
    {
      diffuse *= 1.0 + saturnRingColor(currentPosition + lightDirection * objectDistance).a;
    }

    color.rgb += computeShading(lightDirection, -rayDirection, normal, diffuse, specular, ambient) * color.a;
  }
  else if (currentObject == ID_PLANET)
  {
    normal = (currentPosition - planet.xyz) / planet.w;

    // light direction for black hole-orbiting planet is towards the blackhole
    vec3 lightDirection2 = normalize(blackhole.xyz - planet.xyz);

    vec3 diffuse = planetDiffuse;
    vec3 specular = planetSpecular;
    vec3 ambient = vec3(0.01);
    color.rgb += computeShading(lightDirection2, -rayDirection, normal, diffuse, specular, ambient) * color.a;
  }

  return color.rgb;
}

void main()
{
  vec3 rayDir = (cameraMatrix * vec4(vRayPos, -1.0, 0.0)).xyz;
  vec3 color = raytrace(cameraMatrix[3].xyz, normalize(rayDir));
  gl_FragColor = vec4(toGamma(color), 1.0);
}
