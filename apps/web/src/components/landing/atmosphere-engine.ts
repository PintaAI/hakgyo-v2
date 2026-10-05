type Particle = {
  x: number;
  y: number;
  /**
   * 0.3 to 1: how near the glyph is. Near glyphs are larger, sharper, and
   * bolder, and react more to wind.
   */
  depth: number;
  seed: number;
  size: number;
  glyph: string;
  /** The glyph floats inside a soap bubble that can pop. */
  bubble: boolean;
  /** When a bubble pops by itself. */
  popAt: number;
  phase: "alive" | "popping" | "gone";
  /** When the particle entered `popping`. */
  phaseAt: number;
  /** When a popped particle returns as a fresh glyph. */
  respawnAt: number;
  /** When the particle appeared; it fades in over `fadeInMs`. */
  spawnAt: number;
  /** The glyph and bubble drawn once, already blurred by depth. */
  glyphSprite: Sprite | null;
  bubbleSprite: Sprite | null;
};

/** A pre-rendered image centred on its particle; `half` is in CSS pixels. */
type Sprite = { canvas: HTMLCanvasElement; half: number };

/**
 * A glyph that dropped out of a popped bubble. It moves by Verlet
 * integration: velocity is the distance from the previous position.
 */
type Fallen = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  angle: number;
  /** Rotation per frame while in the air. */
  spin: number;
  depth: number;
  size: number;
  glyph: string;
  seed: number;
  sprite: Sprite;
  /** When it started fading out to make room on the floor. */
  leavingAt: number | null;
};

/** Glyphs on a 1440×900 screen; smaller screens get fewer. */
const glyphsPerScreen = 12;
/** Overall strength of the effect, kept faint behind the slides. */
const opacity = 0.5;

const glyphs = [
  "한",
  "국",
  "어",
  "학",
  "교",
  "안",
  "녕",
  "사",
  "랑",
  "가",
  "나",
  "다",
];

/** Strongest wind in pixels per 60 Hz frame. */
const maxWind = 5;
/** Share of wind left after one 60 Hz frame. */
const windDecay = 0.93;
/** Wind added per pixel of scroll movement. */
const windPerScrollPixel = 0.04;
/** Depth of the farthest particle; the nearest is 1. */
const minDepth = 0.3;
/** Blur in pixels for the farthest glyph; the nearest is sharp. */
const maxGlyphBlur = 3.5;
/** Share of glyphs that float inside a bubble. */
const bubbleShare = 0.35;
/** A bubble pops by itself after a time within this range (ms). */
const bubbleLifeMs = [6000, 22000] as const;
const popMs = 380;
/** A popped glyph returns as a new one after a time within this range (ms). */
const respawnMs = [1200, 3200] as const;
const fadeInMs = 1000;
/** Extra pixels around a bubble that still count as a click on it. */
const bubbleHitSlop = 6;
/** Downward pull on a fallen glyph, in pixels per 60 Hz frame squared. */
const gravity = 0.35;
/** The floor keeps one fallen glyph per this many pixels of screen width. */
const floorPixelsPerGlyph = 40;
const maxFallen = 36;
const fallenFadeMs = 800;
/** Far fallen glyphs rest up to this many pixels above the screen's bottom. */
const floorDepthRise = 18;
/** Upward speed a fallen glyph gains per pixel the page scrolls vertically. */
const hopPerScrollPixel = 0.016;
/** Fastest upward speed of a hop, in pixels per 60 Hz frame. */
const maxHopSpeed = 9;
const margin = 48;
const fontFamily = '"Noto Sans KR", system-ui, sans-serif';

function between([min, max]: readonly [number, number]) {
  return min + Math.random() * (max - min);
}

function bubbleRadius(particle: Particle) {
  return particle.size * 0.85 + 8;
}

function glyphCount(width: number, height: number) {
  const area = Math.min(Math.max((width * height) / (1440 * 900), 0.35), 1.6);
  return Math.round(glyphsPerScreen * area);
}

