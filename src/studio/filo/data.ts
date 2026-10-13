import type { Asset, Block, Flow, Scene } from './model'

const photo = (asset: Asset, height = 180): Block => ({ id: 'image', kind: 'image', asset, height })
const rows = (title: string, items: [string, string][], height = 180, kind: Block['kind'] = 'rows'): Block => ({ id: 'details', kind, title, items, height })
const note = (title: string, body: string, tone: Block['tone'] = 'neutral', height = 112): Block => ({ id: 'note', kind: 'notice', title, body, tone, height })
const screen = (id: string, label: string, title: string, description: string, blocks: Block[], cta: string, kicker = 'BC-001 · BACTERIAL CELLULOSE'): Scene => ({
  id, label, title, description, blocks: blocks.map((b, i) => ({ ...b, id: `${id}-${i}` })), cta, kicker, hold: 3.2, tapX: 196, tapY: 755,
})

const screens = {
  home: screen('home', 'Today', 'Good morning, David.', 'Your materials. Their next steps.', [
    note('3 things need your attention', 'Samples to approve · A supplier decision · A heat conflict', 'success', 102),
    rows('Recent materials', [['Bacterial Cellulose', 'BC-001 · In development'], ['Cotton Twill', 'CT-017 · Sampling'], ['Recycled Nylon', 'RN-003 · Sourcing']], 225),
  ], 'Add material', 'MONDAY, 12 OCTOBER'),
  intake: screen('intake', 'Choose input', 'Add a new material', 'Start with what you already have.', [
    rows('Bring in a source', [['Upload spec', 'PDF, image or technical sheet'], ['Scan document', 'Capture a supplier document'], ['Forward supplier email', 'Keep its original source'], ['Add manually', 'Enter known information']], 310),
    note('Nothing invented', 'Filo extracts what is present. Missing information stays visibly unknown.', 'neutral', 100),
  ], 'Upload supplier specification', 'MATERIAL INTAKE'),
  reading: screen('reading', 'Filo extracts', 'Reading your document', 'One source becomes structured material context.', [
    photo('lime-blob', 205),
    rows('Supplier specification.pdf', [['Material information', 'Extracted'], ['Supplier details', 'Identified'], ['Technical properties', 'Checked'], ['Missing information', '4 gaps found']], 210, 'progress'),
  ], 'Preparing your Technical File', 'FILO IS PREPARING'),
  extracted: screen('extracted', 'Review extraction', 'Bacterial Cellulose', 'Here’s what I found. Review it before saving.', [
    rows('Supplier claimed · not verified', [['Supplier', 'Modern Synthesis'], ['Composition', 'Bacterial cellulose'], ['Width', '145 cm'], ['MOQ', '500 m'], ['Lead time', '6–8 weeks']], 250),
    note('4 unknown properties', 'Heat tolerance, shrinkage, wash performance and pilling resistance.', 'warning', 112),
  ], 'Continue', 'DRAFT TECHNICAL FILE'),
  request: screen('request', 'Request missing data', 'Resolve the gaps', 'Filo prepared the request. You decide what is sent.', [
    rows('Information to request', [['Heat tolerance', 'Unknown'], ['Shrinkage', 'Unknown'], ['Wash performance', 'Unknown'], ['Pilling resistance', 'Unknown']], 210, 'checklist'),
    note('Message preview', 'Hi, we’re developing an overshirt using your bacterial cellulose. Could you share these technical properties, with their test methods and sources?', 'neutral', 156),
  ], 'Review request', 'SUPPLIER OUTREACH'),
  requirements: screen('requirements', 'Set requirements', 'New sourcing request', 'Find the right fit for this material and this run.', [
    photo('cellulose', 135),
    rows('Your requirements', [['Material', 'Bacterial cellulose'], ['Use', 'Overshirt'], ['Target quantity', '2,000 units'], ['Target delivery', 'March 2027']], 230),
  ], 'Find suppliers', 'SOURCING'),
  searching: screen('searching', 'Find suppliers', 'Finding suitable suppliers', 'Filo checks capability before recommending a shortlist.', [
    photo('lime-blob', 205),
    rows('Sourcing progress', [['Suppliers reviewed', '12'], ['Construction capability', '7'], ['Estimated capacity fits', '4'], ['Recommended suppliers', '3']], 210, 'progress'),
  ], 'Preparing comparison', 'FILO IS PREPARING'),
  suppliers: screen('suppliers', 'Shortlist', '3 recommended suppliers', 'Price is one part of the decision.', [
    rows('Sample cost · estimated lead time', [['Modern Synthesis', '€72 · 7 weeks'], ['Pyratex', '€64 · 9 weeks'], ['Supplier C', '€78 · 5 weeks']], 215),
    note('Modern Synthesis looks strongest', 'Capacity and lead time fit. Heat tolerance remains unverified.', 'success', 125),
  ], 'Compare suppliers', 'SOURCING'),
  compare: screen('compare', 'Compare', 'Compare the shortlist', 'Unknown capacity is not confirmed capacity.', [
    rows('Modern / Pyratex / Supplier C', [['Sample', '€72 / €64 / €78'], ['MOQ (m)', '500 / 300 / 1,000'], ['Lead time', '7 / 9 / 5 weeks'], ['Capacity', 'Yes / Unknown / Yes'], ['Heat data', 'Missing / Yes / Yes']], 275),
    note('Lead-time risk', 'Pyratex misses the target. Request technical data with the samples.', 'warning', 112),
  ], 'Request samples from all 3', 'SUPPLIER COMPARISON'),
  approval: screen('approval', 'Approve samples', 'Ready for your approval', 'Run samples for the Bacterial Cellulose overshirt.', [
    rows('Sample plan', [['3', 'suppliers'], ['€214', 'total cost'], ['~9', 'days']], 128, 'metrics'),
    rows('Filo will', [['Send approved requests', 'Your reviewed message'], ['Attach requirements', 'Current revision'], ['Request missing data', 'Keep provenance'], ['Track responses', 'Oct 14–16 expected']], 235, 'checklist'),
  ], 'Approve €214', 'HUMAN APPROVAL'),
  approved: screen('approved', 'Requests sent', 'I’ll take it from here.', 'The approved plan is now in motion.', [
    photo('confirmation', 200),
    rows('Sample requests sent', [['Modern Synthesis', '€72'], ['Pyratex', '€64'], ['Supplier C', '€78']], 185),
    note('Expected responses', 'October 14–16 · Every action is recorded.', 'success', 78),
  ], 'View activity', 'APPROVED · SCENARIO PREVIEW'),
  tag: screen('tag', 'Tap the tag', 'A sample. Its whole story.', 'Tap the physical tag to return to the right Technical File.', [
    photo('tag-scan', 290),
    note('BC-001 · Sample R2', 'Modern Synthesis · Overshirt · Received today', 'success', 105),
  ], 'Open Technical File', 'SAMPLE ARRIVAL'),
  nfc: screen('nfc', 'Context opens', 'Filo tag detected', 'Your physical sample is linked to its existing record.', [
    photo('nfc', 205),
    rows('Sample identified', [['Material', 'Bacterial Cellulose'], ['Technical File', 'BC-001'], ['Revision', 'Overshirt / R2']], 185),
  ], 'Continue', 'TAP → CONTEXT'),
  file: screen('file', 'Technical File', 'Bacterial Cellulose', 'Overshirt / R2 · Modern Synthesis', [
    photo('cellulose', 148),
    rows('Physical properties', [['Weight', '210 gsm'], ['Width', '145 cm'], ['Thickness', '0.72 mm']], 175),
    note('3 things need verification', 'Heat tolerance · Pilling · Seam performance', 'warning', 98),
  ], 'Start testing', 'BC-001 · IN DEVELOPMENT'),
  tests: screen('tests', 'Tests', 'Keep the evidence close', 'A claim, an observation and a verified result are not the same.', [
    rows('Tests & observations', [['Heat tolerance', 'Supplier claim · 60°C'], ['Pilling', 'Observation needed'], ['Seam performance', 'Not tested'], ['Wash durability', 'Unknown']], 265),
    note('At the bench', 'Capture a photo, a voice note or a measurement. Review the interpretation before saving.', 'neutral', 120),
  ], 'Add observation', 'TESTING'),
  capture: screen('capture', 'Capture', 'Add an observation', 'Hands on the material. Context stays with it.', [
    photo('pinked-edges', 240),
    { id: 'voice', kind: 'wave', title: 'Hold to speak', body: '“Pilling after 20 rubs.”', height: 130 },
  ], 'Review observation', 'PHYSICAL EVIDENCE'),
  listening: screen('listening', 'Voice note', 'Listening…', 'Your words stay attached to the evidence.', [
    photo('lime-blob', 180),
    { id: 'wave', kind: 'wave', title: 'Pilling after 20 rubs.', body: 'Rub test · BC-001 · David', height: 165 },
  ], 'Finish recording', 'VOICE OBSERVATION'),
  captured: screen('captured', 'Review observation', 'Observation captured', 'Filo structured your note. Confirm the interpretation.', [
    rows('Physical test · Oct 12 · David', [['Test', 'Rub test'], ['Cycles', '20'], ['Result', 'Visible pilling'], ['Evidence', '1 photo + voice note']], 245),
    note('Observed, not verified', '“Pilling after 20 rubs.” The original note remains part of the record.', 'success', 124),
  ], 'Save observation', 'REVIEW EVIDENCE'),
  warning: screen('warning', 'See the conflict', 'Check before fusing', 'This material’s documented limit conflicts with the planned process.', [
    rows('Material limit / planned process', [['60°C', 'supplier claimed'], ['130°C', 'fusing · 12 seconds']], 155, 'metrics'),
    note('Potential material damage', 'The planned temperature exceeds the supplier’s documented limit by 70°C.', 'warning', 135),
    rows('Source', [['Material specification', 'Sep 28, 2026'], ['Overshirt construction', 'Current revision']], 132),
  ], 'See evidence', 'CONTEXTUAL WARNING'),
  evidence: screen('evidence', 'Review sources', 'Heat tolerance', 'Separate what was claimed from what was observed.', [
    rows('Supplier claim', [['Heat limit', '60°C'], ['Source', 'Modern Synthesis spec'], ['Date', 'Sep 28, 2026']], 190),
    rows('Internal observation', [['Deformation began', 'Around 67°C'], ['Method', 'Bench test · Oct 14']], 142),
    note('These are different sources', 'The observation does not replace the documented limit.', 'warning', 92),
  ], 'Adjust process', 'EVIDENCE, NOT ASSUMPTION'),
  alternatives: screen('alternatives', 'Choose a path', 'Two paths to investigate', 'Neither alternative is a production approval.', [
    note('01 · Controlled adhesive test', '95°C · 15 seconds. Still above the claimed 60°C limit. Test surface integrity and bond strength.', 'warning', 180),
    note('02 · Unfused construction', 'Remove the fused construction. Requires a pattern revision and an impact review.', 'neutral', 146),
  ], 'Prepare controlled test', 'ADJUST THE PROCESS'),
  scale: screen('scale', 'Choose volume', 'Can we make 10,000?', 'The same material. A different production question.', [
    rows('Production scenarios', [['500', 'units'], ['2,000', 'units'], ['10,000', 'units']], 135, 'metrics'),
    photo('swatches', 160),
    note('Material estimate', '1.84 m per overshirt, including allowance. Capacity must be confirmed separately.', 'neutral', 112),
  ], 'Review 10,000-unit scenario', 'SCALE FEASIBILITY'),
  capacity: screen('capacity', 'See the gap', 'Not yet feasible', '10,000 overshirts need more material than is confirmed.', [
    rows('Production scenario · 10,000 units', [['Material required', '18,400 m'], ['Confirmed capacity', '12,000 m'], ['Capacity gap', '6,400 m']], 212),
    note('Primary constraint', 'Modern Synthesis has confirmed 12,000 m. The remaining 6,400 m is not allocated.', 'warning', 135),
  ], 'Review options', 'CAPACITY CHECK'),
  options: screen('options', 'Compare options', 'Resolve the 6,400 m gap', 'Filo prepares options. You choose the trade-off.', [
    note('A · Split production', 'Modern Synthesis: 12,000 m. Supplier B: 6,400 m. Risk: variation between suppliers; allocation unconfirmed.', 'neutral', 170),
    note('B · Adjust the schedule', 'Ask Modern Synthesis for 18,400 m. Add 3 weeks: Apr 4 → Apr 25. Risk: launch moves.', 'neutral', 155),
  ], 'Prepare split-supplier plan', 'PRODUCTION OPTIONS'),
  plan: screen('plan', 'Prepare plan', 'A plan to review', 'Nothing is booked until you approve the allocation.', [
    rows('Proposed allocation', [['Modern Synthesis', '12,000 m'], ['Supplier B', '6,400 m'], ['Total material', '18,400 m']], 198),
    note('Next check', 'Compare material variation and confirm Supplier B’s capacity before placing any order.', 'warning', 135),
  ], 'Save proposed plan', 'DRAFT · NOT COMMITTED'),
  planned: screen('planned', 'Plan saved', 'Ready for the next decision', 'Your proposed production plan stays with BC-001.', [
    photo('confirmation', 185),
    rows('Next steps', [['Capacity confirmation', 'Filo will prepare request'], ['Variation test', 'Designer review required'], ['Purchase commitment', 'Not approved']], 202),
  ], 'Back to Technical File', 'PLAN SAVED · SCENARIO PREVIEW'),
  setup: screen('setup', 'Create test', 'Controlled adhesive test', '95°C exceeds the claimed limit. This is an investigation.', [
    rows('Test conditions', [['Material', 'BC-001 · R2'], ['Temperature', '95°C'], ['Duration', '15 seconds'], ['Pressure', 'Medium']], 230),
    note('What we’re checking', 'Bond strength and surface deformation. Follow the workshop’s approved test procedure.', 'warning', 135),
  ], 'Start controlled test', 'TEST PLAN · NOT PRODUCTION'),
  running: screen('running', 'Test in progress', 'Test in progress', '95°C · 15 seconds · Medium pressure', [
    { id: 'timer', kind: 'progress', title: 'Controlled bench test', items: [['Surface deformation', 'Record observation'], ['Bond formation', 'Record observation'], ['Evidence', 'Photo + voice note']], height: 235 },
    note('Capture what happens', 'Keep the test conditions, images and original observations together.', 'neutral', 115),
  ], 'Finish test', 'BC-001 · CONTROLLED TEST'),
  result: screen('result', 'Test results', 'Test complete', 'An observed outcome, not a new material specification.', [
    rows('Observed in this bench test', [['Surface', 'No visible deformation'], ['Bond', 'Formed'], ['Long-term adhesion', 'Unknown'], ['Wash durability', 'Not tested']], 245),
    note('Documented limit unchanged', 'The supplier’s 60°C limit still applies. Investigate durability before further decisions.', 'warning', 133),
  ], 'Save results', 'PHYSICAL EVIDENCE'),
  insights: screen('insights', 'Review insights', 'What this tells us', 'Filo connects the test to the development decision.', [
    note('Surface integrity observed', 'No visible deformation in this test. The result only covers these conditions.', 'success', 115),
    note('Durability is still unknown', 'A bond formed, but wash performance and long-term adhesion are not yet known.', 'warning', 130),
    note('Keep the sources separate', 'Supplier claim, test conditions and observations remain independently traceable.', 'neutral', 110),
  ], 'Review next steps', 'TEST INSIGHTS'),
  next: screen('next', 'Next steps', 'Recommended next steps', 'Resolve uncertainty before declaring production readiness.', [
    rows('Suggested tests', [['Wash durability', '5 cycles'], ['Bond strength', 'Repeat measurement'], ['Surface integrity', 'Inspect after washing']], 220, 'checklist'),
    note('Human review required', 'Accept or edit the proposed tests. Filo does not approve the material for production.', 'neutral', 130),
  ], 'Save to project', 'DEVELOPMENT'),
  share: screen('share', 'Choose content', 'Share this Technical File', 'A scoped handoff, with sources intact.', [
    rows('Included in this handoff', [['Material overview', 'Included'], ['Test results', 'Included'], ['Evidence & sources', 'Included'], ['Construction notes', 'Included'], ['Private notes', 'Excluded']], 277, 'checklist'),
    note('Read-only by default', 'Recipients see the selected content, not the entire workspace.', 'neutral', 105),
  ], 'Choose recipients', 'COLLABORATE'),
  recipients: screen('recipients', 'Choose people', 'Invite the right people', 'Review access before sharing.', [
    rows('Project team', [['Pattern team', 'Read-only'], ['Production team', 'Read-only'], ['Materials lead', 'Read-only']], 210, 'checklist'),
    note('Message', 'Please review the updated test evidence for BC-001. Wash durability still needs verification.', 'neutral', 135),
  ], 'Review and share', 'SCOPED ACCESS'),
  shared: screen('shared', 'Shared', 'Shared with your team', 'One record. A clear handoff.', [
    photo('confirmation', 200),
    rows('Access granted in this scenario', [['Pattern team', 'Read-only'], ['Production team', 'Read-only'], ['Materials lead', 'Read-only']], 205),
  ], 'View activity', 'SHARED · SCENARIO PREVIEW'),
  activity: screen('activity', 'Activity', 'Every action has a trail', 'What changed, who approved it, and where it came from.', [
    rows('Today', [['14:32 · David', 'Reviewed bench test evidence'], ['14:31 · Filo', 'Added test observations'], ['11:06 · Filo', 'Flagged fusing conflict'], ['09:43 · Filo', 'Proposed supplier updates'], ['09:42 · Supplier', 'Replied with new data']], 318),
    note('Approval is visible', 'Consequential changes wait for a human decision.', 'success', 96),
  ], 'Open Technical File', 'AUDIT TRAIL'),
  nextPhase: screen('next-phase', 'Move forward', 'Keep the material moving', 'The next phase starts with the evidence you already have.', [
    photo('thread-tag', 155),
    rows('Next sample revision', [['Material', 'BC-001'], ['Current revision', 'Overshirt / R2'], ['Requested revision', 'R3 · Updated construction']], 200),
    note('Before requesting R3', 'Review open tests and supplier changes.', 'neutral', 84),
  ], 'Prepare next sample request', 'NEXT PHASE'),
  supplierUpdate: screen('supplier-update', 'Supplier update', 'Modern Synthesis replied', 'Filo found two changes. Review before accepting.', [
    rows('Proposed Technical File updates', [['Heat tolerance', 'Unknown → 60°C'], ['MOQ', '500 m → 750 m']], 168),
    note('MOQ changed', 'The minimum order is higher than the original quote. Review the cost and scale impact.', 'warning', 130),
    note('Source', 'Supplier email · October 16. The previous quote stays in the evidence log.', 'neutral', 100),
  ], 'Review updates', 'SUPPLIER CLAIMS'),
  decision: screen('decision', 'Decision summary', 'A decision, with context', 'Choose the next direction for this material.', [
    rows('What we know', [['Surface integrity', 'Observed in test'], ['Bond formed', 'Observed in test'], ['Wash durability', 'Unknown'], ['Scale capacity', '6,400 m gap']], 248),
    note('Filo’s recommendation', 'Continue controlled testing. Keep production commitment on hold until the gaps are resolved.', 'success', 142),
  ], 'Review decision options', 'HUMAN DECISION'),
  decisionOptions: screen('decision-options', 'Choose direction', 'Choose what happens next', 'Each direction has a consequence.', [
    note('Continue development', 'Resolve wash durability and seam performance before a production decision.', 'success', 132),
    note('Revise construction', 'Remove fused construction and review the pattern impact.', 'neutral', 120),
    note('Pause this material', 'Keep the evidence available for another project.', 'neutral', 100),
  ], 'Continue controlled testing', 'DECISION OPTIONS'),
  confirm: screen('confirm', 'Confirm decision', 'Confirm your direction', 'Continue development; do not approve production.', [
    rows('What this decision means', [['Next step', 'Wash and seam tests'], ['Production status', 'On hold'], ['Capacity allocation', 'Not committed'], ['Owner', 'David']], 248),
    note('Why', 'Bench observations are encouraging, but durability and scale remain unresolved.', 'neutral', 125),
  ], 'Confirm decision', 'REVIEW BEFORE COMMITTING'),
  decided: screen('decided', 'Decision recorded', 'Direction recorded', 'The reasoning stays attached to the material.', [
    photo('confirmation', 180),
    rows('Decision · David · Today', [['Direction', 'Continue development'], ['Next', 'Controlled durability tests'], ['Production', 'Not approved']], 195),
  ], 'Back to project', 'DECISION SAVED'),
  export: screen('export', 'Choose content', 'Create a Technical File', 'A traceable handoff, not a flattened conclusion.', [
    rows('Include in export', [['Material overview', 'Selected'], ['Tests & observations', 'Selected'], ['Evidence & sources', 'Selected'], ['Construction', 'Selected'], ['Private notes', 'Excluded']], 275, 'checklist'),
    note('Unknowns travel with the file', 'Open tests and conflicting evidence remain visible.', 'neutral', 107),
  ], 'Preview file', 'EXPORT & DOCUMENT'),
  preview: screen('preview', 'Preview file', 'Technical File preview', 'BC-001 · Bacterial Cellulose · Overshirt / R2', [
    photo('material-tag', 195),
    rows('Document contents', [['01 · Material overview', 'Identity & properties'], ['02 · Test evidence', 'Observed & unknown'], ['03 · Construction', 'Open heat conflict'], ['04 · Provenance', 'Source references']], 230),
  ], 'Choose format', 'REVIEW THE HANDOFF'),
  formats: screen('formats', 'Choose format', 'Export options', 'Choose the right format for the handoff.', [
    rows('Available formats', [['Technical File · PDF', 'Readable handoff'], ['Data snapshot · JSON', 'Structured record'], ['Evidence package', 'Images + source references']], 238),
    note('Current revision only', 'The export includes the selected content and its status at this moment.', 'neutral', 120),
  ], 'Export Technical File', 'DOCUMENTATION'),
  exported: screen('exported', 'Export complete', 'Technical File prepared', 'Ready to leave the workspace without losing its context.', [
    photo('confirmation', 195),
    rows('BC-001 · Overshirt / R2', [['Technical File.pdf', 'Prepared'], ['Evidence references', 'Included'], ['Private notes', 'Excluded']], 195),
  ], 'Back to material', 'EXPORT · SCENARIO PREVIEW'),
  learn: screen('learn', 'Project summary', 'Keep what you learned', 'Every material develops a memory.', [
    photo('library', 150),
    rows('BC-001 · Development summary', [['Observations', 'Preserved with sources'], ['Process decisions', 'Recorded'], ['Open questions', 'Still visible']], 195),
    note('No false completion', 'A development milestone is not production readiness.', 'neutral', 100),
  ], 'Review insights', 'LEARN & IMPROVE'),
  recommendations: screen('recommendations', 'Recommendations', 'For the next collection', 'Use what you learned without repeating the same gaps.', [
    note('Ask for heat data earlier', 'Resolve the material limit before specifying a fused construction.', 'success', 130),
    note('Plan durability tests up front', 'Make wash performance part of the first sample request.', 'neutral', 125),
    note('Confirm capacity before scale', 'Separate estimated output from a confirmed allocation.', 'neutral', 125),
  ], 'Save to material library', 'REUSABLE LEARNING'),
  library: screen('library', 'Material library', 'Progress compounds', 'The next project starts with evidence, not from scratch.', [
    photo('swatches', 200),
    rows('Material records', [['Bacterial Cellulose', 'BC-001 · Evidence retained'], ['Cotton Twill', 'CT-017 · Sampling'], ['Recycled Nylon', 'RN-003 · Sourcing']], 212),
  ], 'Explore this material', 'MATERIAL LIBRARY'),
  agent: screen('agent', 'Ask in context', 'Can we make 10,000?', 'Filo already knows “this material” means BC-001.', [
    note('Not with confirmed capacity', 'You need approximately 18,400 m. Confirmed allocation is 12,000 m. The gap is 6,400 m.', 'warning', 166),
    rows('Filo can prepare', [['Check other suppliers', 'Compare variation risk'], ['Ask Modern Synthesis', 'Confirm extra allocation'], ['Model a smaller run', 'Stay within capacity']], 215),
  ], 'Prepare a capacity request', 'CONTEXTUAL AGENT'),
}

