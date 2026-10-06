// Independent documentation check; run from repository root.
// Optional argument: compare guide changes since a supplied base revision.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');
const guides = ['AGENTS.md','CLAUDE.md','assets/sprites/ILLUSTRATED.md','docs/VISUAL-SYSTEM.md','docs/claude/README.md','docs/claude/01-STYLE-AND-REFERENCES.md','docs/claude/02-WORKFLOW.md','docs/claude/03-PROMPTS.md','docs/claude/04-ATLAS-INTEGRATION.md','docs/claude/05-REVIEW-TROUBLESHOOTING.md','docs/claude/06-NICK-CASE-STUDY.md','docs/claude/templates/CHARACTER-BRIEF.md','docs/claude/templates/REVIEW-RECORD.md'];
const extra = ['README.md','CHANGELOG.md','assets/sprites/nick-prompt.md','assets/sprites/alex-perspective.md','assets/sprites/nazim-likeness.md','assets/sprites/sam-likeness.md','assets/sprites/gerald-likeness.md','docs/art-review/cast-perspective/README.md','docs/art-review/face-perspective/README.md','docs/collaboration/README.md','docs/collaboration/2026-10-06-cast-perspective-release.md','docs/collaboration/2026-10-06-face-perspective-previews.md'];
const changed = execFileSync('git',['diff','--name-only',process.argv[2] || 'HEAD','--','AGENTS.md','CLAUDE.md','docs/VISUAL-SYSTEM.md','docs/claude','assets/sprites/ILLUSTRATED.md'],{encoding:'utf8'}).trim().split(/\r?\n/);
const failures = [];
if (changed.length !== guides.length || changed.some(file => !guides.includes(file))) failures.push('Changed guidance file list mismatch');
let links=0, fences=0, examples=0, commands=0;
for (const file of [...guides,...extra]) {
  const body = fs.readFileSync(file,'utf8');
  const markers = body.match(/^\x60\x60\x60[^\r\n]*$/gm) || [];
  if (markers.length % 2) failures.push(file + ': unmatched fence');
  fences += markers.length/2;
  const prose = body.replace(/\x60\x60\x60[^\r\n]*\r?\n[\s\S]*?^\x60\x60\x60\s*$/gm,'');
  for (const match of prose.matchAll(/\]\(([^)]+)\)/g)) {
    const href = match[1].split(/\s+"/)[0];
    if (/^(?:https?:|app:|#)/.test(href)) continue;
    const target = href.split('#')[0];
    const resolved = target.startsWith('/') ? path.resolve('.'+target) : path.resolve(path.dirname(file),target);
    if (!fs.existsSync(resolved)) failures.push(file + ': missing ' + href);
    links++;
  }
  for (const match of prose.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|#)/.test(match[1])) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file),match[1].split('#')[0]))) failures.push(file + ': missing HTML target ' + match[1]);
    links++;
  }
  for (const match of body.matchAll(/\x60\x60\x60javascript\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g)) {
    try { new vm.Script(/nick:\s*person/.test(match[1]) ? '({'+match[1]+'})' : match[1]); examples++; }
    catch (e) { failures.push(file + ': JS example ' + e.message); }
  }
  for (const match of body.matchAll(/\bnode ((?:tests|tools|docs)\/[\w./-]+\.js)/g)) {
    if (!fs.existsSync(match[1])) failures.push(file + ': missing command ' + match[1]);
    commands++;
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(JSON.stringify({result:'PASS',files:guides.length+extra.length,changedGuideFiles:changed.length,links,fences,examples,commands}));
