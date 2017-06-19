/* eslint no-nested-ternary: 0 */
/**
 * Sigma.js Quad Tree Class
 * =========================
 *
 * Class implementing the quad tree data structure used to solve hovers and
 * determine which elements are currently in the scope of the camera so that
 * we don't waste time rendering things the user cannot see anyway.
 */

// TODO: should not ask the quadtree when the camera has the whole graph in
// sight.

// TODO: a square can be represented as topleft + width

// TODO: jsdoc

// TODO: be sure we can handle cases overcoming boundaries (because of size) or use a max

// TODO: decide whether to store at leaf level or at medium levels (frustum vs. hover)

/**
 * Constants.
 *
 * Note that since we are representing a static 4-ary tree, the indices of the
 * quadrants are the following:
 *   - TOP_LEFT:     4i + b
 *   - TOP_RIGHT:    4i + 2b
 *   - BOTTOM_LEFT:  4i + 3b
 *   - BOTTOM_RIGHT: 4i + 4b
 */
const BLOCKS = 4,
      MAX_LEVEL = 5;

const X_OFFSET = 0,
      Y_OFFSET = 1,
      WIDTH_OFFSET = 2,
      HEIGHT_OFFSET = 3;

const TOP_LEFT = 1,
      TOP_RIGHT = 2,
      BOTTOM_LEFT = 3,
      BOTTOM_RIGHT = 4;

/**
 * Geometry helpers.
 */

/**
 * Function returning whether the given rectangle is axis-aligned.
 *
 * @param  {number} x1
 * @param  {number} y1
 * @param  {number} x2
 * @param  {number} y2
 * @return {boolean}
 */
function isAxisAligned(x1, y1, x2, y2) {
  return x1 === x2 || y1 === y2;
}

function rectangleCollidesWithQuad(x1, y1, w, qx, qy, qw, qh) {
  return (
    x1 < qx + qw &&
    x1 + w > qx &&
    y1 < qy + qh &&
    y1 + w > qy
  );
}

function pointIsInQuad(x, y, qx, qy, qw, qh) {
  const xmp = qx + qw / 2,
        ymp = qy + qh / 2,
        top = y < ymp,
        left = x < xmp;

  return top ?
    (left ? TOP_LEFT : TOP_RIGHT) :
    (left ? BOTTOM_LEFT : BOTTOM_RIGHT);
}

/**
 * Helper functions that are not bound to the class so an external user
 * cannot mess with them.
 */
function buildQuadrants(maxLevel, data) {

  // [block, level]
  const stack = [0, 0];

  while (stack.length) {
    const level = stack.pop(),
          block = stack.pop();

    const topLeftBlock = 4 * block + BLOCKS,
          topRightBlock = 4 * block + 2 * BLOCKS,
          bottomLeftBlock = 4 * block + 3 * BLOCKS,
          bottomRightBlock = 4 * block + 4 * BLOCKS;

    const x = data[block + X_OFFSET],
          y = data[block + Y_OFFSET],
          width = data[block + WIDTH_OFFSET],
          height = data[block + HEIGHT_OFFSET],
          hw = width / 2,
          hh = height / 2;

    data[topLeftBlock + X_OFFSET] = x;
    data[topLeftBlock + Y_OFFSET] = y;
    data[topLeftBlock + WIDTH_OFFSET] = hw;
    data[topLeftBlock + HEIGHT_OFFSET] = hh;

    data[topRightBlock + X_OFFSET] = x + hw;
    data[topRightBlock + Y_OFFSET] = y;
    data[topRightBlock + WIDTH_OFFSET] = hw;
    data[topRightBlock + HEIGHT_OFFSET] = hh;

    data[bottomLeftBlock + X_OFFSET] = x;
    data[bottomLeftBlock + Y_OFFSET] = y + hh;
    data[bottomLeftBlock + WIDTH_OFFSET] = hw;
    data[bottomLeftBlock + HEIGHT_OFFSET] = hh;

    data[bottomRightBlock + X_OFFSET] = x + hw;
    data[bottomRightBlock + Y_OFFSET] = y + hh;
    data[bottomRightBlock + WIDTH_OFFSET] = hw;
    data[bottomRightBlock + HEIGHT_OFFSET] = hh;

    if (level < maxLevel - 1) {
      stack.push(bottomRightBlock, level + 1);
      stack.push(bottomLeftBlock, level + 1);
      stack.push(topRightBlock, level + 1);
      stack.push(topLeftBlock, level + 1);
    }
  }
}

