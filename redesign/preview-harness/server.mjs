// Local preview server: serves a workspace HTML file with mock data shaped like the true-north-citadel API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [, , htmlPath, port = '8787'] = process.argv;
const root = path.dirname(new URL(import.meta.url).pathname);
const src = process.env.TN_SRC || '.';
const now = Date.now(), ago = m => new Date(now - m * 60000).toISOString();

const jobs = [
  ['j1', 'Vice President, Enterprise Architecture', 'Cor Partners', 'Atlanta, GA (Hybrid)', 'complete', 30, 'approved_queue'],
  ['j2', 'Chief Technology Officer', 'Meridian Health Systems', 'Remote — US', 'complete', 120, 'review'],
  ['j3', 'SVP, Digital Transformation', 'Halvorsen Logistics', 'Charlotte, NC', 'complete', 1500, 'submitted'],
  ['j4', 'Head of Platform Engineering', 'Northwind Capital', 'New York, NY', 'pending', 200, 'none'],
  ['j5', 'Director, Cloud Strategy', 'Brightline Insurance', 'Remote', 'login_required', 3000, 'none'],
  ['j6', 'VP Engineering, Data Platforms', 'Arcadia Payments', 'Atlanta, GA', 'complete', 4000, 'draft'],
  ['j7', 'Chief Information Officer', 'Sutter County Schools', 'Yuba City, CA', 'blocked', 9000, 'none'],
  ['j8', 'Enterprise Architect, Principal', 'Cor Partners', 'Remote — US', 'complete', 600, 'approved'],
  ['j9', 'VP, Technology Operations', 'Granite Peak Energy', 'Denver, CO', 'incomplete_retry', 7000, 'none'],
  ['j10', 'Field CTO', 'Lattice Security', 'Austin, TX (Hybrid)', 'complete', 11000, 'interviewing'],
].map(([id, title, company, location, research_status, seen, scenario]) => ({ id, title, company, location, research_status, scenario, source: id === 'j1' || id === 'j8' ? 'Workday · Cor Partners' : 'LinkedIn alert', canonical_url: id === 'j1' || id === 'j8' ? `https://corpartners.wd5.myworkdayjobs.com/en-US/careers/job/${id}` : `https://www.linkedin.com/jobs/view/40${id.slice(1)}12345`, engagement_type: 'Full-time', first_seen_at: ago(seen + 4000), last_seen_at: ago(seen), evidence_count: 4 }));

const listingHtml = `<h3>About the role</h3><p>Cor Partners is seeking a <strong>Vice President of Enterprise Architecture</strong> to set the technical direction for a portfolio of regulated financial-services platforms. You will lead a team of 14 architects and partner directly with the CIO and business-unit presidents.</p><h3>What you will do</h3><ul><li>Own the enterprise reference architecture and the multi-year modernization roadmap.</li><li>Chair the architecture review board and establish decision records for every material platform choice.</li><li>Lead cloud migration strategy across three data centers, including cost and resilience targets.</li><li>Build and mentor a bench of principal architects.</li></ul><h3>What you bring</h3><ul><li>12+ years in technology leadership, including 5+ leading architecture functions.</li><li>Experience in a regulated industry (financial services, insurance, or healthcare).</li><li>Track record presenting to boards and executive committees.</li></ul><h4>Compensation</h4><p>Base salary range $245,000–$290,000 plus annual bonus. Hybrid in Atlanta, three days per week on site.</p>`;