/** A slowly shifting field in -2…2 that steers particles so they swirl. */
function flow(x: number, y: number, time: number) {
  return (
    Math.sin(x * 0.0018 + time * 0.00012) + Math.cos(y * 0.0024 - time * 0.0001)
  );
}

/**
 * Draws drifting hangul glyphs on a full-screen canvas, blurred by depth.
 * Some float in soap bubbles that pop by themselves or when clicked; a popped
 * glyph falls to the bottom of the screen and stays there. Scrolling the
 * page, or sliding a horizontal panel track, blows a wind opposite to the
 * scroll movement (the glyphs travel with the content), which then fades.
 * The caller decides when to run it; this never reads reduced-motion itself.
 * Returns a function that stops it.
 */
export function startAtmosphere(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;
  const ctx = context;

  const wind = { x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let ratio = 1;
  /** The colour the sprites were drawn in; they are redrawn when it changes. */
  let spriteColor = "";
  let particles: Particle[] = [];
  let fallen: Fallen[] = [];
  let frame = 0;
  let last = performance.now();
  let color = "";
  let colorAt = -Infinity;
  let scrollY = window.scrollY;
  const panelLefts = new WeakMap<EventTarget, number>();

  function push(x: number, y: number) {
    wind.x = Math.max(-maxWind, Math.min(maxWind, wind.x + x));
    wind.y = Math.max(-maxWind, Math.min(maxWind, wind.y + y));
  }

  function glyphAngle(particle: Particle, time: number) {
    return Math.sin(time * 0.0004 + particle.seed) * 0.25 + wind.x * 0.04;
  }

  function randomGlyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)]!;
  }

  function pop(particle: Particle, now: number) {
    particle.phase = "popping";
    particle.phaseAt = now;
    drop(particle, now);
  }

  /** The popped bubble's glyph falls to the floor, where it stays. */
  function drop(particle: Particle, now: number) {
    if (!particle.glyphSprite) return;
    fallen.push({
      x: particle.x,
      y: particle.y,
      previousX: particle.x,
      // A small upward kick from the burst.
      previousY: particle.y + 1.5,
      angle: glyphAngle(particle, now),
      spin: (Math.random() - 0.5) * 0.12,
      depth: particle.depth,
      size: particle.size,
      glyph: particle.glyph,
      seed: particle.seed,
      sprite: particle.glyphSprite,
      leavingAt: null,
    });
    const room = Math.min(maxFallen, Math.round(width / floorPixelsPerGlyph));
    const staying = fallen.filter((glyph) => glyph.leavingAt === null);
    staying
      .slice(0, Math.max(staying.length - room, 0))
      .forEach((glyph) => (glyph.leavingAt = now));
  }

  /**
   * Scrolling forward jolts the floor: as the slide moves up, each glyph hops
   * straight up in proportion to how far the page just moved, so the hop
   * starts and ends with the scroll. Scrolling back moves the slide down, into
   * the floor, so the glyphs stay put.
   */
  function jolt(scrolled: number) {
    if (scrolled <= 0) return;
    for (const glyph of fallen) {
      const hop = scrolled * hopPerScrollPixel * glyph.depth;
      // Raising the previous position is how Verlet adds upward speed.
      glyph.previousY = Math.min(
        glyph.previousY + hop,
        glyph.y + maxHopSpeed * glyph.depth,
      );
    }
  }

  function fallenRadius(glyph: Fallen) {
    return glyph.size * 0.42;
  }

  /** Where a fallen glyph's centre rests on the floor. */
  function floorY(glyph: Fallen) {
    const far = (1 - glyph.depth) / (1 - minDepth);
    return height - fallenRadius(glyph) - far * floorDepthRise;
  }

  /**
   * Moves the fallen glyphs one 60 Hz frame. Sideways wind slides and rolls
   * them; vertical scrolling kicks them separately (see `jolt`).
   */
  function stepFallen() {
    for (const glyph of fallen) {
      const radius = fallenRadius(glyph);
      const grounded = glyph.y >= floorY(glyph) - 0.5;
      const vx = (glyph.x - glyph.previousX) * (grounded ? 0.86 : 0.995);
      const vy = (glyph.y - glyph.previousY) * 0.995;
      glyph.previousX = glyph.x;
      glyph.previousY = glyph.y;
      glyph.x += vx + wind.x * 0.08 * glyph.depth;
      glyph.y += vy + gravity * (0.6 + 0.4 * glyph.depth);
      glyph.angle += grounded ? (vx / radius) * 0.6 : glyph.spin;
    }
    // Glyphs at a similar depth push each other apart, so they pile up.
    for (let i = 0; i < fallen.length; i++) {
      const a = fallen[i]!;
      for (let j = i + 1; j < fallen.length; j++) {
        const b = fallen[j]!;
        if (Math.abs(a.depth - b.depth) > 0.25) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const reach = (fallenRadius(a) + fallenRadius(b)) * 0.9;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= reach * reach || distanceSquared === 0) continue;
        const distance = Math.sqrt(distanceSquared);
        const push = (reach - distance) / 2 / distance;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
    for (const glyph of fallen) {
      const radius = fallenRadius(glyph);
      const floor = floorY(glyph);
      if (glyph.y > floor) {
        const vy = glyph.y - glyph.previousY;
        glyph.y = floor;
        // Hard landings bounce a little; resting glyphs stay put.
        glyph.previousY = vy > 1 ? glyph.y + vy * 0.3 : glyph.y;
      }
      if (glyph.x < radius || glyph.x > width - radius) {
        const vx = glyph.x - glyph.previousX;
        glyph.x = Math.min(Math.max(glyph.x, radius), width - radius);
        glyph.previousX = glyph.x + vx * 0.4;
      }
    }
  }

  function advance(particle: Particle, now: number) {
    if (particle.phase === "alive") {
      if (particle.bubble && now >= particle.popAt) pop(particle, now);
    } else if (particle.phase === "popping") {
      if (now - particle.phaseAt >= popMs) {
        particle.phase = "gone";
        particle.respawnAt = now + between(respawnMs);
      }
    } else if (now >= particle.respawnAt) {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.glyph = randomGlyph();
      particle.bubble = Math.random() < bubbleShare;
      particle.popAt = now + between(bubbleLifeMs);
      particle.phase = "alive";
      particle.spawnAt = now;
      buildSprites(particle);
    }
  }

  /** The nearest bubble under a point, if any. */
  function bubbleAt(x: number, y: number) {
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index]!;
      if (
        particle.phase === "alive" &&
        particle.bubble &&
        Math.hypot(x - particle.x, y - particle.y) <=
          bubbleRadius(particle) + bubbleHitSlop
      )
        return particle;
    }
    return null;
  }

  function seed() {
    const count = glyphCount(width, height);
    const now = performance.now();
    particles = Array.from({ length: count }, () => {
      const depth = minDepth + Math.random() * (1 - minDepth);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        seed: Math.random() * Math.PI * 2,
        // Far glyphs are small; near ones are large.
        size: 14 + ((depth - minDepth) / (1 - minDepth)) * 22,
        glyph: randomGlyph(),
        bubble: Math.random() < bubbleShare,
        popAt: now + between(bubbleLifeMs),
        phase: "alive" as const,
        phaseAt: 0,
        respawnAt: 0,
        spawnAt: -Infinity,
        glyphSprite: null,
        bubbleSprite: null,
      };
    });
    particles.forEach(buildSprites);
    // Far glyphs draw first so near ones overlap them.
    particles.sort((a, b) => a.depth - b.depth);
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    seed();
  }

  function onScroll(event: Event) {
    const target = event.target;
    if (target === document) {
      const y = window.scrollY;
      push(0, -(y - scrollY) * windPerScrollPixel);
      jolt(y - scrollY);
      scrollY = y;
    } else if (target instanceof HTMLElement) {
      const previous = panelLefts.get(target) ?? target.scrollLeft;
      panelLefts.set(target, target.scrollLeft);
      push(-(target.scrollLeft - previous) * windPerScrollPixel, 0);
    }
  }

  let pointer: { x: number; y: number } | null = null;
  let hovered: Particle | null = null;

  // A click, not a pointer press, so swiping on a phone never pops a bubble.
  function onClick(event: MouseEvent) {
    const bubble = bubbleAt(event.clientX, event.clientY);
    if (bubble) pop(bubble, performance.now());
  }

  function onPointerMove(event: PointerEvent) {
    pointer =
      event.pointerType === "mouse"
        ? { x: event.clientX, y: event.clientY }
        : null;
  }

  function onPointerLeave() {
    pointer = null;
  }

  function move(particle: Particle, dt: number, time: number) {
    // Glyphs float slowly upward, swaying with the flow field.
    const n = flow(particle.x, particle.y, time);
    particle.x += (n * 0.06 + wind.x * particle.depth) * dt;
    particle.y += (-0.12 - particle.depth * 0.1 + wind.y * particle.depth) * dt;
    if (particle.x > width + margin) particle.x = -margin;
    else if (particle.x < -margin) particle.x = width + margin;
    if (particle.y > height + margin) particle.y = -margin;
    else if (particle.y < -margin) particle.y = height + margin;
  }

  // Safari lacks canvas filters; there the sprites simply stay sharp.
  const supportsFilter = "filter" in ctx;

  /**
   * Draws something once into its own canvas, blurred. Blurring every glyph on
   * every frame is far too slow, so each frame only copies these images.
   */
  function makeSprite(
    half: number,
    blur: number,
    draw: (g: CanvasRenderingContext2D) => void,
  ): Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.ceil(half * 2 * ratio);
    const g = canvas.getContext("2d")!;
    g.scale(ratio, ratio);
    g.translate(half, half);
    if (supportsFilter && blur > 0) g.filter = `blur(${blur.toFixed(1)}px)`;
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineCap = "round";
    g.textAlign = "center";
    g.textBaseline = "middle";
    draw(g);
    return { canvas, half };
  }

  function glyphBlur(depth: number) {
    return ((1 - depth) / (1 - minDepth)) * maxGlyphBlur;
  }

  function makeGlyphSprite({
    glyph,
    size,
    depth,
  }: Pick<Particle, "glyph" | "size" | "depth">) {
    const blur = glyphBlur(depth);
    return makeSprite(size * 0.8 + blur * 3 + 2, blur, (g) => {
      g.font = `${Math.round(size)}px ${fontFamily}`;
      g.fillText(glyph, 0, 0);
    });
  }

  function buildSprites(particle: Particle) {
    const blur = glyphBlur(particle.depth);
    const reach = blur * 3 + 2;
    particle.glyphSprite = makeGlyphSprite(particle);
    const radius = bubbleRadius(particle);
    particle.bubbleSprite = particle.bubble
      ? makeSprite(radius * 1.12 + reach, blur, (g) => {
          // Hollow: a barely-there tint, a crisp rim, an inner shimmer, and
          // two highlights. Alphas are relative to the rim, drawn at full.
          g.beginPath();
          g.arc(0, 0, radius, 0, Math.PI * 2);
          g.globalAlpha = 0.05;
          g.fill();
          g.globalAlpha = 1;
          g.lineWidth = 1;
          g.stroke();
          g.globalAlpha = 0.31;
          g.beginPath();
          g.arc(0, 0, radius * 0.93, 0, Math.PI * 2);
          g.stroke();
          g.lineWidth = 1.6;
          g.globalAlpha = 0.875;
          g.beginPath();
          g.arc(0, 0, radius * 0.78, Math.PI * 1.1, Math.PI * 1.45);
          g.stroke();
          g.globalAlpha = 0.44;
          g.beginPath();
          g.arc(0, 0, radius * 0.78, Math.PI * 0.1, Math.PI * 0.25);
          g.stroke();
        })
      : null;
  }

  function drawSprite(
    sprite: Sprite,
    particle: { x: number; y: number },
    opacity: number,
    rotation = 0,
    scaleX = 1,
    scaleY = 1,
  ) {
    ctx.globalAlpha = Math.min(opacity, 1);
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(
      sprite.canvas,
      -sprite.half,
      -sprite.half,
      sprite.half * 2,
      sprite.half * 2,
    );
    ctx.restore();
  }

  /** The film bursts into an expanding ring and a few droplets. */
  function drawPop(particle: Particle, time: number) {
    const t = Math.min((time - particle.phaseAt) / popMs, 1);
    const eased = 1 - (1 - t) * (1 - t);
    const radius = bubbleRadius(particle);
    const strength = (0.12 + 0.16 * particle.depth) * opacity * (1 - t);
    ctx.globalAlpha = strength * 2;
    ctx.lineWidth = 0.5 + 1.5 * (1 - t);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * (1 + 0.5 * eased), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = strength * 3;
    for (let index = 0; index < 8; index++) {
      const angle = particle.seed + (index * Math.PI) / 4;
      const distance = radius * (1 + 0.9 * eased);
      ctx.beginPath();
      ctx.arc(
        particle.x + Math.cos(angle) * distance,
        particle.y + Math.sin(angle) * distance,
        1.8 * (1 - t) + 0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function drawFallen(time: number) {
    fallen = fallen.filter(
      (glyph) =>
        glyph.leavingAt === null || time - glyph.leavingAt < fallenFadeMs,
    );
    for (const glyph of fallen) {
      const fade =
        glyph.leavingAt === null
          ? 1
          : 1 - (time - glyph.leavingAt) / fallenFadeMs;
      drawSprite(
        glyph.sprite,
        glyph,
        (0.04 + 0.08 * glyph.depth) * opacity * fade,
        glyph.angle,
      );
    }
  }

  function drawHangul(particle: Particle, time: number) {
    if (particle.phase === "gone") return;
    if (particle.phase === "popping") {
      drawPop(particle, time);
      return;
    }
    const fade = Math.min((time - particle.spawnAt) / fadeInMs, 1);
    if (particle.glyphSprite)
      drawSprite(
        particle.glyphSprite,
        particle,
        (0.04 + 0.08 * particle.depth) * opacity * fade,
        glyphAngle(particle, time),
      );
    if (particle.bubbleSprite) {
      const hover = particle === hovered;
      const film = (0.12 + 0.16 * particle.depth) * opacity * fade * 1.6;
      const wobble = 0.04 * Math.sin(time * 0.003 + particle.seed);
      const scale = hover ? 1.06 : 1;
      drawSprite(
        particle.bubbleSprite,
        particle,
        hover ? film * 1.5 : film,
        0,
        scale * (1 + wobble),
        scale * (1 - wobble),
      );
    }
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    // Frames at 60 Hz; capped so a background tab does not teleport everything.
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;
    if (now - colorAt > 500) {
      // Follows the light or dark theme without a listener.
      color = getComputedStyle(canvas).color;
      colorAt = now;
      if (color !== spriteColor) {
        spriteColor = color;
        particles.forEach(buildSprites);
        for (const glyph of fallen) glyph.sprite = makeGlyphSprite(glyph);
      }
    }
    const decay = Math.pow(windDecay, dt);
    wind.x *= decay;
    wind.y *= decay;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    hovered = pointer ? bubbleAt(pointer.x, pointer.y) : null;
    document.documentElement.style.cursor = hovered ? "pointer" : "";
    // Fixed 60 Hz steps keep the Verlet physics stable at any frame rate.
    for (let step = 0; step < Math.max(1, Math.round(dt)); step++) stepFallen();
    drawFallen(now);
    for (const particle of particles) {
      advance(particle, now);
      if (particle.phase === "gone") continue;
      move(particle, dt, now);
      drawHangul(particle, now);
    }
    ctx.globalAlpha = 1;
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("click", onClick);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("click", onClick);
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener(
      "pointerleave",
      onPointerLeave,
    );
    document.documentElement.style.cursor = "";
    ctx.clearRect(0, 0, width, height);
  };
}
