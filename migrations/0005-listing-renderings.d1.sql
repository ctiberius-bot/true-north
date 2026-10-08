PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS listing_renderings (
  listing_version_id TEXT PRIMARY KEY REFERENCES listing_versions(id),
  render_html TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_content_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
INSERT INTO listing_renderings(listing_version_id,render_html,source_url,source_content_hash,fetched_at) VALUES(
  'lv_10097f7a51960971d8a469a6',
  '<h2><br>Job Description</h2><p></p><p><b>Architect Our Future—At Scale</b></p><p>Cor Partners seeks an highly experienced <b>Enterprise Architect</b> to lead our multi-year technology transformation. This senior, enterprise-wide role defines architecture standards, drives standardization, and enables AI-driven engineering across our Engle Martin, Eberl, Envista, and DBI business units. You’ll shape our modern, scalable enterprise architecture while ensuring alignment between business strategy and technical execution.</p><p><b>What You’ll Do</b></p><p><b>Strategy &amp; Governance</b></p><ul><li>Define and evolve enterprise <b>architecture strategy, roadmap, and governance standards</b></li><li>Establish and enforce <b>architecture guardrails, patterns, and compliance</b> across business units</li></ul><p><b>Innovation &amp; AI</b></p><ul><li>Lead adoption of <b>LLMs, agent-based architectures, and AI-enabled engineering</b></li></ul><p><b>Technical Leadership</b></p><ul><li>Provide deep technical expertise in <b>Microsoft ecosystem (Azure, .NET, M365)</b> and <b>enterprise platforms (Workday, Salesforce, NetSuite)</b></li><li>Guide engineering teams on <b>solution design, APIs, integration patterns, and data architecture</b></li></ul><p><b>Cloud Transformation</b></p><ul><li>Drive <b>Azure cloud transformation</b> and champion <b>DevOps/CI/CD practices</b></li></ul><p><b>What We’re Looking For</b></p><ul><li><b>15&#43; years</b> in software engineering, architecture, and design</li><li><b>Deep insurance industry experience</b> (Commercial, Personal, Specialty lines; TPA/MGA models a plus)</li><li><b>Claims experience strongly preferred</b></li><li>Expertise in <b>Azure, .NET, cloud-native architecture, and enterprise integration</b></li><li>Hands-on experience with <b>LLMs, AI engineering patterns, and agent-based architectures</b></li><li>Proven ability to lead and influence in a <b>matrixed enterprise environment</b></li><li><b>Atlanta or Boston area is preferred but will consider other locations </b></li></ul><p></p>',
  'https://corpartners.wd5.myworkdayjobs.com/wday/cxs/corpartners/COR/job/Head-of-Enterprise-Architecture_R2004',
  '819d1ac21512ca53557dda79872ef521b68a901b42ed355308f31cbe8623594e',
  '2026-10-08T15:34:00.000Z'
) ON CONFLICT(listing_version_id) DO UPDATE SET render_html=excluded.render_html,source_url=excluded.source_url,source_content_hash=excluded.source_content_hash,fetched_at=excluded.fetched_at;