function detail(job) {
  const fresh = job.scenario === 'approved_queue';
  return { ...job, listing_versions: [{ id: `lv_${job.id}_3`, fetched_at: ago(job.id === 'j1' ? 2900 : 5000), content_hash: 'b1946ac92492d2347c6235b4d2611184e5f1c3a7d2f0a9e8c6b4d2f0a9e8c6b4', full_description: 'About the role\nPlain text listing as captured from the alert email.\n\nResponsibilities\n- Lead the platform team\n- Own reliability targets', salary_min: 245000, provider: job.source.startsWith('Workday') ? 'workday_public' : 'gmail_alert', render_html: job.id === 'j1' || job.id === 'j2' ? listingHtml : null }],
    evidence: [
      { id: 'e1', evidence_type: 'requirement', source_url: job.canonical_url, source_anchor: '#what-you-bring li:1', claim_text: '12+ years in technology leadership, including 5+ leading architecture functions.' },
      { id: 'e2', evidence_type: 'compensation', source_url: job.canonical_url, source_anchor: '#compensation p:1', claim_text: 'Base salary range $245,000–$290,000 plus annual bonus.' },
      { id: 'e3', evidence_type: 'location_policy', source_url: job.canonical_url, source_anchor: '#compensation p:1', claim_text: 'Hybrid in Atlanta, three days per week on site.' },
    ], assessments: job.id === 'j1' ? [{ id: 'as1', profile_id: 'exec-architecture', profile_version: 4, arsenal_version: 'arsenal-2026-09-30', score: 82, band: 'strong', listing_version_id: `lv_${job.id}_3`, listing_content_hash: 'b1946ac9…', explanation: { assessment_method_version: 'det-1.2', alias_hits: ['VP Enterprise Architecture', 'Head of Architecture'], hard_constraints: { compensation: 'meets floor', engagement: 'full-time ok', geography: 'Atlanta hybrid ok', vetoes: [], review_reasons: [] }, arsenal_matches: [{ claim_id: 'arsenal:lead-arch-14', source_anchor: 'Arsenal §3.2 — led 14-person architecture team', tags: ['leadership', 'architecture'] }, { claim_id: 'arsenal:board-briefings', source_anchor: 'Arsenal §5.1 — quarterly board technology briefings', tags: ['executive'] }] } }] : [],
    latest_listing_check: fresh ? { id: 'check_91a', listing_version_id: `lv_${job.id}_3`, source_url: job.canonical_url, captured_at: ago(6), availability: 'open', capture_source: 'public_server_fetch', content_hash: 'b1946ac9', trusted_for_freshness: true }
      : job.scenario === 'approved' ? { id: 'check_77c', listing_version_id: `lv_${job.id}_3`, source_url: job.canonical_url, captured_at: ago(2000), availability: 'open', capture_source: 'public_server_fetch', content_hash: 'b1946ac9', trusted_for_freshness: true } : null };
}

const stageFor = { approved_queue: 'approved_to_send', approved: 'approved_to_send', review: 'chris_review', submitted: 'applied', draft: 'package_draft', interviewing: 'interviewing', none: 'target' };
const pkgStatusFor = { approved_queue: 'approved', approved: 'approved', review: 'chris_review', submitted: 'approved', draft: 'writer_draft', interviewing: 'approved' };
function workflow(job) {
  const ps = pkgStatusFor[job.scenario];
  const pkg = ps ? [{ id: `pkg_${job.id}`, canonical_job_id: job.id, listing_version_id: `lv_${job.id}_3`, arsenal_version: 'arsenal-2026-09-30', status: ps, revision: ps === 'writer_draft' ? 1 : 3, created_at: ago(3000) }] : [];
  const arts = ps ? [['tailored_resume', 'a7f3c19e0b6d4e2f8a1c5b9d3e7f0a2c4b6d8e0f1a3c5e7b9d1f3a5c7e9b1d3f'], ['cover_letter', '3e9d1f7a5c2b8e4d0f6a1c3e5b7d9f0a2c4e6b8d0f1a3c5e7b9d1f3a5c7e9b1d']].map(([t, h], i) => ({ id: `art_${job.id}_${i}`, package_id: `pkg_${job.id}`, artifact_type: t, drive_file_id: `1AbC${job.id}xyz${i}`, content_hash: h, evidence_map: [{ claim_id: 'arsenal:lead-arch-14', source_anchor: 'Arsenal §3.2' }, { claim_id: 'arsenal:board-briefings', source_anchor: 'Arsenal §5.1' }], status: ps === 'approved' ? 'approved' : 'draft' })) : [];
  const ver = ps && ps !== 'writer_draft' ? arts.map(a => ({ artifact_id: a.id, drive_file_id: a.drive_file_id, content_hash: a.content_hash })) : [];
  return { job: { id: job.id, title: job.title, company: job.company }, requirements: [], company_dossiers: [], dossier_sources: [], fit_reviews: [], application_packages: pkg, application_artifacts: arts,
    package_reviews: ps ? [{ id: 'r1', package_id: `pkg_${job.id}`, package_revision: 1, reviewer_role: 'writer', decision: 'approve', notes: 'Initial draft bound to listing v3.', created_at: ago(2900) }, { id: 'r2', package_id: `pkg_${job.id}`, package_revision: 2, reviewer_role: 'critic', decision: 'approve', notes: 'Every claim cited to the arsenal; tightened the opening.', created_at: ago(2500) }] : [],
    pipeline_items: [{ id: `pi_${job.id}`, canonical_job_id: job.id, stage: stageFor[job.scenario], next_action: job.scenario === 'review' ? 'Review package revision 3' : 'Monitor employer follow-up', owner: 'Chris', due_at: ago(-2880) }],
    interviews: [], interviewer_dossiers: [], interview_records: [], artifact_verifications: ver, generation_mode: 'x', automatic_generation: false, external_actions: 'disabled' };
}
const appQueue = [
  { id: 'aq_j1', status: 'approved', canonical_job_id: 'j1', status_label: 'Approved — not submitted', updated_at: ago(20), package_id: 'pkg_j1', package_revision: 3 },
  { id: 'aq_j3', status: 'submitted', canonical_job_id: 'j3', status_label: 'Submitted', updated_at: ago(1400), package_id: 'pkg_j3', package_revision: 3 },
];
const researchQueue = [
  { id: 'research_a1', source: 'LinkedIn alert', task_kind: 'fetch_listing', url: 'https://www.linkedin.com/jobs/view/4051234567', status: 'login_required', attempts: 2, error_code: 'linkedin_auth_wall', canonical_job_id: 'j5' },
  { id: 'research_a2', source: 'Indeed alert', task_kind: 'fetch_listing', url: 'https://www.indeed.com/viewjob?jk=9f2e1a', status: 'blocked', attempts: 5, error_code: 'robots_disallowed', canonical_job_id: 'j7' },
  { id: 'research_a3', source: 'Workday', task_kind: 'fetch_listing', url: 'https://granitepeak.wd1.myworkdayjobs.com/en-US/External/job/VP-Technology-Operations_R-1182', status: 'incomplete_retry', attempts: 1, error_code: 'timeout', canonical_job_id: 'j9' },
  { id: 'research_a4', source: 'LinkedIn alert', task_kind: 'fetch_listing', url: 'https://www.linkedin.com/jobs/view/4041234567', status: 'pending', attempts: 0, canonical_job_id: 'j4' },
  { id: 'research_a5', source: 'Workday · Cor Partners', task_kind: 'fetch_listing', url: 'https://corpartners.wd5.myworkdayjobs.com/en-US/careers/job/j1', status: 'complete', attempts: 1, canonical_job_id: 'j1' },
];

