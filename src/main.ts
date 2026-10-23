import "./style.css";
const isForest = document.title.includes("STILLWILD");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const video = document.querySelector<HTMLVideoElement>("video")!;
const motion = document.querySelector<HTMLButtonElement>("#motion")!;
let motionPaused = reduce.matches;
const saveData = (
  navigator as Navigator & { connection?: { saveData?: boolean } }
).connection?.saveData;
function syncMotion() {
  document.documentElement.classList.toggle("motion-paused", motionPaused);
  motion.hidden = reduce.matches;
  motion.textContent = motionPaused ? "Resume motion" : "Pause motion";
  motion.setAttribute("aria-pressed", String(motionPaused));
  const rect = video.parentElement!.getBoundingClientRect();
  if (
    motionPaused ||
    document.hidden ||
    rect.bottom <= 0 ||
    rect.top >= innerHeight
  ) {
    video.pause();
    return;
  }
  if (!video.getAttribute("src") && !saveData) {
    video.src = matchMedia("(max-width:650px)").matches
      ? "./media/hero-mobile.mp4"
      : "./media/hero.mp4";
  }
  if (video.getAttribute("src")) void video.play().catch(() => {});
}
video.addEventListener("playing", () => video.classList.add("ready"));
video.addEventListener("error", () => video.classList.remove("ready"));
motion.addEventListener("click", () => {
  motionPaused = !motionPaused;
  syncMotion();
});
reduce.addEventListener("change", (e) => {
  motionPaused = e.matches;
  syncMotion();
});
document.addEventListener("visibilitychange", syncMotion);
new IntersectionObserver(syncMotion, { threshold: 0 }).observe(
  video.parentElement!,
);
syncMotion();
const progress = document.querySelector<HTMLElement>(".journey span");
if (progress) {
  let pending = false;
  const update = () => {
    progress.style.height =
      (scrollY /
        Math.max(1, document.documentElement.scrollHeight - innerHeight)) *
        100 +
      "%";
    pending = false;
  };
  addEventListener(
    "scroll",
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}
const sound = document.querySelector<HTMLButtonElement>(".sound")!;
let context: AudioContext | undefined;
let master: GainNode | undefined;
let active = false;
sound.addEventListener("click", async () => {
  sound.disabled = true;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const notes = isForest ? [130.81, 196, 261.63] : [146.83, 220, 293.66];
      for (const [i, f] of notes.entries()) {
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = f;
        oscillator.detune.value = i * 3;
        volume.gain.value = 0.035;
        oscillator.connect(volume);
        volume.connect(master);
        oscillator.start();
        const lfo = context.createOscillator();
        const depth = context.createGain();
        lfo.frequency.value = 0.055 + i * 0.018;
        depth.gain.value = 0.008;
        lfo.connect(depth);
        depth.connect(volume.gain);
        lfo.start();
      }
    }
    await context.resume();
    active = !active;
    master!.gain.setTargetAtTime(active ? 0.35 : 0, context.currentTime, 0.7);
    sound.setAttribute("aria-pressed", String(active));
    sound.querySelector("span:last-child")!.textContent = active
      ? "Sound on"
      : "Sound off";
    if (document.hidden) await context.suspend();
  } catch {
    active = false;
    sound.setAttribute("aria-pressed", "false");
    sound.querySelector("span:last-child")!.textContent = "Sound unavailable";
  } finally {
    sound.disabled = false;
  }
});
document.addEventListener("visibilitychange", () => {
  if (context && active) {
    if (document.hidden) void context.suspend();
    else void context.resume();
  }
});
