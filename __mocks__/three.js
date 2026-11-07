class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  divideScalar(s) { this.x /= s; this.y /= s; this.z /= s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  cross(v) { return this.crossVectors(this, v); }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx;
    return this;
  }
  normalize() {
    const l = Math.hypot(this.x, this.y, this.z);
    if (l > 0) { this.x /= l; this.y /= l; this.z /= l; }
    return this;
  }
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  lerpVectors(a, b, t) {
    this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t;
    return this;
  }
  applyQuaternion(q) {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }
  project(camera) {
    if (!camera || !camera.position) return this;
    const C = camera.position;
    const fovRad = ((camera.fov || 50) * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const forward = new Vector3(-C.x, -C.y, -C.z).normalize();
    let right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-4) {
      right = new Vector3(1, 0, 0);
    } else {
      right.normalize();
    }
    const up = new Vector3().crossVectors(right, forward).normalize();
    const rel = new Vector3(this.x - C.x, this.y - C.y, this.z - C.z);
    const zCam = rel.dot(forward);
    const xCam = rel.dot(right);
    const yCam = rel.dot(up);
    const aspect = camera.aspect || 1;
    this.x = xCam / (Math.max(0.1, zCam) * tanHalfFov * aspect);
    this.y = yCam / (Math.max(0.1, zCam) * tanHalfFov);
    this.z = 0;
    return this;
  }
}

class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
  copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this;
  }
  setFromUnitVectors(vFrom, vTo) {
    let r = vFrom.dot(vTo) + 1;
    if (r < 1e-6) {
      r = 0;
      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        this.x = -vFrom.y; this.y = vFrom.x; this.z = 0; this.w = r;
      } else {
        this.x = 0; this.y = -vFrom.z; this.z = vFrom.y; this.w = r;
      }
    } else {
      this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
      this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
      this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
      this.w = r;
    }
    const len = Math.hypot(this.x, this.y, this.z, this.w);
    this.x /= len; this.y /= len; this.z /= len; this.w /= len;
    return this;
  }
  slerp(qb, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);
    let x = this.x, y = this.y, z = this.z, w = this.w;
    let cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    if (cosHalfTheta < 0) {
      this.w = -qb.w; this.x = -qb.x; this.y = -qb.y; this.z = -qb.z;
      cosHalfTheta = -cosHalfTheta;
    } else {
      this.copy(qb);
    }
    if (cosHalfTheta >= 1.0) {
      this.w = w; this.x = x; this.y = y; this.z = z;
      return this;
    }
    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;
    if (sqrSinHalfTheta <= Number.EPSILON) {
      const s = 1 - t;
      this.w = s * w + t * this.w;
      this.x = s * x + t * this.x;
      this.y = s * y + t * this.y;
      this.z = s * z + t * this.z;
      const len = Math.hypot(this.x, this.y, this.z, this.w);
      this.x /= len; this.y /= len; this.z /= len; this.w /= len;
      return this;
    }
    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    this.w = w * ratioA + this.w * ratioB;
    this.x = x * ratioA + this.x * ratioB;
    this.y = y * ratioA + this.y * ratioB;
    this.z = z * ratioA + this.z * ratioB;
    return this;
  }
}

class BufferAttribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
}

class BufferGeometry {
  constructor() { this.attributes = {}; }
  setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  setFromPoints(pts) { return this; }
  computeVertexNormals() { return this; }
  center() { return this; }
}

class Shape {
  moveTo() {} lineTo() {} quadraticCurveTo() {}
}

class ExtrudeGeometry extends BufferGeometry {}
class MeshBasicMaterial {}
class MeshStandardMaterial {}
class ShaderMaterial {}
class Euler {}
class Matrix4 {
  lookAt() { return this; }
}
class Color {
  constructor(c) {
    this.c = c;
    if (typeof c === 'string' && c.startsWith('#')) {
      const hex = parseInt(c.slice(1), 16);
      this.r = ((hex >> 16) & 255) / 255;
      this.g = ((hex >> 8) & 255) / 255;
      this.b = (hex & 255) / 255;
    } else {
      this.r = 1; this.g = 1; this.b = 1;
    }
  }
}

class PerspectiveCamera {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 1000) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.position = new Vector3();
    this.matrixWorld = new Matrix4();
  }
  lookAt() {}
  updateMatrixWorld() {}
  updateProjectionMatrix() {}
}

module.exports = {
  Vector3,
  Quaternion,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  Shape,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  Color,
  Euler,
  Matrix4,
  DoubleSide: 2,
  BackSide: 1,
  FrontSide: 0,
  AdditiveBlending: 2,
};
