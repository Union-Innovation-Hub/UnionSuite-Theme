/* Hub sign-in page: constellation background, a frosted-glass card with a
 * travelling neon rim, and styling for the native Sign In iPart.
 *
 * Loaded by the theme loader (index.js) only on pages with a
 * "SignIn-Container" zone; no page head content is needed. Its styles are in
 * zUnionSuite.css (US-SIGNIN); it adds only the web fonts. Mockup:
 * prototypes/wip/login-screen/v2/index.html.
 * The earlier pasted head script (v1, triangle field) is in Git history.
 *
 * Expected page structure (native iParts):
 *   One zone with CSS class "SignIn-Container", holding in order:
 *     - the logo CCO: a logo image, then an optional content item with CSS
 *       class "Tagline" (free text, per site)
 *     - the native Sign In iPart (renders .SignInPage)
 * Per site, change only the logo image and the Tagline text.
 *
 * Highlights use the theme's --accent, falling back to iMIS blue.
 *
 * Easter eggs (switches and words under Settings):
 *   - Gravity well: press and hold on the open background. Stars that come
 *     close are caught and follow the well; it grows as it catches more, with
 *     messages along the way. Catch every star for a supernova.
 *   - Shooting star: 1 in 5 visits, or after 45s idle, one crosses the open
 *     space beside the card. Clicking it opens a curiosity quote.
 * They never fire from the card or its controls, or while signing in, and are
 * off under reduced motion. Mockup: prototypes/wip/login-screen/eggs/.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  if (root.classList.contains("hub-signin")) {
    return;
  }

  // Classes go on <html> before the body parses, so the first paint is already
  // the new background with the card contents waiting to fade in.
  root.classList.add("hub-signin", "hub-signin-intro");

  /* ---------- Settings ---------- */

  // Platform credit: a linked logo in the page's bottom-left corner, with
  // CREDIT_NAME as its alt text. Set CREDIT_NAME to "" to hide it (e.g. on the
  // Hub's own site, where the logo already says it). The hover logo fades in
  // while the link is hovered or focused.
  var CREDIT_NAME = "Union Innovation Hub";
  var CREDIT_URL = "https://www.uhub.org.au";
  var CREDIT_LOGO = "https://cdn.uhub.org.au/Assets/UHUB_Logo_White.png";
  var CREDIT_LOGO_HOVER = "https://cdn.uhub.org.au/Assets/UHUB_Logo_WhiteText.png";

  // Easter eggs. Set either to false to switch it off.
  var EGGS = {
    gravity: true,
    shootingStar: true
  };

  // Every word the easter eggs show. Inserted as plain text.
  var EGG_MESSAGES = {
    // Each catch shows the next quote in turn (remembered between visits).
    shootingStar: {
      heading: "You caught a shooting star",
      quotes: [
        {
          text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.",
          cite: "Albert Einstein"
        },
        {
          text: "Research is formalized curiosity. It is poking and prying with a purpose.",
          cite: "Zora Neale Hurston"
        },
        {
          text: "Be less curious about people and more curious about ideas.",
          cite: "Marie Curie"
        },
        {
          text: "Curiosity will conquer fear even more than bravery will.",
          cite: "James Stephens"
        },
        {
          text: "Millions saw the apple fall, but Newton was the one who asked why.",
          cite: "Bernard Baruch"
        }
      ],
      button: "Close"
    },
    // Shown above the gravity well as the share of caught stars passes each
    // mark, once per browser session each. The counter shows from the mark
    // with showCount. A mark with no text shows nothing; 75% only starts the
    // counter (owner, 8 October 2026; it said "You can do it!").
    milestones: [
      { at: 0.2, text: "This is unexpected" },
      { at: 0.4, text: "I see you\u2019re determined" },
      { at: 0.75, text: "", showCount: true },
      { at: 0.9, text: "Almost there\u2026" },
      { at: 1, text: "Nailed it!" }
    ]
  };

  /* ---------- Fonts ---------- */

  function addLink(rel, href, crossOrigin) {
    var link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (crossOrigin) {
      link.crossOrigin = "anonymous";
    }
    document.head.appendChild(link);
  }

  addLink("preconnect", "https://fonts.googleapis.com");
  addLink("preconnect", "https://fonts.gstatic.com", true);
  addLink("stylesheet", "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Red+Hat+Display:wght@500;700&display=swap");

  /* ---------- Constellation and timing ---------- */

  var STAR_AREA = 11000;         // one star per this many square pixels
  var STAR_MIN = 50;
  var STAR_MAX = 140;
  var LINK_DISTANCE = 150;       // stars closer than this are joined
  var LINK_ALPHA = 0.3;          // link alpha at zero length
  var DRIFT = 20;                // pixels each star wanders from its home
  var POINTER_RADIUS = 220;      // the pointer joins and pulls stars within this
  var POINTER_PULL = 0.07;
  var INTRO_START = 0.1;         // seconds before the first star lights
  var INTRO_SPREAD = 1.5;        // seconds for the lighting to reach the corners
  var STAR_FADE = 0.6;           // seconds each star takes to light
  var LINK_DRAW = 0.8;           // seconds each link takes to draw across
  var PULSE_SPEED = 620;         // pixels per second
  var PULSE_LIFE = 1.8;          // seconds
  var SIGNAL_INTERVAL = 0.06;    // seconds between new sparks along links
  var SIGNAL_LIFE = 0.7;         // seconds a spark takes to cross its link
  var SPARK_BURST = 14;          // sparks already under way on the Sign In click
  var SPARK_GRACE_MS = 700;      // sparks keep coming this long after the click without a disabled button
  var IDLE_FRAME_MS = 32;        // ~30fps when only ambient motion is running
  var READY_WAIT_MS = 1200;      // longest wait for fonts and the logo image
  var CARD_GLOW_DISTANCE = 280;  // pointer highlight fades out this far away

  // Gravity well. It starts small and grows by a step for every 5% of stars
  // caught. Reach: free stars feel the pull within this. Catch: stars this
  // close are caught and follow the well from anywhere until release.
  var HOLD_MS = 280;             // press this long to open a well
  var HOLD_SLOP = 10;            // moving further than this first cancels it
  var GROW_EVERY = 0.05;
  var REACH_START = 150;
  var REACH_STEP = 9;            // px per step (330 with every star caught)
  var CATCH_START = 30;
  var CATCH_STEP = 5;            // px per step (130 with every star caught)
  var GROW_EASE = 1.5;           // how quickly it eases to its new size (per second)
  var WELL_PULL = 1600;          // px/s² at the reach's edge, rising inwards
  var CAUGHT_PULL = 2400;        // caught stars follow the well from anywhere
  var WELL_SWIRL = 0.75;         // sideways share of the pull, for orbits
  var CORE_SHARE = 0.55;         // stars are pushed back out inside this share of the catch
  var SPRING = 7;                // pull home on each star's offset
  var DAMPING = 2.6;
  var SCATTER = 640;             // px/s kick on release, at the well
  var MILESTONE_LIFE = 2.6;      // seconds a milestone message shows
  var COLLAPSE = 1.1;            // supernova: seconds to collapse
  var BURST_SPEED = 900;         // supernova: average outward px/s
  var FLASH = 0.9;               // supernova: seconds of flash

  // Shooting star.
  var SHOOT_CHANCE = 0.2;        // chance of one on page load
  var SHOOT_IDLE_MS = 45000;     // or after this long without input
  var SHOOT_LIFE = 1.7;          // seconds across the sky
  var SHOOT_GRACE = 0.35;        // catchable this long after it fades

  var MILESTONE_KEY = "hub-signin:milestones";
  var QUOTE_KEY = "hub-signin:quote";

  var CARD_SELECTOR = ".SignIn-Container";
  var LOGO_SELECTOR = ".SignIn-Container > .iMIS-WebPart:first-child img";
  var FIELD_SELECTOR = ".SignInPage .forgot-link-field input";
  var SUBMIT_SELECTOR = ".SignInPage .SignIn input[type='submit']";
  var MESSAGES_SELECTOR = "[id$='_UserMessagesUpdatePanel']";
  var ERROR_SELECTOR = MESSAGES_SELECTOR + " .AsiMessage li.AsiError";
  var ERROR_SHAKE_MS = 480;      // just past the CSS shake (420ms)
  var BACKGROUND_IGNORE = CARD_SELECTOR + ", a, button, input, select, textarea, dialog, .modal";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var failSafe = setTimeout(reveal, 6000);

  var canvas = null;
  var ctx = null;
  var starSprite = null;
  var accentSprite = null;
  var starRgb = [90, 203, 248];
  var accentRgb = [200, 220, 255];
  var catalogue = [];            // every possible star, in normalised positions
  var stars = [];                // the stars in use at this screen size
  var points = [];               // this frame's star positions and energy
  var links = [];                // this frame's drawn links, for signals
  var width = 0;
  var height = 0;
  var dpr = 1;
  var startTime = performance.now();
  var lastDraw = 0;
  var lastNow = 0;
  var frameId = 0;
  var pulses = [];
  var signals = [];
  var signalClock = 0;
  var sparkUntil = 0;
  var sparkBurst = 0;
  var centre = { x: 0, y: 0, reach: 1 };
  var busy = { target: 0, level: 0 };
  var pointer = { x: 0, y: 0, sx: 0, sy: 0, strength: 0, target: 0, touch: false };
  var press = null;              // a pointer press on the open background
  var well = null;               // the gravity well while held
  var supernova = null;          // every star caught: collapse, then burst
  var milestone = null;          // the milestone message showing
  var shooting = null;           // a shooting star crossing
  var idleTimer = 0;

  function reveal() {
    clearTimeout(failSafe);
    root.classList.remove("hub-signin-intro");
  }

  /* ---------- Colour ---------- */

  // Resolves any CSS colour (including var() chains and color-mix()) through
  // a hidden probe, returning [r, g, b] in 0-255.
  function resolveColour(value, fallback) {
    var probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = value;
    document.body.appendChild(probe);
    var computed = getComputedStyle(probe).color;
    probe.remove();

    var parts = (computed.match(/[\d.]+/g) || []).map(Number);
    if (parts.length < 3) {
      return fallback;
    }
    var scale = computed.indexOf("color(") === 0 ? 255 : 1;
    return parts.slice(0, 3).map(function (channel) {
      return Math.round(Math.min(255, channel * scale));
    });
  }

  // Button text follows the accent: dark on light accents, white on dark ones.
  function applyAccentContrast() {
    var rgb = resolveColour("var(--hub-signin-accent)", null);
    if (!rgb) {
      return;
    }
    var linear = rgb.map(function (channel) {
      var c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    root.style.setProperty("--hub-signin-on-accent", luminance > 0.4 ? "#001b23" : "#ffffff");
  }

  // A soft round glow, drawn once and stamped for halos and signals. Tight
  // sprites keep a bright core and fall off quickly, for the sparks.
  function makeSprite(rgb, tight) {
    var size = 64;
    var sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    var g = sprite.getContext("2d");
    var gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    var colour = rgb.join(",");
    gradient.addColorStop(0, "rgba(" + colour + ",1)");
    if (tight) {
      gradient.addColorStop(0.15, "rgba(" + colour + ",0.8)");
      gradient.addColorStop(0.4, "rgba(" + colour + ",0.12)");
    } else {
      gradient.addColorStop(0.25, "rgba(" + colour + ",0.45)");
    }
    gradient.addColorStop(1, "rgba(" + colour + ",0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    return sprite;
  }

  /* ---------- Card ---------- */

  function addCardExtras() {
    var card = document.querySelector(CARD_SELECTOR);
    if (card && card.parentElement && !card.parentElement.querySelector(".hub-signin-neon")) {
      var neon = document.createElement("div");
      neon.className = "hub-signin-neon";
      neon.setAttribute("aria-hidden", "true");
      card.parentElement.appendChild(neon);
    }

    var stage = document.querySelector(".EmptyMasterContentPanel");
    if (CREDIT_NAME && stage && !stage.querySelector(".hub-signin-credit")) {
      var credit = document.createElement("div");
      var link = document.createElement("a");
      var logo = document.createElement("img");
      var logoHover = document.createElement("img");

      credit.className = "hub-signin-credit";
      link.className = "hub-signin-credit-link";
      link.href = CREDIT_URL;
      link.target = "_blank";
      link.rel = "noopener";

      logo.className = "hub-signin-credit-logo";
      logo.src = CREDIT_LOGO;
      logo.alt = CREDIT_NAME;

      // Decorative duplicate: the default logo already carries the alt text.
      logoHover.className = "hub-signin-credit-logo-hover";
      logoHover.src = CREDIT_LOGO_HOVER;
      logoHover.alt = "";

      link.appendChild(logo);
      link.appendChild(logoHover);
      credit.appendChild(link);
      stage.appendChild(credit);
    }

    placeMessages();
  }

  // iMIS shows sign-in messages in its user messages panel above the card.
  // The panel itself moves into the card, between the divider and the
  // Username field, where people are looking when they retry (owner,
  // 8 October 2026). PageRequestManager finds the panel by its ID, so
  // partial updates still fill it here. If the Sign In iPart is missing it
  // stays where it was.
  function placeMessages() {
    var panel = document.querySelector(MESSAGES_SELECTOR);
    var signInPage = document.querySelector(CARD_SELECTOR + " .SignInPage");
    var signInPart = signInPage && signInPage.closest(".iMIS-WebPart");
    if (panel && signInPart && panel.parentElement !== signInPart) {
      signInPart.insertBefore(panel, signInPart.firstChild);
    }
  }

  // The rim and surface nearest the pointer light up.
  function updateCardGlow(event) {
    var card = document.querySelector(CARD_SELECTOR);
    if (!card) {
      return;
    }
    var box = card.getBoundingClientRect();
    var x = event.clientX;
    var y = event.clientY;
    var dx = Math.max(box.left - x, 0, x - box.right);
    var dy = Math.max(box.top - y, 0, y - box.bottom);
    var glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / CARD_GLOW_DISTANCE);

    card.style.setProperty("--pointer-x", Math.round(x - box.left) + "px");
    card.style.setProperty("--pointer-y", Math.round(y - box.top) + "px");
    card.style.setProperty("--pointer-glow", glow.toFixed(3));
  }

  // The intro lights outwards from the card, and sparks travel towards it.
  function measureCentre() {
    var card = document.querySelector(CARD_SELECTOR);
    var box = card ? card.getBoundingClientRect() : null;
    centre.x = box && box.width ? box.left + box.width / 2 : width / 2;
    centre.y = box && box.height ? box.top + box.height / 2 : height / 2;
    centre.reach = Math.max(
      Math.hypot(centre.x, centre.y),
      Math.hypot(width - centre.x, centre.y),
      Math.hypot(centre.x, height - centre.y),
      Math.hypot(width - centre.x, height - centre.y)
    );
  }

  /* ---------- Constellation ---------- */

  // Seeded, so the same stars come back after a resize or reload.
  function seededRandom(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function smoothstep(edge0, edge1, x) {
    var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function buildCatalogue() {
    var random = seededRandom(812);
    catalogue = [];
    for (var i = 0; i < STAR_MAX; i++) {
      catalogue.push({
        nx: random(),
        ny: random(),
        radius: random() * 1.5 + 0.6,
        phase: random() * Math.PI * 2,
        speed: random() * 0.5 + 0.25,
        jitter: random()
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    measureCentre();

    var count = Math.round(Math.min(STAR_MAX, Math.max(STAR_MIN, width * height / STAR_AREA)));
    stars = catalogue.slice(0, count).map(function (star) {
      var x = star.nx * width;
      var y = star.ny * height;
      var distance = Math.hypot(x - centre.x, y - centre.y) / centre.reach;
      return {
        x: x,
        y: y,
        radius: star.radius,
        phase: star.phase,
        speed: star.speed,
        delay: INTRO_START + distance * INTRO_SPREAD + star.jitter * 0.25,
        // Offset from home, moved by the gravity well and sprung back.
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        caught: false
      };
    });

    draw(performance.now(), true);
  }

  function motionAllowed() {
    return !reduceMotion.matches;
  }

  function pulseEnergy(x, y, now) {
    var energy = 0;
    for (var i = 0; i < pulses.length; i++) {
      var pulse = pulses[i];
      var age = Math.max(0, (now - pulse.start) / 1000);
      var ring = Math.hypot(x - pulse.x, y - pulse.y) - age * PULSE_SPEED;
      energy += pulse.amp * Math.exp(-(ring * ring) / 3600) * (1 - age / PULSE_LIFE);
    }
    return energy;
  }

  // A brief flare as a star lights, given the seconds since it started.
  function flareAt(since) {
    var span = STAR_FADE * 1.6;
    return since > 0 && since < span ? Math.sin(Math.PI * since / span) : 0;
  }

  function draw(now, force) {
    var animate = motionAllowed();
    var dt = Math.min(0.1, Math.max(0, (now - (lastNow || now)) / 1000));
    lastNow = now;

    // Static frames show the finished constellation.
    var t = animate ? (now - startTime) / 1000 : 1000;
    var introRunning = animate && t < INTRO_START + INTRO_SPREAD + 0.25 + STAR_FADE + LINK_DRAW;

    pointer.sx += (pointer.x - pointer.sx) * 0.12;
    pointer.sy += (pointer.y - pointer.sy) * 0.12;
    pointer.strength += (pointer.target - pointer.strength) * 0.06;

    busy.level += (busy.target - busy.level) * (busy.target ? 0.04 : 0.05);

    updateEggs(dt, now, animate);

    pulses = pulses.filter(function (pulse) {
      return (now - pulse.start) / 1000 < PULSE_LIFE;
    });
    signals = signals.filter(function (signal) {
      return (now - signal.start) / 1000 < SIGNAL_LIFE;
    });

    var active = introRunning ||
      pulses.length > 0 ||
      signals.length > 0 ||
      busy.level > 0.005 ||
      eggsActive() ||
      Math.abs(pointer.target - pointer.strength) > 0.01 ||
      Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.5;

    if (!force && !active && now - lastDraw < IDLE_FRAME_MS) {
      return;
    }
    lastDraw = now;

    var pointerOn = animate && pointer.strength > 0.005 && !well && !supernova;
    var collapse = collapseLevel(now);
    var i;

    // Positions, brightness and energy for this frame.
    points = [];
    for (i = 0; i < stars.length; i++) {
      var star = stars[i];
      var x = star.x;
      var y = star.y;
      var lit = 1;
      var flare = 0;
      var energy = 0;
      var since = 1000;

      if (animate) {
        x += Math.sin(t * star.speed * 0.22 + star.phase) * DRIFT;
        y += Math.cos(t * star.speed * 0.18 + star.phase) * DRIFT;

        if (pointerOn) {
          var near = Math.max(0, 1 - Math.hypot(x - pointer.sx, y - pointer.sy) / POINTER_RADIUS);
          // Eased off while signing in: the pointer is on the button then, and
          // stars leaning into it would read as a pull towards the card.
          var attraction = near * POINTER_PULL * pointer.strength * (1 - busy.level);
          x += (pointer.sx - x) * attraction;
          y += (pointer.sy - y) * attraction;
        }

        x += star.ox;
        y += star.oy;

        since = t - star.delay;
        lit = smoothstep(0, STAR_FADE, since);
        flare = flareAt(since);
        energy = pulseEnergy(x, y, now);
      }

      if (collapse > 0) {
        x += (supernova.x - x) * collapse;
        y += (supernova.y - y) * collapse;
      }

      var proximity = pointerOn
        ? Math.max(0, 1 - Math.hypot(x - pointer.sx, y - pointer.sy) / POINTER_RADIUS) * pointer.strength
        : 0;

      points.push({
        x: x,
        y: y,
        radius: star.radius,
        since: since,
        lit: lit,
        caught: star.caught,
        flare: flare + collapse * 0.8,
        energy: energy,
        proximity: proximity,
        twinkle: animate ? 0.85 + 0.15 * Math.sin(t * star.speed * 2 + star.phase) : 1
      });
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.8;

    var starColour = starRgb.join(",");
    var accentColour = accentRgb.join(",");

    // Links draw across from the star that lit first.
    links = [];
    for (i = 0; i < points.length; i++) {
      var a = points[i];
      if (a.lit <= 0) {
        continue;
      }
      for (var j = i + 1; j < points.length; j++) {
        var b = points[j];
        if (b.lit <= 0) {
          continue;
        }
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        if (Math.abs(dx) > LINK_DISTANCE || Math.abs(dy) > LINK_DISTANCE) {
          continue;
        }
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > LINK_DISTANCE) {
          continue;
        }

        // A link draws once the later of its two stars has lit.
        var progress = animate
          ? smoothstep(0, LINK_DRAW, Math.min(a.since, b.since) - STAR_FADE * 0.4)
          : 1;
        if (progress <= 0.001) {
          continue;
        }

        var boost = Math.min(1.5, (a.energy + b.energy) * 0.9 + (a.proximity + b.proximity) * 0.6);
        var alpha = (1 - distance / LINK_DISTANCE) * LINK_ALPHA * (1 + boost) * Math.min(a.lit, b.lit) * (1 - collapse);
        var from = a.since >= b.since ? a : b;
        var to = from === a ? b : a;

        // Stars caught by the gravity well link in the accent colour.
        ctx.strokeStyle = "rgba(" + (a.caught && b.caught ? accentColour : starColour) + "," + Math.min(0.9, alpha).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
        ctx.stroke();

        if (progress >= 0.99) {
          links.push(i, j);
        }
      }

      // Nearby stars reach out to the pointer.
      if (a.proximity > 0) {
        ctx.strokeStyle = "rgba(" + accentColour + "," + (a.proximity * 0.45 * a.lit).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.sx, pointer.sy);
        ctx.stroke();
      }
    }

    // Stars, with a halo on bright ones and as each lights.
    for (i = 0; i < points.length; i++) {
      var point = points[i];
      if (point.lit <= 0) {
        continue;
      }
      var glow = Math.min(1.2, point.energy + point.flare * 0.8 + point.proximity * 0.5 + (point.caught ? 0.35 : 0));
      var radius = point.radius * (0.6 + 0.4 * point.lit) + point.proximity + glow * 1.6;

      if (point.radius > 1.7 || glow > 0.05) {
        var halo = 10 + point.radius * 4 + glow * 18;
        ctx.globalAlpha = Math.min(1, (0.12 + glow * 0.35) * point.lit);
        ctx.drawImage(point.caught ? accentSprite : starSprite, point.x - halo, point.y - halo, halo * 2, halo * 2);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "rgba(191,236,252," + Math.min(1, (0.4 + glow * 0.6 + point.proximity * 0.4) * point.lit * point.twinkle).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Signing in: sparks run along links towards the card. They start on the
    // Sign In click with a burst already under way, and carry on while the
    // native code has the button disabled.
    var sparking = busy.target || now < sparkUntil;
    if (animate && sparking && links.length) {
      signalClock += dt;
      while (sparkBurst > 0) {
        sparkBurst--;
        addSignal(now - Math.random() * SIGNAL_LIFE * 600);
      }
      while (signalClock > SIGNAL_INTERVAL) {
        signalClock -= SIGNAL_INTERVAL;
        addSignal(now);
      }
    } else {
      sparkBurst = 0;
    }

    for (i = 0; i < signals.length; i++) {
      var signal = signals[i];
      var start = points[signal.from];
      var end = points[signal.to];
      if (!start || !end) {
        continue;
      }
      // A spark can be added after this frame's timestamp, so clamp at 0.
      var s = Math.max(0, (now - signal.start) / 1000 / SIGNAL_LIFE);
      var eased = s * s * (3 - 2 * s);
      var sx = start.x + (end.x - start.x) * eased;
      var sy = start.y + (end.y - start.y) * eased;
      ctx.globalAlpha = Math.sin(Math.PI * s) * 0.9;
      ctx.drawImage(accentSprite, sx - 7, sy - 7, 14, 14);

      // A small white-hot core.
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawWell(collapse);
    drawMilestone(now);
    drawSupernovaFlash(now);
    drawShootingStar(now);

    // Faint rings show where each pulse is.
    for (i = 0; i < pulses.length; i++) {
      var pulse = pulses[i];
      // A pulse added on a click can be newer than this frame's timestamp, and
      // a negative radius makes arc() throw and stop the animation.
      var age = Math.max(0, (now - pulse.start) / 1000);
      ctx.strokeStyle = "rgba(" + accentColour + "," + (Math.max(0, 1 - age / PULSE_LIFE) * 0.18 * pulse.amp).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, age * PULSE_SPEED, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // A spark on a random drawn link, travelling from the end further from the
  // card to the nearer end.
  function addSignal(start) {
    var pick = Math.floor(Math.random() * links.length / 2) * 2;
    var first = links[pick];
    var second = links[pick + 1];
    var firstCloser = Math.hypot(points[first].x - centre.x, points[first].y - centre.y) <
      Math.hypot(points[second].x - centre.x, points[second].y - centre.y);
    signals.push({
      from: firstCloser ? second : first,
      to: firstCloser ? first : second,
      start: start
    });
  }

  // Called on the Sign In click (or Enter in a field). If validation stops the
  // request, the button is never disabled and the sparks die out after this.
  function startSparks() {
    sparkUntil = performance.now() + SPARK_GRACE_MS;
    sparkBurst = SPARK_BURST;
    measureCentre();
  }

  // The next frame is booked first, so one bad frame can't stop the animation.
  function loop(now) {
    frameId = requestAnimationFrame(loop);
    draw(now, false);
  }

  function startLoop() {
    cancelAnimationFrame(frameId);
    lastNow = 0;
    if (motionAllowed() && !document.hidden) {
      frameId = requestAnimationFrame(loop);
    } else {
      draw(performance.now(), true);
    }
  }

  /* ---------- Easter eggs ---------- */

  function eggRgba(rgb, alpha) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + Math.max(0, Math.min(1, alpha)).toFixed(3) + ")";
  }

  function onBackground(event) {
    return Boolean(event.target.closest) && !event.target.closest(BACKGROUND_IGNORE);
  }

  // Called once per frame from draw().
  function updateEggs(dt, now, animate) {
    if (well && !supernova) {
      well.x += (pointer.x - well.x) * 0.25;
      well.y += (pointer.y - well.y) * 0.25;
      well.level = Math.min(1, well.level + dt * 2.5);
      growWell(dt, now);
      if (stars.length && caughtCount() === stars.length) {
        supernova = { x: well.x, y: well.y, start: now, burst: false };
      }
    }
    if (supernova && !supernova.burst && (now - supernova.start) / 1000 >= COLLAPSE) {
      burstSupernova(now);
    }
    if (supernova && supernova.burst && (now - supernova.burstAt) / 1000 > FLASH + 2) {
      supernova = null;
    }
    if (animate) {
      stepPhysics(dt);
    }
  }

  // Keeps the canvas at full frame rate while anything egg-related moves.
  function eggsActive() {
    return Boolean(well || supernova || shooting || milestone) || !physicsSettled();
  }

  /* Gravity well */

  // Each star carries an offset from its drifting home, pulled back by a
  // spring. Within the well's reach a star is pulled in with a sideways
  // swirl, so it orbits rather than piles up; once it comes within the catch
  // radius it is caught and follows the well anywhere until release.
  function stepPhysics(dt) {
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var ax = 0;
      var ay = 0;

      if (well && !supernova) {
        var dx = well.x - (star.x + star.ox);
        var dy = well.y - (star.y + star.oy);
        var d = Math.hypot(dx, dy) + 0.01;
        if (d < well.catchRadius) {
          star.caught = true;
        }
        var strength = 0;
        if (star.caught) {
          strength = CAUGHT_PULL * Math.min(1, 0.35 + d / well.reach) * well.level;
        } else if (d < well.reach) {
          strength = WELL_PULL * (1 - d / well.reach) * well.level;
        }
        if (strength) {
          var nx = dx / d;
          var ny = dy / d;
          var core = well.catchRadius * CORE_SHARE;
          if (d < core) {
            strength *= -1.4 * (1 - d / core);
          }
          ax += nx * strength - ny * strength * WELL_SWIRL;
          ay += ny * strength + nx * strength * WELL_SWIRL;
        }
      }

      var spring = star.caught ? 0 : SPRING;
      ax += -spring * star.ox - DAMPING * star.vx;
      ay += -spring * star.oy - DAMPING * star.vy;

      star.vx += ax * dt;
      star.vy += ay * dt;
      star.ox += star.vx * dt;
      star.oy += star.vy * dt;
    }
  }

  function physicsSettled() {
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      if (Math.abs(star.vx) + Math.abs(star.vy) > 2 || Math.abs(star.ox) + Math.abs(star.oy) > 0.5) {
        return false;
      }
    }
    return true;
  }

  function caughtCount() {
    var count = 0;
    for (var i = 0; i < stars.length; i++) {
      if (stars[i].caught) {
        count++;
      }
    }
    return count;
  }

  // The well's size for a share of stars caught: one step per 5%.
  function wellSizeFor(share) {
    var steps = Math.floor(share / GROW_EVERY + 1e-9);
    return {
      reach: REACH_START + steps * REACH_STEP,
      catchRadius: CATCH_START + steps * CATCH_STEP,
      steps: steps
    };
  }

  // Eases the well towards its size for the stars caught so far, with a
  // small pulse each time it steps up, and checks the milestone messages.
  function growWell(dt, now) {
    var share = stars.length ? caughtCount() / stars.length : 0;
    var size = wellSizeFor(share);
    var ease = 1 - Math.exp(-GROW_EASE * dt);
    well.reach += (size.reach - well.reach) * ease;
    well.catchRadius += (size.catchRadius - well.catchRadius) * ease;
    if (size.steps > well.steps) {
      well.steps = size.steps;
      addPulse(well.x, well.y, 0.3);
    }
    well.share = share;
    checkMilestones(share, now);
  }

  function openWell(x, y) {
    if (!EGGS.gravity || !motionAllowed() || busy.target || supernova) {
      return;
    }
    well = {
      x: x,
      y: y,
      level: 0,
      reach: REACH_START,
      catchRadius: CATCH_START,
      steps: 0,
      share: 0,
      counting: false
    };
    root.classList.add("hub-signin-holding");
    var selection = window.getSelection && window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    addPulse(x, y, 0.4);
  }

  function releaseWell() {
    if (!well || supernova) {
      return;
    }
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var dx = star.x + star.ox - well.x;
      var dy = star.y + star.oy - well.y;
      var d = Math.hypot(dx, dy) + 0.01;
      var reach = well.reach * 1.2;
      if (star.caught || d < reach) {
        var kick = SCATTER * Math.max(0.35, 1 - d / reach);
        star.vx += dx / d * kick;
        star.vy += dy / d * kick;
      }
      star.caught = false;
    }
    addPulse(well.x, well.y, 0.9);
    well = null;
    root.classList.remove("hub-signin-holding");
  }

  /* Milestone messages */

  var seenMilestones = readSeenMilestones();

  function readSeenMilestones() {
    try {
      return JSON.parse(sessionStorage.getItem(MILESTONE_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function rememberMilestone(at) {
    seenMilestones.push(at);
    try {
      sessionStorage.setItem(MILESTONE_KEY, JSON.stringify(seenMilestones));
    } catch (error) {
      // No storage (private mode): each shows once per page instead.
    }
  }

  // When a hold passes a mark for the first time this session, its message
  // shows. If one frame passes several (a fast sweep), only the highest
  // shows; the rest count as seen. The counter turns on at its mark every
  // hold, whether or not the message has been seen.
  function checkMilestones(share, now) {
    var newest = null;
    EGG_MESSAGES.milestones.forEach(function (mark) {
      if (share + 1e-9 < mark.at) {
        return;
      }
      if (mark.showCount) {
        well.counting = true;
      }
      if (seenMilestones.indexOf(mark.at) === -1) {
        rememberMilestone(mark.at);
        newest = mark;
      }
    });
    if (newest && newest.text) {
      milestone = { text: newest.text, start: now };
      announce(newest.text);
    }
  }

  // Milestones are drawn on the canvas; this repeats them for screen readers.
  var announcer = null;

  function announce(text) {
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.className = "hub-signin-announcer";
      announcer.setAttribute("role", "status");
      document.body.appendChild(announcer);
    }
    announcer.textContent = text;
  }

  /* Supernova (every star caught) */

  // The caught stars collapse into one point under "Nailed it!", then burst
  // back out to their homes with a flash.
  function burstSupernova(now) {
    supernova.burst = true;
    supernova.burstAt = now;
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var angle = Math.random() * Math.PI * 2;
      var speed = BURST_SPEED * (0.5 + Math.random());
      star.ox = supernova.x - star.x;
      star.oy = supernova.y - star.y;
      star.vx = Math.cos(angle) * speed;
      star.vy = Math.sin(angle) * speed;
      star.caught = false;
    }
    pulses.push({ x: supernova.x, y: supernova.y, amp: 2, start: now });
    pulses.push({ x: supernova.x, y: supernova.y, amp: 1.2, start: now + 250 });
    well = null;
    root.classList.remove("hub-signin-holding");
  }

  // 0 → 1 while collapsing; the stars are drawn pulled into the core by this.
  function collapseLevel(now) {
    if (!supernova || supernova.burst) {
      return 0;
    }
    return smoothstep(0, COLLAPSE, (now - supernova.start) / 1000);
  }

  /* Shooting star */

  // The largest open area beside the card (left, right or above), so the
  // shooting star never crosses behind the card, where it can't be clicked.
  function openRegion() {
    var card = document.querySelector(CARD_SELECTOR);
    var box = card ? card.getBoundingClientRect() : null;
    var margin = 32;
    if (!box || !box.width) {
      return { x: margin, y: margin, w: width - margin * 2, h: height - margin * 2 };
    }
    var options = [
      { x: margin, y: margin, w: box.left - margin * 2, h: height - margin * 2 },
      { x: box.right + margin, y: margin, w: width - box.right - margin * 2, h: height - margin * 2 },
      { x: margin, y: margin, w: width - margin * 2, h: box.top - margin * 2 }
    ];
    var best = options[0];
    options.forEach(function (option) {
      if (Math.max(0, option.w) * Math.max(0, option.h) > Math.max(0, best.w) * Math.max(0, best.h)) {
        best = option;
      }
    });
    if (best.w < 160 || best.h < 90) {
      return { x: margin, y: margin, w: width - margin * 2, h: Math.max(120, box.top - margin * 2) };
    }
    return best;
  }

  function launchShootingStar() {
    if (!EGGS.shootingStar || !motionAllowed() || shooting || busy.target || document.hidden) {
      return;
    }
    // Starts high on one side of the open space and falls across it.
    var region = openRegion();
    var fromLeft = Math.random() < 0.5;
    var direction = fromLeft ? 1 : -1;
    var angle = 0.38 + Math.random() * 0.2;    // radians below horizontal
    var distance = Math.min(region.w * 0.7, 640);
    shooting = {
      x: region.x + region.w * (fromLeft ? 0.08 + Math.random() * 0.12 : 0.8 + Math.random() * 0.12),
      y: region.y + region.h * (0.08 + Math.random() * 0.2),
      dx: direction * Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      start: performance.now()
    };
  }

  function shootingHead(now) {
    if (!shooting) {
      return null;
    }
    var s = (now - shooting.start) / 1000 / SHOOT_LIFE;
    if (s > 1 + SHOOT_GRACE / SHOOT_LIFE) {
      shooting = null;
      return null;
    }
    var eased = 1 - Math.pow(1 - Math.min(1, s), 2);
    return {
      x: shooting.x + shooting.dx * eased,
      y: shooting.y + shooting.dy * eased,
      alpha: s < 1 ? Math.sin(Math.PI * Math.min(1, s * 1.15)) : 0
    };
  }

  // Returns true when the click caught it.
  function catchShootingStar(x, y) {
    var head = shootingHead(performance.now());
    if (!head || Math.hypot(head.x - x, head.y - y) > (pointer.touch ? 48 : 36)) {
      return false;
    }
    addPulse(head.x, head.y, 1);
    shooting = null;
    openShootingStarDialog();
    return true;
  }

  function armIdleShootingStar() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      launchShootingStar();
      armIdleShootingStar();
    }, SHOOT_IDLE_MS);
  }

  function startShootingStars() {
    armIdleShootingStar();
    if (Math.random() < SHOOT_CHANCE) {
      setTimeout(launchShootingStar, 6000 + Math.random() * 8000);
    }
  }

  var quoteIndex = -1;

  // The next quote in turn. The position is remembered between visits, so
  // each catch shows a different one; without storage it cycles per page.
  function nextQuote(quotes) {
    if (!quotes || !quotes.length) {
      return null;
    }
    if (quoteIndex < 0) {
      try {
        quoteIndex = parseInt(localStorage.getItem(QUOTE_KEY), 10);
      } catch (error) {
        quoteIndex = NaN;
      }
      if (isNaN(quoteIndex)) {
        quoteIndex = -1;
      }
    }
    quoteIndex = (quoteIndex + 1) % quotes.length;
    try {
      localStorage.setItem(QUOTE_KEY, String(quoteIndex));
    } catch (error) {
      // Nothing to remember it in.
    }
    return quotes[quoteIndex];
  }

  var dialog = null;

  // Built from EGG_MESSAGES with textContent, so the words can be edited
  // freely. The dialog sits outside the page's form, so closing it never
  // posts back.
  function openShootingStarDialog() {
    var words = EGG_MESSAGES.shootingStar;
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "hub-signin-dialog";
      document.body.appendChild(dialog);
    }
    dialog.textContent = "";

    var form = document.createElement("form");
    form.method = "dialog";

    if (words.heading) {
      var heading = document.createElement("h2");
      heading.className = "hub-signin-dialog__heading";
      heading.id = "hub-signin-dialog-heading";
      heading.textContent = words.heading;
      form.appendChild(heading);
      dialog.setAttribute("aria-labelledby", heading.id);
    }

    var chosen = nextQuote(words.quotes);
    if (chosen && chosen.text) {
      var quote = document.createElement("blockquote");
      quote.className = "hub-signin-dialog__quote";
      var line = document.createElement("p");
      line.textContent = "“" + chosen.text + "”";
      quote.appendChild(line);
      if (chosen.cite) {
        var cite = document.createElement("footer");
        cite.textContent = chosen.cite;
        quote.appendChild(cite);
      }
      form.appendChild(quote);
    }

    var close = document.createElement("button");
    close.type = "submit";
    close.className = "hub-signin-dialog__close";
    close.textContent = words.button || "Close";
    form.appendChild(close);

    dialog.appendChild(form);
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  /* Egg drawing */

  // Where the well's text sits: above its catch radius, or above the
  // collapsing supernova.
  function wellAnchor() {
    if (supernova && !supernova.burst) {
      return { x: supernova.x, y: supernova.y - 60 };
    }
    if (well) {
      return { x: well.x, y: well.y - well.catchRadius - 14 };
    }
    return null;
  }

  // The glow grows with the catch radius, so the growth is visible. From the
  // counter's mark, the count shows above the well.
  function drawWell(collapse) {
    var at = supernova && !supernova.burst ? supernova : well;
    if (!at) {
      return;
    }
    var level = well ? well.level : 1;
    var catchRadius = well ? well.catchRadius : CATCH_START;
    var share = well ? well.share : 1;
    var size = catchRadius * 1.6 + collapse * 120;
    ctx.globalAlpha = Math.min(1, (0.45 + share * 0.35 + collapse * 0.5) * level);
    ctx.drawImage(accentSprite, at.x - size / 2, at.y - size / 2, size, size);
    ctx.globalAlpha = 1;

    if (well && !supernova && well.counting) {
      var anchor = wellAnchor();
      ctx.font = "600 12px 'Open Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(caughtCount() + " / " + stars.length, anchor.x, anchor.y);
    }
  }

  // A milestone message fades in above the well, holds, then fades, staying
  // with the well as it moves (and above the supernova at 100%).
  function drawMilestone(now) {
    if (!milestone) {
      return;
    }
    var s = (now - milestone.start) / 1000;
    if (s > MILESTONE_LIFE) {
      milestone = null;
      return;
    }
    var anchor = wellAnchor();
    if (anchor) {
      milestone.x = anchor.x;
      milestone.y = anchor.y;
    }
    if (milestone.x === undefined) {
      return;
    }
    var alpha = smoothstep(0, 0.25, s) * (1 - smoothstep(MILESTONE_LIFE - 0.6, MILESTONE_LIFE, s));
    var rise = (1 - smoothstep(0, 0.4, s)) * 6;
    var y = milestone.y - (well && well.counting && !supernova ? 20 : 0) - rise;

    ctx.save();
    ctx.font = "700 16px 'Red Hat Display', 'Open Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = eggRgba(accentRgb, 0.9 * alpha);
    ctx.shadowBlur = 12;
    ctx.fillStyle = eggRgba([255, 255, 255], alpha);
    ctx.fillText(milestone.text, milestone.x, y);
    ctx.restore();
  }

  function drawSupernovaFlash(now) {
    if (!supernova || !supernova.burst) {
      return;
    }
    var s = (now - supernova.burstAt) / 1000;
    if (s > FLASH) {
      return;
    }
    var level = 1 - s / FLASH;
    var radius = 40 + s * 900;
    var flash = ctx.createRadialGradient(supernova.x, supernova.y, 0, supernova.x, supernova.y, radius);
    flash.addColorStop(0, "rgba(255,255,255," + (0.9 * level).toFixed(3) + ")");
    flash.addColorStop(0.3, eggRgba(accentRgb, 0.45 * level));
    flash.addColorStop(1, eggRgba(accentRgb, 0));
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(supernova.x, supernova.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShootingStar(now) {
    var head = shootingHead(now);
    if (!head || head.alpha <= 0) {
      return;
    }
    var length = Math.hypot(shooting.dx, shooting.dy);
    var tx = head.x - shooting.dx / length * 130;
    var ty = head.y - shooting.dy / length * 130;
    var trail = ctx.createLinearGradient(head.x, head.y, tx, ty);
    trail.addColorStop(0, "rgba(255,255,255," + (0.9 * head.alpha).toFixed(3) + ")");
    trail.addColorStop(0.3, eggRgba(accentRgb, 0.4 * head.alpha));
    trail.addColorStop(1, eggRgba(accentRgb, 0));
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = head.alpha;
    ctx.drawImage(accentSprite, head.x - 14, head.y - 14, 28, 28);
    ctx.globalAlpha = 1;
  }

  // For the eggs mockup's "Show me" controls.
  var eggControls = {
    gravity: function () {
      var region = openRegion();
      pointer.x = region.x + region.w / 2;
      pointer.y = region.y + region.h / 2;
      openWell(pointer.x, pointer.y);
      setTimeout(releaseWell, 2400);
    },
    // Opens a well and catches every star at once, to show the supernova.
    supernova: function () {
      var region = openRegion();
      pointer.x = region.x + region.w / 2;
      pointer.y = region.y + region.h / 2;
      openWell(pointer.x, pointer.y);
      if (well) {
        well.level = 1;
        stars.forEach(function (star) {
          star.caught = true;
        });
      }
    },
    shootingStar: function () {
      shooting = null;
      launchShootingStar();
    },
    // Milestone messages show once per session; this lets them show again.
    resetMessages: function () {
      seenMilestones = [];
      try {
        sessionStorage.removeItem(MILESTONE_KEY);
      } catch (error) {
        // Nothing stored.
      }
    },
    state: function () {
      return {
        well: Boolean(well),
        caught: caughtCount(),
        stars: stars.length,
        supernova: supernova ? (supernova.burst ? "burst" : "collapsing") : null,
        milestone: milestone && milestone.text,
        shootingStar: shootingHead(performance.now())
      };
    }
  };

  /* ---------- Interaction ---------- */

  function addPulse(x, y, amp) {
    if (motionAllowed()) {
      pulses.push({ x: x, y: y, amp: amp, start: performance.now() });
    }
  }

  function addPulseFrom(element, amp) {
    if (element) {
      var box = element.getBoundingClientRect();
      addPulse(box.left + box.width / 2, box.top + box.height / 2, amp);
    }
  }

  // The native Sign In code disables the button while it signs in (the theme's
  // busy ring watches the same state). Credentials are never read.
  function setBusy(on) {
    if (on === (busy.target === 1)) {
      return;
    }
    busy.target = on ? 1 : 0;
    root.classList.toggle("hub-signin-busy", on);
    if (on) {
      measureCentre();
    } else {
      // Released (failed sign-in, MFA): the sparks stop at once and a ring
      // goes out from the card.
      signals = [];
      sparkUntil = 0;
      sparkBurst = 0;
      addPulse(centre.x, centre.y, 0.8);
    }
  }

  function watchBusy() {
    new MutationObserver(function () {
      var button = document.querySelector(SUBMIT_SELECTOR);
      setBusy(Boolean(button && button.disabled));
    }).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"]
    });

    // Back/forward cache restores the page as it was left.
    window.addEventListener("pageshow", function () {
      setBusy(false);
    });
  }

  // A failed sign-in puts an error in the user messages panel by partial
  // update. Each new error turns both fields coral and shakes them once
  // (owner, 8 October 2026); typing in either field clears it. An error
  // already there when the page loads marks the fields without a shake.
  function watchErrors() {
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    var shakeTimer = 0;

    function fields() {
      return document.querySelectorAll(FIELD_SELECTOR);
    }

    function markFields(on) {
      root.classList.toggle("hub-signin-error", on);
      fields().forEach(function (input) {
        if (on) {
          input.setAttribute("aria-invalid", "true");
        } else {
          input.removeAttribute("aria-invalid");
        }
      });
    }

    function shake() {
      clearTimeout(shakeTimer);
      root.classList.remove("hub-signin-error-shake");
      // Restart the animation when errors arrive back to back.
      void root.offsetWidth;
      root.classList.add("hub-signin-error-shake");
      shakeTimer = setTimeout(function () {
        root.classList.remove("hub-signin-error-shake");
      }, ERROR_SHAKE_MS);
    }

    function check(animate) {
      var errors = document.querySelectorAll(ERROR_SELECTOR);
      var fresh = false;
      errors.forEach(function (error) {
        if (seen && !seen.has(error)) {
          seen.add(error);
          fresh = true;
        }
      });
      if (fresh || (!seen && errors.length)) {
        markFields(true);
        if (animate && motionAllowed()) {
          shake();
        }
      }
    }

    check(false);
    new MutationObserver(function () {
      check(true);
    }).observe(document.body, { subtree: true, childList: true });

    // Delegated, so the Sign In iPart can re-render in a partial postback.
    document.addEventListener("input", function (event) {
      if (root.classList.contains("hub-signin-error") &&
          event.target.matches && event.target.matches(FIELD_SELECTOR)) {
        markFields(false);
      }
    });
  }

  function bindInteraction() {
    var glowFrame = 0;
    var lastEvent = null;

    window.addEventListener("pointermove", function (event) {
      if (pointer.target === 0) {
        pointer.sx = event.clientX;
        pointer.sy = event.clientY;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.touch = event.pointerType !== "mouse";
      pointer.target = pointer.touch ? 0.7 : 1;
      armIdleShootingStar();

      if (press && !well && Math.hypot(event.clientX - press.x, event.clientY - press.y) > HOLD_SLOP) {
        clearTimeout(press.timer);
        press.moved = true;
      }

      lastEvent = event;
      if (!glowFrame) {
        glowFrame = requestAnimationFrame(function () {
          glowFrame = 0;
          updateCardGlow(lastEvent);
        });
      }
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      pointer.target = 0;
      var card = document.querySelector(CARD_SELECTOR);
      if (card) {
        card.style.setProperty("--pointer-glow", "0");
      }
    });

    // A press on the open background: a quick click catches the shooting
    // star or sends a pulse through the stars; holding opens a gravity well.
    document.addEventListener("pointerdown", function (event) {
      if (!onBackground(event) || busy.target) {
        return;
      }
      pointer.touch = event.pointerType !== "mouse";
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      press = { x: event.clientX, y: event.clientY, moved: false };
      press.timer = setTimeout(function () {
        if (press && !press.moved) {
          openWell(press.x, press.y);
        }
      }, HOLD_MS);
    });

    function endPress(event) {
      if (!press) {
        return;
      }
      clearTimeout(press.timer);
      var held = Boolean(well);
      var moved = press.moved;
      press = null;
      if (held) {
        releaseWell();
        return;
      }
      if (moved || event.type === "pointercancel") {
        return;
      }
      if (!catchShootingStar(event.clientX, event.clientY)) {
        addPulse(event.clientX, event.clientY, 0.6);
      }
    }

    document.addEventListener("pointerup", endPress);
    document.addEventListener("pointercancel", endPress);

    // A press on the background would otherwise start a text selection, and
    // dragging the well would highlight the card's labels. Only background
    // presses are stopped, so text in the card can still be selected.
    document.addEventListener("mousedown", function (event) {
      if (onBackground(event)) {
        event.preventDefault();
      }
    });

    // Holding on touch screens would otherwise open the context menu.
    document.addEventListener("contextmenu", function (event) {
      if (well) {
        event.preventDefault();
      }
    });

    document.addEventListener("keydown", armIdleShootingStar);

    // Delegated, so the Sign In iPart can re-render in a partial postback.
    document.addEventListener("focusin", function (event) {
      if (event.target.matches && event.target.matches(FIELD_SELECTOR)) {
        addPulseFrom(event.target, 0.35);
      }
    });

    document.addEventListener("click", function (event) {
      if (event.target.matches && event.target.matches(SUBMIT_SELECTOR) && !event.target.disabled) {
        addPulseFrom(event.target, 0.9);
        startSparks();
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target.matches && event.target.matches(FIELD_SELECTOR)) {
        addPulseFrom(document.querySelector(SUBMIT_SELECTOR), 0.9);
        startSparks();
      }
    });

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });

    document.addEventListener("visibilitychange", startLoop);

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", startLoop);
    }

    var sys = window.Sys;
    if (sys && sys.WebForms && sys.WebForms.PageRequestManager) {
      sys.WebForms.PageRequestManager.getInstance().add_endRequest(addCardExtras);
    }
  }

  /* ---------- Start ---------- */

  // Resolves when web fonts and the logo image are ready, or after a cap, so
  // nothing swaps or pops in mid-animation.
  function whenReady(callback) {
    var done = false;
    function finish() {
      if (!done) {
        done = true;
        callback();
      }
    }

    var waits = [];
    if (document.fonts && document.fonts.ready) {
      waits.push(document.fonts.ready);
    }
    var logo = document.querySelector(LOGO_SELECTOR);
    if (logo && logo.decode) {
      waits.push(logo.decode().catch(function () {}));
    }

    Promise.all(waits).then(finish, finish);
    setTimeout(finish, READY_WAIT_MS);
  }

  function playIntro() {
    startTime = performance.now();
    measureCentre();
    resize();
    startLoop();
    // Next frame, so the hidden state has painted and the transitions run.
    requestAnimationFrame(reveal);
  }

  // Exposed for the mockups' controls.
  window.HubSignIn = {
    replay: function () {
      root.classList.add("hub-signin-intro");
      // Force the hidden state to apply before it is removed again.
      void root.offsetWidth;
      playIntro();
    },
    eggs: eggControls
  };

  function init() {
    // The loader only loads this file on sign-in pages, but if it is ever
    // included elsewhere, undo everything rather than restyle the page.
    if (!document.querySelector(CARD_SELECTOR)) {
      clearTimeout(failSafe);
      root.classList.remove("hub-signin", "hub-signin-intro");
      style.remove();
      return;
    }

    try {
      canvas = document.createElement("canvas");
      canvas.className = "hub-signin-field";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
      ctx = canvas.getContext("2d");

      starRgb = resolveColour("var(--hub-signin-star)", starRgb);
      starSprite = makeSprite(starRgb);
      accentRgb = resolveColour("var(--hub-signin-core)", accentRgb);
      accentSprite = makeSprite(accentRgb, true);

      buildCatalogue();
      applyAccentContrast();
      addCardExtras();
      resize();
      bindInteraction();
      watchBusy();
      watchErrors();
      whenReady(playIntro);
      startShootingStars();
    } catch (error) {
      reveal();
      if (window.console) {
        console.warn("Hub sign-in effects did not start.", error);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