const definitions: Array<[string, string, Array<keyof typeof screens>]> = [
  ['Add a new material', 'Discover', ['home', 'intake', 'reading', 'extracted', 'request']],
  ['Find the right suppliers', 'Source', ['requirements', 'searching', 'suppliers', 'compare', 'approval']],
  ['Review and approve samples', 'Source', ['home', 'compare', 'request', 'approval', 'approved']],
  ['Sample arrives', 'Sample', ['tag', 'nfc', 'file', 'tests', 'capture']],
  ['Capture test evidence', 'Test', ['file', 'capture', 'listening', 'captured', 'tests']],
  ['Contextual warning', 'Develop', ['tag', 'file', 'warning', 'evidence', 'alternatives']],
  ['Scale feasibility', 'Scale', ['scale', 'capacity', 'options', 'plan', 'planned']],
  ['Act on a conflict', 'Develop', ['tag', 'warning', 'evidence', 'alternatives', 'setup']],
  ['Run a test', 'Test', ['tests', 'setup', 'running', 'result']],
  ['Review insights and next steps', 'Develop', ['result', 'insights', 'next', 'file']],
  ['Collaborate and share', 'Develop', ['file', 'share', 'recipients', 'shared', 'activity']],
  ['Move to the next phase', 'Develop', ['file', 'nextPhase', 'supplierUpdate', 'activity', 'next']],
  ['Make a decision', 'Develop', ['decision', 'decisionOptions', 'confirm', 'decided']],
  ['Export and document', 'Production', ['export', 'preview', 'formats', 'exported']],
  ['Learn and improve', 'Learn', ['learn', 'insights', 'recommendations', 'library', 'agent']],
]
export const STUDIO_FLOWS: Flow[] = definitions.map(([title, phase, ids], i) => ({
  id: `flow-${String(i + 1).padStart(2, '0')}`, title, phase, reference: i + 1,
  scenes: ids.map(id => structuredClone(screens[id])),
}))
STUDIO_FLOWS.push({
  id: 'lifecycle', title: 'The complete lifecycle', phase: 'Overview', reference: 16,
  scenes: (['home', 'extracted', 'suppliers', 'approval', 'tag', 'capture', 'warning', 'setup', 'result', 'share', 'scale', 'options', 'confirm', 'exported', 'library'] as const)
    .map(id => ({ ...structuredClone(screens[id]), hold: 1.8 })),
})