function insertNode(maxLevel, data, containers, key, x, y, size) {
  const x1 = x - size,
        y1 = y - size,
        w = size * 2;

  // [block, level]
  // TODO: does not require a stack if sticking with mid-level containers
  const stack = [0, 0];

  while (stack.length) {
    let level = stack.pop();

    const block = stack.pop();

    // If we reached max level
    if (level >= maxLevel) {
      containers[block] = containers[block] || [];
      containers[block].push(key);
      return;
    }

    const topLeftBlock = 4 * block + BLOCKS,
          topRightBlock = 4 * block + 2 * BLOCKS,
          bottomLeftBlock = 4 * block + 3 * BLOCKS,
          bottomRightBlock = 4 * block + 4 * BLOCKS;

    const collidingWithTopLeft = rectangleCollidesWithQuad(
      x1,
      y1,
      w,
      data[topLeftBlock + X_OFFSET],
      data[topLeftBlock + Y_OFFSET],
      data[topLeftBlock + WIDTH_OFFSET],
      data[topLeftBlock + HEIGHT_OFFSET]
    );

    const collidingWithTopRight = rectangleCollidesWithQuad(
      x1,
      y1,
      w,
      data[topRightBlock + X_OFFSET],
      data[topRightBlock + Y_OFFSET],
      data[topRightBlock + WIDTH_OFFSET],
      data[topRightBlock + HEIGHT_OFFSET]
    );

    const collidingWithBottomLeft = rectangleCollidesWithQuad(
      x1,
      y1,
      w,
      data[bottomLeftBlock + X_OFFSET],
      data[bottomLeftBlock + Y_OFFSET],
      data[bottomLeftBlock + WIDTH_OFFSET],
      data[bottomLeftBlock + HEIGHT_OFFSET]
    );

    const collidingWithBottomRight = rectangleCollidesWithQuad(
      x1,
      y1,
      w,
      data[bottomRightBlock + X_OFFSET],
      data[bottomRightBlock + Y_OFFSET],
      data[bottomRightBlock + WIDTH_OFFSET],
      data[bottomRightBlock + HEIGHT_OFFSET]
    );

    const collisions = (
      collidingWithTopLeft +
      collidingWithTopRight +
      collidingWithBottomLeft +
      collidingWithBottomRight
    );

    // If we don't have at least a collision, there is an issue
    if (collisions === 0)
      throw new Error(`sigma/quadtree.insertNode: no collision (level: ${level}, key: ${key}, x: ${x}, y: ${y}, size: ${size}).`);

    // If we have 3 collisions, we have a geometry problem obviously
    if (collisions === 3)
      throw new Error(`sigma/quadtree.insertNode: 3 impossible collisions (level: ${level}, key: ${key}, x: ${x}, y: ${y}, size: ${size}).`);

    // If we have more that one collision, we stop here and store the node
    // in the relevant containers
    if (collisions > 1) {
      containers[block] = containers[block] || [];
      containers[block].push(key);
      return;
    }
    else {
      level++;
    }

    // Else we recurse into the correct quads
    if (collidingWithTopLeft)
      stack.push(topLeftBlock, level);

    if (collidingWithTopRight)
      stack.push(topRightBlock, level);

    if (collidingWithBottomLeft)
      stack.push(bottomLeftBlock, level);

    if (collidingWithBottomRight)
      stack.push(bottomRightBlock, level);
  }
}

/**
 * QuadTree class.
 *
 * @constructor
 * @param {Graph} graph - A graph instance.
 */
export default class QuadTree {
  constructor(boundaries) {

    // Allocating the underlying byte array
    const L = Math.pow(4, MAX_LEVEL);

    this.data = new Float32Array(BLOCKS * ((4 * L - 1) / 3));
    this.containers = {};

    if (boundaries)
      this.resize(boundaries);
  }

  add(key, x, y, size) {
    insertNode(
      MAX_LEVEL,
      this.data,
      this.containers,
      key,
      x,
      y,
      size
    );

    return this;
  }

  resize(boundaries) {
    this.clear();

    // Building the quadrants
    this.data[X_OFFSET] = boundaries.x;
    this.data[Y_OFFSET] = boundaries.y;
    this.data[WIDTH_OFFSET] = boundaries.width;
    this.data[HEIGHT_OFFSET] = boundaries.height;

    buildQuadrants(MAX_LEVEL, this.data);
  }

  clear() {
    this.containers = {};

    return this;
  }

  point(x, y) {
    const nodes = [];

    let block = 0,
        level = 0;

    do {
      if (this.containers[block])
        nodes.push.apply(nodes, this.containers[block]);

      const quad = pointIsInQuad(
        x,
        y,
        this.data[block + X_OFFSET],
        this.data[block + Y_OFFSET],
        this.data[block + WIDTH_OFFSET],
        this.data[block + HEIGHT_OFFSET]
      );

      block = 4 * block + quad * BLOCKS;
      level++;
    } while (level <= MAX_LEVEL);

    return nodes;
  }
}