const json = (res, body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  if (p === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(htmlPath)); }
  if (p === '/TrueNorth-Polaris-full_dark.svg') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return res.end(fs.readFileSync(`${src}/TrueNorth-Polaris-full_dark.svg`)); }
  if (p === '/TrueNorth-Polaris-mark_transparent.svg') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return res.end(fs.readFileSync(`${src}/TrueNorth-Polaris-mark_transparent.svg`)); }
  if (p === '/fonts/oswald-latin-wght-normal.woff2') { res.writeHead(200, { 'content-type': 'font/woff2' }); return res.end(fs.readFileSync(path.join(root, '../fonts/oswald-latin-wght-normal.woff2'))); }
  if (p === '/api/jobs') return json(res, jobs);
  let m;
  if ((m = p.match(/^\/api\/jobs\/([^/]+)$/))) return json(res, detail(jobs.find(j => j.id === m[1])));
  if ((m = p.match(/^\/api\/workflows\/([^/]+)$/))) return json(res, workflow(jobs.find(j => j.id === m[1])));
  if (p === '/api/applications/queue') return json(res, appQueue);
  if ((m = p.match(/^\/api\/applications\/([^/]+)\/destinations$/))) return json(res, ['j1', 'j3', 'j8'].includes(m[1]) ? [{ id: 'dest_' + m[1], destination_url: jobs.find(j => j.id === m[1]).canonical_url, destination_host: 'corpartners.wd5.myworkdayjobs.com' }] : []);
  if ((m = p.match(/^\/api\/applications\/([^/]+)\/execution-preview$/))) { const j = jobs.find(x => x.id === m[1]); return json(res, { job_id: j.id, package_id: 'pkg_' + j.id, package_revision: 3, listing_version_id: `lv_${j.id}_3`, listing_check_id: 'check_91a', destination_url: j.canonical_url, destination_host: new URL(j.canonical_url).hostname, artifact_manifest_hash: '9c1d4e7f2a5b8c0d3e6f9a1b4c7d0e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d', listing_current: j.id !== 'j8', artifacts: [] }); }
  if (p === '/api/queue') { const s = u.searchParams.get('status'); return json(res, researchQueue.filter(r => !s || r.status === s)); }
  json(res, { error: 'not_found' }, 404);
}).listen(Number(port), () => console.log('listening', port));
