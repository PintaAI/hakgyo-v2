// One command for the whole video: render (resumable) -> soundtrack -> mux.
//   bun make.mjs [--project <dir>] [--out name.mp4] [render options, e.g. --jobs 4 --encoder nvenc]
import { spawnSync } from "node:child_process";
import { basename, isAbsolute, join, resolve } from "node:path";

const engine = import.meta.dir;
const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const projectArg = arg("--project", process.env.PROMO_PROJECT ?? "demo");
const project = isAbsolute(projectArg) ? projectArg : resolve(engine, "..", projectArg);
const output = arg("--out", `hakgyo-${basename(project)}.mp4`);

const run = (cmd, cmdArgs) => {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", cwd: engine });
  if (r.error || r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")} failed`);
};
const python = ["python", "python3", "py"].find((p) => spawnSync(p, ["--version"]).status === 0);
if (!python) throw new Error("Python not found on PATH");

run("bun", ["render.mjs", "--project", project, ...args.filter((a, i) => a !== "--out" && args[i - 1] !== "--out" && a !== "--project" && args[i - 1] !== "--project")]);
run(python, ["audio.py", "--project", project]);
run("ffmpeg", ["-v", "error", "-y", "-i", join(project, "video.mp4"), "-i", join(project, "soundtrack.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", join(project, output)]);
console.log(`done: ${join(project, output)}`);
