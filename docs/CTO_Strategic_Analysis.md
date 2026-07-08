# Strategic Project Analysis: Multilingual AI Sign-Language Avatar
## A CTO / PhD Supervisor Review
### Prepared for the SciBlitz AI Challenge 2026 Project Team

---

> **Ground rule**: This document does not repeat the landscape report. It critiques it,
> corrects it, adds what it missed, and replaces its roadmap with one that has a higher
> probability of success. Read every sentence as if someone's funding depended on it —
> because your hackathon submission and a year of work do.

---

# PHASE 1 — CRITICAL REVIEW OF THE LANDSCAPE REPORT

## What the Report Gets Unquestionably Right

Five conclusions in the report are so well-grounded in evidence that you should treat them as axioms and not revisit them:

**Axiom 1 — Dictionary playback is the only responsible approach for BdSL right now.**
The neural alternatives (Progressive Transformers, diffusion models) require training data that does not exist for BdSL. Anyone who argues otherwise is either unaware of the BdSL data situation or is proposing a multi-year research program, not a product.

**Axiom 2 — Your avatar will score somewhere between 2.5 and 3.5 out of 5 on Deaf-user comprehension.**
The Quandt (2022) result is the most important single number in your entire project. It is not a discouraging outlier — it is the industry floor for graphical avatars. Plan around it. Your value proposition cannot be avatar quality; it must be synchronized, simplified educational scaffolding.

**Axiom 3 — NMMs are grammatically obligatory, not optional.**
A system without eyebrow raises for questions and head-shakes for negation is not signing BdSL. It is performing hand movements. The report correctly identifies this as a differentiator most dictionary systems skip. It is cheap to implement at rule-based level and disproportionately increases linguistic credibility.

**Axiom 4 — BdSL has no usable motion corpus and no standardized gloss notation.**
The Bangla-SGP paper (arXiv 2511.08507) is a seed, not a foundation. The single-annotator limitation is not a footnote — it means every BdSL gloss your system produces is essentially unvalidated until a Deaf BdSL community member verifies it.

**Axiom 5 — Synchronization is tractable and is your real differentiator.**
WhisperX timestamps plus timeline-locked clip scheduling is a solvable engineering problem. The report is correct that this is where your effort should concentrate. But it significantly underestimates how much engineering the edge cases require.

---

## Agreement Table

| Conclusion | Agreement Level | Reason |
|---|---|---|
| Dictionary playback is the only production-ready approach | Full | No BdSL data exists for neural methods |
| Quandt 2022 should anchor expectations | Full | N=191, large effect size, replicated finding |
| NMMs are grammatically required | Full | Well-established linguistics |
| VRM/three-vrm is the right avatar choice | Full | Only option meeting all constraints |
| WhisperX is the right alignment tool | Full | Best accuracy-to-speed trade-off for recorded audio |
| Live mic is materially harder than recorded video | Full | Streaming alignment adds a new category of difficulty |
| BdSL is a research contribution, not solved input | Full | Honest and accurate |
| Fingerspelling fallback is the cardinal sin | Full | Hand Talk's failure mode, well-documented |
| Recruit a Deaf BdSL collaborator immediately | Full | Every system that failed skipped co-design |

---

## Concern Table

| Conclusion | Concern Level | Specific Risk |
|---|---|---|
| "80% clip-dictionary coverage" threshold stated as a planning benchmark | HIGH | This number has no empirical basis for BdSL academic content. For a CS lecture, 30–80 signs may cover 20–40% of content words, not 80%. The threshold is correct in spirit but may create false confidence. |
| Ham2Pose is the "most directly transferable" technique | MEDIUM | Ham2Pose is trained on HamNoSys for European sign languages. BdSL has no HamNoSys transcription set. Transferability requires first building that resource, which is itself a multi-month research task. |
| "Few-shot prompting with Bangla-SGP" will produce correct BdSL gloss | HIGH | Bangla-SGP has 1,000 human-annotated pairs from ONE annotator. LLM few-shot on a single-annotator seed will propagate that annotator's idiosyncrasies at scale. Output needs community validation before use. |
| Seek/pause handling presented as straightforward | MEDIUM | The report identifies it as a remaining gap but underweights the engineering complexity. A correct seek/pause implementation with buffer management, state reset, and graceful re-entry is 2–3 weeks of focused engineering work. |
| "Rule-based NMMs from LLM syntax tags" implied to be quick | MEDIUM | Correctly identifying whether a sentence is a WH-question, yes/no question, or negation in mixed Bangla-English academic speech requires either reliable dependency parsing or a separate classifier. This is non-trivial. |
| WhisperX Bengali accuracy stated as acceptable with a caveat | HIGH | The caveat is undersold. Bengali forced alignment using wav2vec2 is significantly less mature than English. For academic Bangla with English technical terms code-switched in, word-boundary accuracy may be substantially worse than the reported sub-100ms for English. This must be empirically measured on actual lecture audio before committing to the architecture. |
| Stage timelines (Stage 0 → hackathon, Stage 1 → corpus, Stage 2 → effectiveness study) | HIGH | The compactness of Stage 0 → July 1 is realistic. But Stage 1 → Stage 2 is presented without any time estimate. A formal DHH effectiveness study is a 6–18 month IRB/ethics approval + recruitment + data collection process. Teams that don't plan for this don't execute it. |

---

## Missing Area Table

| Missing Area | Why It Matters | Consequence if Ignored |
|---|---|---|
| **Concrete Bengali ASR validation plan** | The entire synchronization pipeline depends on word-level timestamps. If Bengali timestamps are noisy, the sync engine cannot function correctly. | Sync quality appears fine in English tests, then collapses in Bangla demo. |
| **Fingerspelling strategy** | The report correctly identifies fingerspelling fallback as the cardinal sin but never states what to do instead when a word is long, technical, and has no sign. | Demo falls back to robotic fingerspelling for every CS term, exactly what Hand Talk users complained about. |
| **YouTube access failure handling** | What happens when the video is private, age-restricted, region-blocked, or has no audio track? The current pipeline has no stated fallback. | Demo breaks on 1 in 5 lecture URLs attempted. |
| **API cost and rate-limit planning** | A demo running Groq + OpenAI simultaneously on a 60-minute lecture, especially with multiple judges hammering it on Final Day, will hit rate limits. | Demo fails under concurrent load during the most important test. |
| **Onboarding and trust design** | How does a first-time Deaf user discover the tool, configure it, and trust its output? This is absent from the technical roadmap. | Technical success with zero adoption. |
| **Concrete evaluation instrument** | The report mentions UEQ-S and NASA-TLX as future instruments. But for the hackathon demo, there is no stated plan for measuring whether it actually helps a DHH user. | Judges ask "how do you know it works?" and the team has no answer beyond visual impressiveness. |
| **Sign dictionary creation pipeline** | The report assumes 30–80 signs exist. It does not describe who creates them, in what format, at what quality, or by what validation process. | Dictionary contains signs that BdSL users find unrecognizable or offensive. |
| **Demo failure recovery plan** | No mention of what happens during the Final Day presentation if the live demo fails. | Team stands in front of judges with a broken screen. |

---

# PHASE 2 — WHAT THIS PROJECT REALLY IS

Most teams building this project will describe it as a "sign language avatar system." That framing will cause them to make wrong decisions for 12 months.

Here is what the project actually is:

**This project is a real-time content synchronization and educational scaffolding engine. The avatar is the output modality, not the product.**

Let me be precise. A student using your system has one problem that overrides all others: *"The professor is speaking right now, and I cannot follow what they are saying."* That problem is solved by three things in priority order:

1. **Accurate, real-time captions** — text that arrives within 2 seconds of the spoken word and is sufficiently accurate to be trusted
2. **Simplified language** — the same content restructured so a DHH student reading a second language (written Bengali) does not need to re-parse academic prose
3. **Synchronized signing** — sign content that corresponds to what is being said *right now*, not what was said 5 seconds ago

The avatar is the delivery mechanism for item 3. It is the least important of the three items. This is counterintuitive to builders. It is correct.

The implication: **a broken avatar with perfect sync is worth more than a beautiful avatar with poor sync.** If you must choose between polishing the avatar and nailing the synchronization, always choose sync.

**What users are actually paying you to solve** (even though it's free): *"Give me the same lecture as my hearing classmate."* Not "give me an impressive 3D animation." Not "show me the technological frontier." Give me the lecture content, on time, in a form I can understand. That is the product.

This reframing has five immediate consequences:

1. Captions are not a supporting feature — they are co-equal with the avatar as a primary output
2. Simplification quality is not cosmetic — for DHH students reading Bengali as a second language, simpler text directly increases comprehension
3. The avatar's signing does not need to be perfect — it needs to be timely and linguistically credible (NMMs present, transitions smooth, no fingerspelling collapse)
4. Live microphone mode is not a core feature — it is an advanced mode that requires solving a materially harder synchronization problem
5. Every engineering decision should be evaluated against the question: "Does this make it more likely that the student follows the lecture in real time?"

---

# PHASE 3 — FAILURE ANALYSIS: TOP 20 REASONS THE PROJECT FAILS

Ranked by probability. Read each one as a post-mortem written from the future.

---

**Rank 1 — The team spends disproportionate time on avatar quality and runs out of time to build reliable synchronization.**

*Why it happens:* Avatar work is visible, exciting, and produces screen-grabbable progress. Sync work is invisible, tedious, and produces a state machine that nobody photographs. The team naturally drifts toward the visually rewarding work.

*Warning sign:* You are spending more time in Blender than writing the sync engine. The avatar looks better every week but you have not yet stress-tested seek/pause behavior.

*Prevention:* Make synchronization the only exit criterion for every sprint through Phase 2. The avatar cannot be improved until sync passes a defined test suite.

---

**Rank 2 — Bengali/Bangla ASR word timestamps are too noisy for the sync engine, and this is discovered during the demo.**

*Why it happens:* The team tests synchronization on English YouTube lectures during development. Bengali timestamp quality is worse, but this is never measured on actual Bangladeshi academic speech with code-switching. The gap is discovered during the Final Day demo.

*Warning sign:* You have not yet run WhisperX on a real CS lecture recording from a Bangladeshi university and measured the word-level timestamp accuracy.

*Prevention:* Within the first two weeks, obtain three real lecture audio clips from Bangladeshi universities (in Bangla, English, and mixed), run WhisperX, and measure average word-boundary error against manually annotated timestamps. If error exceeds 300ms, apply a global buffer offset. If it exceeds 1 second for Bangla portions, you need a different alignment strategy for those segments.

---

**Rank 3 — No Deaf BdSL user ever evaluates the system, so gloss quality and sign recognizability are unknown until after submission.**

*Why it happens:* Finding and scheduling time with a Deaf BdSL user feels difficult and uncertain, so it keeps getting deferred. The team convinces itself that a technically correct implementation is sufficient validation.

*Warning sign:* It is June 20 and no Deaf user has seen your system.

*Prevention:* Contact at minimum one of the following within the first 10 days: BUET Deaf student support, Dhaka University disability office, National Federation of the Deaf Bangladesh, or a BdSL interpreter training program. One 20-minute session where a Deaf person watches your avatar and rates comprehension is worth two weeks of technical work.

---

**Rank 4 — The sign dictionary covers too small a proportion of the target lecture domain.**

*Why it happens:* The team creates 30–80 "general educational" signs (LEARN, TEACHER, STUDENT, etc.) that do not match the specific vocabulary of the lecture domain they are demoing. In a CS lecture, "compiler," "memory allocation," "stack overflow," and "cache miss" are central. None of these are in a general dictionary.

*Warning sign:* Your demo lecture contains words in the first five minutes that have no sign in your dictionary.

*Prevention:* Pick ONE lecture video for your demo before building the dictionary. Extract the top 100 content words from that lecture. Build signs for those 100 words first. Then expand only if time permits.

---

**Rank 5 — Live microphone mode is attempted too early and destabilizes the entire demo.**

*Why it happens:* Live mic feels like the more impressive feature. The team adds it before the recorded-video pipeline is robust, introducing streaming alignment bugs, latency spikes, and buffering failures that corrupt the demo for both modes.

*Warning sign:* You are working on live mic before you have tested the YouTube mode for 30 continuous minutes without a sync failure.

*Prevention:* Lock live mic as a stretch goal, explicitly, in writing, and do not open that work item until the recorded-video path passes a 30-minute continuous test with seek/pause.

---

**Rank 6 — Gloss generation produces English-order gloss for Bangla input, which is grammatically wrong and visible to any BdSL user.**

*Why it happens:* The LLM few-shot examples from Bangla-SGP are few (1,000 pairs) and the LLM defaults to SVO word order under pressure from its English training distribution. The team does not validate gloss order with a BdSL speaker.

*Warning sign:* Your gloss output for "Is this a compiler?" reads as COMPILER IS THIS? rather than THIS COMPILER? (topic-comment structure).

*Prevention:* Include explicit BdSL grammar rules in the system prompt alongside Bangla-SGP few-shot examples. Have any BdSL-aware collaborator review 20 generated gloss sequences before committing.

---

**Rank 7 — Animation transitions are visibly jerky and the avatar loses credibility in the demo.**

*Why it happens:* The crossfade blending between GLB clips is not tuned. Blend duration is too short (snapping) or too long (smearing two signs together). This is the "jumping" problem described in the engineering documents.

*Warning sign:* When you watch the avatar for 30 seconds continuously, you notice the transitions rather than the signs.

*Prevention:* The correct blend duration is approximately 40% of the shorter sign's duration, capped at 300ms. Do not use a fixed blend duration. Implement adaptive blending before the demo.

---

**Rank 8 — The system cannot recover from a YouTube URL that doesn't work, and the demo dies in front of judges.**

*Why it happens:* No error handling for unavailable videos, age-restricted content, private videos, or geoblocked lectures.

*Warning sign:* You test only with your own saved YouTube URLs and assume all URLs work.

*Prevention:* Always have a local fallback video file that plays identically to the YouTube mode. Test the demo with the fallback version. During the Final Day presentation, use the local file, not a live YouTube stream.

---

**Rank 9 — API rate limits or costs spike during the demo under concurrent judge access.**

*Why it happens:* Multiple judges are clicking "try it" simultaneously. Groq + OpenAI sequential calls per request, each with full transcript processing, exceed rate limits.

*Warning sign:* You have not stress-tested the API pipeline with 3 simultaneous requests.

*Prevention:* Cache all processed outputs aggressively. Once a lecture has been processed (WhisperX + LLM), store the result and never reprocess. Implement a simple in-memory cache keyed on video URL.

---

**Rank 10 — NMMs are not implemented and the avatar looks linguistically robotic to Deaf evaluators.**

*Why it happens:* NMMs are treated as a Phase 2 feature because the team focuses on hand movement first. They are never prioritized.

*Warning sign:* Your avatar maintains the same neutral face throughout an entire lecture, including questions and negations.

*Prevention:* Rule-based NMMs take one developer 3–5 days. Before any avatar polish work, implement: eyebrows up on sentences ending in "?", head-shake triggered by negation words. These two rules alone raise linguistic credibility substantially.

---

**Rank 11 — Concept card fallback is not graceful, and users see a jarring error state instead of helpful content.**

*Why it happens:* The fallback is designed as a technical placeholder ("no sign found") rather than as a first-class UI element ("here is what this word means").

*Warning sign:* Your fallback shows a generic message rather than an AI-generated explanation of the specific unknown term.

*Prevention:* Pre-generate concept cards for all words in your target lecture domain's vocabulary that fall outside your sign dictionary. Cache them. Treat the concept card as a designed experience, not an error state.

---

**Rank 12 — The team has no evaluation plan and cannot answer "how do you know this helps DHH students?" to judges.**

*Why it happens:* Evaluation is treated as future work. Judges at a competition focused on real-world impact will ask this question. "We believe it will help" is not an answer.

*Warning sign:* It is one week before submission and you have no user study data, not even informal ratings.

*Prevention:* Conduct a minimum viable evaluation: 3–5 participants (Deaf, HoH, or hearing users learning sign language) watch the same lecture segment with and without your application, then rate their confidence in understanding the content on a 5-point scale. Even N=3 with a directional improvement is better than no data.

---

**Rank 13 — Loading time is too long and the demo stalls before it begins.**

*Why it happens:* 12MB VRM model + 80 GLB animation clips + WhisperX processing + LLM call must all complete before the avatar appears. On a slow conference WiFi connection, this can take 30–60 seconds.

*Warning sign:* You have never tested your demo on a mobile hotspot or a slow corporate WiFi network.

*Prevention:* Preload the VRM and all sign clips on page load in the background. Display a progress bar. The LLM processing and WhisperX alignment can be pre-computed and cached for your demo lecture. The demo should be essentially instant for any URL you have pre-processed.

---

**Rank 14 — The demo video script focuses on technical architecture rather than human impact.**

*Why it happens:* The team knows the technical work deeply and naturally gravitates toward explaining it. Judges watching the demo video see architecture diagrams instead of a Deaf student understanding a lecture.

*Warning sign:* Your demo video mentions "16-step pipeline" before showing the product in use.

*Prevention:* The first 30 seconds of the demo video must show a Deaf student's problem, not your solution. Show the lecture. Show the student confused. Then show the application working. Lead with human impact, not technical depth.

---

**Rank 15 — CORS or YouTube embedding issues prevent the video from playing in the demo environment.**

*Why it happens:* YouTube embeds via iframe have CORS restrictions. Attempting to directly access YouTube audio streams via yt-dlp in a browser-side application violates YouTube's ToS and may be blocked. Many judges will access the demo from corporate or university networks with restrictive firewalls.

*Warning sign:* Your demo uses a direct YouTube URL that requires backend audio extraction, and you have not tested it from a network other than your own.

*Prevention:* Architecture should always extract audio server-side (via a backend endpoint) and never attempt browser-side YouTube access. The demo URL should be a link to your web application, not a YouTube embed.

---

**Rank 16 — WhisperX is used for Bengali but its Bengali acoustic model produces incorrect word boundaries that corrupt synchronization.**

*Why it happens:* WhisperX uses wav2vec2 for phoneme-level forced alignment. wav2vec2's Bengali model is trained on less data than its English equivalent. For academic Bangla with code-switched English terms, the model may struggle with phoneme boundaries of English words spoken with a Bengali accent.

*Warning sign:* In your test runs, English technical terms in a Bangla lecture are timestamped several seconds late or early.

*Prevention:* Test separately on three language conditions: pure English lecture, pure Bangla lecture, mixed code-switching lecture. If code-switching causes drift, implement a language-detection step that applies different alignment parameters to English versus Bangla segments.

---

**Rank 17 — BdSL signs in your dictionary are unrecognizable to actual BdSL users because they were created from general sign language resources rather than BdSL-specific sources.**

*Why it happens:* The team cannot find BdSL reference videos and uses ASL or ISL resources as proxies, assuming signs are similar. BdSL is a distinct language. Many signs differ significantly from neighboring sign languages.

*Warning sign:* Your sign for "understand" was created from an ASL reference. A BdSL user does not recognize it.

*Prevention:* Every sign in your dictionary needs to be sourced from BdSL-specific material: a Deaf BdSL user's demonstration, a BdSL school resource, or an NFDB (National Federation of the Deaf Bangladesh) material. If BdSL-specific source is unavailable, mark the sign as "unvalidated" in your dictionary and display a label when it is shown.

---

**Rank 18 — The team tries to support both Bangla and English at equal quality and delivers mediocre performance in both.**

*Why it happens:* The project spec says "bilingual." Attempting bilingual at full quality doubles scope. Bangla ASR, Bangla simplification, Bangla gloss, and Bangla NMMs each have their own difficulty multiplier.

*Warning sign:* Two weeks before submission you are still debugging Bangla gloss generation while English sync is also unstable.

*Prevention:* For the hackathon, define English-primary (with Bangla lecture support as a demonstrated bonus). Perfect English-mode pipeline first. Bangla mode is a research contribution narrative, not a required demo feature.

---

**Rank 19 — The avatar model's finger rigging is insufficient for distinct BdSL handshapes.**

*Why it happens:* The 124-bone VRM model has per-finger joints but the GLB animation clips were created with approximate handshapes rather than linguistically precise ones.

*Warning sign:* When you compare your avatar's handshapes to reference BdSL video side by side, the hands look similar in shape but the finger configurations are consistently approximate rather than precise.

*Prevention:* Pick 10 signs from your dictionary that have distinct handshapes. Export those animations and compare the rendered handshapes to reference video for each sign. If more than 3 are clearly incorrect to a non-signer, the animation quality needs attention.

---

**Rank 20 — The GitHub repository shows no commits during the competition window, violating the rules and causing disqualification.**

*Why it happens:* The team's primary developer works in a private fork and forgets to push to the public competition repository.

*Warning sign:* You have not checked the competition repository's commit history this week.

*Prevention:* Set a daily reminder to push to the public repository. The rulebook specifies that repositories with no commits between May 14 and July 1 will be flagged. This is a zero-effort compliance item.

---

# PHASE 4 — THE SINGLE BEST ROADMAP

Starting from Day 1 of active work. All phases before the July 1 hackathon deadline are called Sprint phases. Post-hackathon phases are called Research phases.

---

## Sprint 0: Foundations and Constraints (Days 1–5)

**Objective:** Lock down every ambiguous decision before writing one line of production code. Teams that skip this phase relitigate these decisions under pressure in Week 4.

**Why it matters:** Every hour spent debating scope in Week 4 is worth 10 hours of that debate in Week 1.

**Decisions to lock:**
- ONE lecture domain for the demo (e.g., Introduction to Operating Systems, or Introduction to Biology). Not "any academic lecture." One specific lecture.
- ONE primary language mode: English-heavy mixed Bangla (not full Bangla, not full English, but the realistic code-switching mode of a Bangladeshi university CS lecture)
- NO live microphone until recorded-video mode passes a 30-minute continuous test
- NO neural sign generation regardless of timeline pressure
- The 5-minute demo video will show a Deaf student problem, not a pipeline diagram

**Deliverables:**
- Written product spec: one A4 page, maximum
- One real lecture audio clip (15–20 minutes) downloaded from a Bangladeshi university YouTube channel or obtained from a course recording
- WhisperX run on that audio, with manual spot-check of 20 word timestamps, error rate documented
- Contact initiated with at least one Deaf BdSL speaker

**Validation criteria:** Every team member can describe in 30 seconds what the demo will show, and it matches the written spec.

**Exit criteria:** Written spec exists, lecture audio is in hand, timestamp quality is measured.

**Risk:** The team resists scope locking and argues for broader ambition. Address this by calculating how long each additional feature would take and comparing it against the remaining calendar days.

---

## Sprint 1: Synchronization Engine (Days 6–20)

**Objective:** Build a synchronization engine that is correct and robust before touching the avatar rendering layer. This sprint produces a text-only demonstration of synchronization — captions aligned to video, with seek/pause working correctly.

**Why it matters:** The sync engine is the spine of the entire system. If it drifts, the avatar is wrong. If seek breaks it, the demo fails in front of judges. It must be tested independently of the avatar before the avatar is added.

**Architecture:**
The sync engine receives a sorted array of timestamped gloss entries — `{startTime, endTime, gloss, animationKey}` — and drives a display based on the HTML5 video element's `currentTime`. It uses binary search (O(log n)) to find the active entry every frame. It handles pause by freezing display, seek by resetting state and re-evaluating at the new timestamp, and speed changes by recalculating blend durations.

**Deliverables:**
- Working sync engine driving a caption overlay against the target lecture video
- Seek/pause tested explicitly: seek to 10 different timestamps, measure re-sync latency
- A 30-minute continuous run with no sync drift exceeding 2 seconds at any measured point
- Document the actual WhisperX timestamp error for your specific lecture audio

**Validation criteria:**
- A hearing person watching the synchronized caption overlay (audio off) says the captions feel "live" and correctly correspond to the video at all tested timestamps
- Seek to minute 15 of a 20-minute video: caption correct within 3 seconds
- Pause at minute 7, wait 30 seconds, resume: caption resumes correctly

**Exit criteria:** All three validation criteria pass. No exceptions.

**Risk:** Sync looks fine on a 5-minute clip but drifts on a 20-minute lecture. Always test on full-length content.

---

## Sprint 2: Avatar Integration (Days 21–35)

**Objective:** Replace the caption-only sync output with a VRM avatar performing sign animations from the dictionary. The sync engine is NOT changed in this sprint — only the rendering layer is added.

**Why it matters:** Adding the avatar on top of a working sync engine is a controlled, testable operation. Adding sync and avatar simultaneously makes failures impossible to diagnose.

**Deliverables:**
- VRM model loaded in Three.js scene, correctly positioned
- 30–80 sign clips loaded and playable via AnimationController
- Crossfade blending implemented with adaptive duration (40% of shorter sign, capped at 300ms)
- Idle/neutral pose between signs
- Avatar display does not affect sync engine operation (rendering runs in same rAF loop, mixer updates independently)

**Validation criteria:**
- Every sign in the dictionary plays without visible snap transitions
- Transitions between any two adjacent signs in the dictionary are smooth (not obviously mechanical)
- The video and avatar can be paused/seeked without the avatar freezing or playing the wrong sign

**Exit criteria:** All three validation criteria pass. Dictionary coverage for the target lecture measured and documented.

**Risk:** Crossfade blending is incorrectly tuned, producing smearing (too long) or snapping (too short). Fix before proceeding.

---

## Sprint 3: NMM and Gloss Quality (Days 36–49)

**Objective:** Add rule-based NMMs and validate LLM gloss generation quality for BdSL.

**Why it matters:** NMMs differentiate your system from every other dictionary-playback system. Even simple rule-based NMMs (question eyebrows, negation head-shake) are linguistically significant and visually credible. Gloss validation cannot wait until after submission.

**NMM implementation:**
Three rules, implemented in order of linguistic importance:
1. If the simplified sentence ends with "?", raise eyebrows for the duration of the final sign
2. If the simplified sentence contains a negation word (not, no, never, নয়, না), add a subtle head-shake synchronized with the signing of that clause
3. If a concept card is being shown (fallback), shift to a slightly confused/attentive expression

**Gloss validation:**
Schedule a 20-minute session with your BdSL collaborator. Show them the avatar performing 20 generated glosses (mix of questions, statements, and negations). Record ratings: 1 = unrecognizable, 2 = wrong but guessable, 3 = approximately correct, 4 = correct, 5 = natural. Document results.

**Deliverables:**
- NMM module integrated with expression controller
- 20 gloss sequences rated by BdSL collaborator, mean score documented
- At minimum 5 signs corrected based on BdSL collaborator feedback
- Bangla-SGP few-shot examples added to LLM prompt with verified BdSL grammar rules

**Validation criteria:**
- Mean gloss comprehension rating from BdSL collaborator ≥ 3.0/5
- Question sentences visibly produce raised eyebrows in the avatar
- Negation sentences visibly produce head-shake in the avatar

**Exit criteria:** Both validation criteria pass. If mean gloss rating is below 3.0, gloss prompting must be revised before proceeding.

**Risk:** BdSL collaborator finds that multiple signs in the dictionary are unrecognizable. Prioritize replacing the lowest-rated signs before adding new ones.

---

## Sprint 4: Polish, Evaluation, and Submission (Days 50–62)

**Objective:** Make the system demo-stable, conduct a minimum viable user evaluation, record the demo video, and complete all submission deliverables.

**Why it matters:** A broken demo at Final Day is worse than a limited demo that works reliably. This sprint is about reducing surface area to what you can defend, not about adding features.

**Non-negotiables for this sprint:**
- Pre-process and cache the demo lecture URL so it loads in under 5 seconds
- Test the full demo on three different devices (your laptop, a mid-range laptop, a weak WiFi connection)
- Prepare the local fallback video that mirrors the YouTube demo exactly
- Record the demo video: human problem first, then solution, then brief limitation acknowledgment, then impact statement

**Minimum viable evaluation:**
3–5 participants watch a 5-minute lecture segment: first with captions only, then with your full system. Rate comprehension confidence after each. Document the results. Even informal data is better than none.

**Deliverables:**
- Demo video (3–5 minutes), uploaded to YouTube (unlisted)
- Project report (8 pages maximum): structure per rulebook
- Model and data card
- GitHub repository: public, README complete, commits documented
- Deployed public URL on Vercel/Render: tested the morning of July 9

**Exit criteria:** Every required submission deliverable exists. Demo has been run successfully on two different machines without failure.

---

## Research Phase 1: BdSL Corpus and Notation (Months 2–6 post-hackathon)

**Objective:** Build the foundational resource that makes everything else possible — a BdSL gloss notation standard for academic content and a continuous signing video corpus.

**Why it matters:** This is the precondition for every more ambitious technical contribution. Without it, you are building on sand.

**Deliverables:**
- A BdSL academic vocabulary notation set for 200–500 signs in at least two domains
- A small continuous signing video corpus: 10–20 Deaf BdSL signers, each signing 50–100 sentences on academic topics
- Published dataset (arXiv or ACL Anthology) with data statement, community attribution, and ethical review documentation

---

## Research Phase 2: Effectiveness Study and Mocap Integration (Months 6–12)

**Objective:** Prove that the system helps DHH students and begin the upgrade path from clip playback to motion-capture-based signing.

**Why it matters:** Without an effectiveness study, this is an engineering project. With one, it becomes publishable research.

**Deliverables:**
- Formal IRB/ethics approval and Deaf-user study (N≥15): comprehension pre/post, UEQ-S satisfaction, NASA-TLX load
- First submission to ACM ASSETS or SLPAT
- Mocap pipeline for converting Deaf BdSL signer recordings to avatar bone rotations

---

# PHASE 5 — PRIORITY MATRIX

## Component Ratings

| Component | Importance (1–10) | Risk (1–10) | Cost (effort) | Research Maturity | Impact on DHH Users |
|---|---|---|---|---|---|
| Captions | 10 | 5 | Low | High | Direct, immediate |
| Synchronization | 10 | 8 | Medium | Medium | Foundational — without it, nothing else works |
| Gloss generation | 8 | 8 | Medium | Emerging | High if correct, misleading if wrong |
| Sign dictionary quality | 9 | 6 | High (time) | Low for BdSL | High — unintelligible signs destroy trust |
| Smooth animation blending | 7 | 5 | Low | High | Medium — affects credibility |
| Facial expressions / NMMs | 8 | 5 | Low-Medium | Partial | High — changes linguistic meaning |
| Text simplification | 8 | 3 | Low | High | High — direct accessibility |
| Bangla adaptation | 9 | 10 | Very High | Nascent | Essential for primary users, highly risky |
| Avatar visual quality | 4 | 3 | Medium | High | Low — proven by Quandt 2022 |
| Live microphone mode | 6 | 9 | Very High | Emerging | Important long-term, dangerous short-term |
| Educational evaluation | 9 | 2 | Medium | High | Critical for credibility and publication |
| User testing / co-design | 10 | 2 | Low | High | Prevents building the wrong thing |

---

## The Four Critical Judgments

**The most important component: Synchronization.**
If sync is wrong, every other component is irrelevant. A user cannot benefit from correct gloss displayed at the wrong time. Every other component depends on sync being correct first.

**The most dangerous component: Bangla adaptation.**
Risk 10. This component depends on ASR accuracy that is genuinely uncertain for academic Bangla code-switching, gloss generation quality that depends on a single-annotator seed dataset, and sign production that has no validated BdSL corpus behind it. Every component of the Bangla pipeline contains an unquantified error source. Scope it explicitly as a research contribution, not a production feature.

**The most underestimated component: Educational evaluation.**
Teams consistently underprioritize this. Judges at SciBlitz AI Challenge evaluate Real-world Impact & Relevance at 20% weight. "We believe this helps DHH students" scores much lower than "We measured comprehension improvement in 5 sessions and found X." Evaluation is cheap and high-return. Do not defer it to future work.

**The component most likely to delay the project: Seek/pause synchronization correctness.**
This is consistently underestimated by everyone building video+avatar systems for the first time. Handling the state machine correctly for all combinations of pause, resume, seek-forward, seek-backward, and speed-change takes 2–3 weeks of careful engineering. Teams that discover this in Week 6 run out of time.

---

# PHASE 6 — RESEARCH GAP ANALYSIS

## Problems That Are Solved

| Problem | Current State | Note |
|---|---|---|
| Speech-to-text (English) | Fully solved — Whisper achieves near-human accuracy | No action required |
| Text simplification via LLM | Solved — GPT-4o/Claude handles this reliably | Quality depends on prompt engineering |
| Pre-baked clip playback in Three.js | Solved — AnimationMixer + crossFadeTo() | Implementation exists and is documented |
| VRM rendering in browser | Solved — @pixiv/three-vrm is mature | Finger rigging detail is a concern but manageable |
| Word-level timestamps for English recorded audio | Solved — WhisperX sub-100ms accuracy | Bengali quality requires independent verification |
| Blendshape-based facial expressions on VRM | Solved — ARKit-style 52 blendshapes are standard | Timing co-articulation remains hard |
| Timeline-locked scheduling for recorded video | Solved — clip scheduler against video.currentTime | Seek/pause requires careful design |
| Caption display UI | Solved — well-established patterns | Nothing novel required |

---

## Problems That Are Mostly Solved

| Problem | Current State | Remaining Gap |
|---|---|---|
| Smooth animation blending between discrete clips | Solved-ish — Three.js crossFadeTo() with warp | Tuning adaptive blend duration requires experimentation; co-articulation artifacts remain |
| LLM gloss generation for English → sign order | Mostly solved for English | BdSL-specific grammar rules need validation with a native signer |
| Seek/pause handling in sync engine | Solvable with correct state machine | Requires explicit engineering; not automatic from any library |
| Rule-based NMM triggering from text | Mostly solved — syntactic rules well-understood | Parsing mixed Bangla-English requires robust language detection |
| Concept card fallback for unknown signs | Mostly solved — LLM generates explanations reliably | Visual integration and graceful display need design attention |

---

## Problems That Are Partially Solved

| Problem | Current State | What Remains Unsolved |
|---|---|---|
| ASR for academic Bengali with code-switching | Whisper supports Bengali; accuracy significantly lower than English | Word-boundary accuracy on real Bangladeshi academic speech with English technical terms is unmeasured and likely problematic |
| BdSL gloss generation | Bangla-SGP provides 1,000 pairs; LLM few-shot is feasible | Single-annotator bias; BdSL grammar rules not formally documented; quality unverified at scale |
| Streaming alignment for live microphone | WhisperX handles file-based alignment; streaming is harder | Incremental alignment with <500ms latency is engineering-feasible but requires careful design |
| Catch-up/skip policy when signing falls behind speech | Principle understood (Signvrse: simpler sign sooner) | No formal algorithm; time-compression heuristics require empirical tuning |
| NMM timing and co-articulation | Blendshape rendering is solved; rule triggers are partially solved | Onset/offset timing relative to manual sign duration is an open problem for automatic generation |

---

## Open Research Problems

| Problem | Current State | Why It Matters for Your Project |
|---|---|---|
| BdSL continuous signing corpus | Does not exist | Blocks all neural methods; limits dictionary to manually-authored clips |
| BdSL standardized gloss notation | Does not exist | Makes automatic gloss validation impossible; BdSL grammar cannot be systematically evaluated |
| Automatic NMM co-articulation timing | Active research (Saunders adversarial multi-channel, 2020) | Without it, NMMs are either always-on (wrong) or rule-triggered at fixed points (approximate) |
| Sign summarization when signing falls behind | Genuinely unsolved | Enables correct real-time sync even when a lecture is faster than signing speed |
| Objective educational effectiveness of BdSL avatar | No published study exists | This is simultaneously a gap in the literature and your most significant publishable contribution |
| Novel BdSL sign generation without corpus | Requires BdSL motion data that does not exist | Cannot be addressed until Research Phase 1 delivers a corpus |

---

# PHASE 7 — TOP 30 PAPER READING ROADMAP

---

## Tier 1: Must Read This Month (Before July 1)

**1. Bain, Huh, Han & Zisserman, "WhisperX: Time-Accurate Speech Transcription of Long-Form Audio" (Interspeech 2023)**
*Why:* WhisperX is your synchronization engine's core. You need to understand its accuracy, failure modes, and Bengali model limitations before building against it.
*What you will learn:* How VAD pre-segmentation + phoneme-level forced alignment achieves word-level timestamps; where accuracy degrades; batched inference requirements.
*Project challenge addressed:* Synchronization (Sprint 1).

**2. Quandt, Willis, Schwenk, Weeks & Ferster, "Comparing Sign Language Avatar Technologies" (Frontiers in Psychology 13:730917, 2022)**
*Why:* This paper contains the single most important number for your project. You need to know it deeply enough to explain it to judges and use it to shape your evaluation plan.
*What you will learn:* Exact comprehension and naturalness ratings for CS avatar vs. mocap avatar vs. human signer; the fluency-sensitivity effect (native signers are harsher than non-signers); what "creepiness" ratings mean for avatar design.
*Project challenge addressed:* Avatar quality expectations; evaluation instrument design.

**3. Bangla-SGP paper (arXiv 2511.08507, 2025)**
*Why:* This is the only BdSL gloss resource in existence. You need to know its contents, its limitations (single annotator), and how to use it for few-shot LLM prompting.
*What you will learn:* BdSL sentence→gloss pair examples; augmentation methodology; what gloss conventions the annotator used.
*Project challenge addressed:* Gloss generation quality (Sprint 3).

**4. Bragg et al., "Sign Language Recognition, Generation, and Translation: An Interdisciplinary Perspective" (ASSETS 2019, Best Paper)**
*Why:* This is the field map. 12 authors from the best labs. It tells you what is solved, what is hard, and what requires Deaf community co-design. Read it before your next team meeting.
*What you will learn:* The full SLR/SLT/SLP pipeline; why "all parts of current pipelines currently require human intervention"; co-design imperative.
*Project challenge addressed:* Project framing, failure prevention.

**5. Shalev-Arkushin, Moryossef & Fried, "Ham2Pose: Animating Sign Language Notation into Pose Sequences" (CVPR 2023)**
*Why:* This is the most transferable research recipe for BdSL generalization. Language-invariant by design. Study its methodology even if you cannot apply it yet.
*What you will learn:* How HamNoSys notation maps to pose sequences; weak supervision training; nDTW evaluation metric.
*Project challenge addressed:* Long-term BdSL vocabulary generalization roadmap.

**6. Saunders, Camgoz & Bowden, "Progressive Transformers for End-to-End Sign Language Production" (ECCV 2020)**
*Why:* The canonical neural SLP paper. You need to understand what the SOTA approach produces and why you are not using it, so you can answer judge questions confidently.
*What you will learn:* Counter-decoding technique; what "regression-to-mean" means in practice; why neural SLP produces under-articulated output.
*Project challenge addressed:* Justification for dictionary approach over neural approach.

**7. Moryossef, "Real-Time Multilingual Sign Language Processing" (PhD thesis, Bar-Ilan, 2023)**
*Why:* Systems-level, real-time, multilingual — the framing closest to yours. Read the pipeline overview and the avatar lineage chapters.
*What you will learn:* End-to-end architecture mental model; JASigning/CWASA/PAULA survey; real-time constraints in sign language systems.
*Project challenge addressed:* Architecture design; synchronization design.

**8. Marschark, Convertino & LaRock, "Optimizing Academic Learning by Deaf and Hard-of-Hearing Students" (JDSDE 2006)**
*Why:* This study found that real-time text alone outperformed sign interpreting in some conditions, yet all conditions left Deaf students below hearing peers. This is the most important educational context paper for your project.
*What you will learn:* The actual educational effectiveness evidence base; why students overestimate their own comprehension; what "below hearing peers" means across modalities.
*Project challenge addressed:* Project framing; evaluation design; managing expectations.

---

## Tier 2: Must Read This Semester (Before Research Phase 1)

**9. Rastgoo, Kiani & Escalera, "A Survey on Recent Advances in Sign Language Production" (ESWA 2023)**
*Why:* Best comprehensive SLP survey. Covers everything from HamNoSys to diffusion models.
*What you will learn:* The full taxonomy of SLP methods; where each approach stands in research maturity; evaluation metrics used in the field.

**10. Saunders et al., "Adversarial Training for Multi-Channel Sign Language Production" (BMVC 2020)**
*Why:* Shows how adding a discriminator measurably improves NMM output quality. Directly relevant to your long-term NMM generation ambitions.
*What you will learn:* Multi-channel SLP with face + hands; adversarial training for non-manual features; comprehension improvement from NMMs.

**11. Baltatzis et al., "Neural Sign Actors: A Diffusion Model for 3D Sign Language Production from Text" (CVPR 2024)**
*Why:* Current 3D SOTA. Read it to understand where the field is heading and what data requirements make it infeasible for BdSL today.
*What you will learn:* Diffusion-based SLP architecture; what "4D signing avatars" means; why this requires a large curated dataset.

**12. Kipp, Heloir & Nguyen, "Sign Language Avatars in Animation and Virtual Reality" (IVA 2011)**
*Why:* "Delta testing" methodology for avatar comprehension evaluation. This gives you a validated evaluation protocol you can apply to your own system.
*What you will learn:* How to measure avatar comprehension change ("delta") before/after exposure; concrete evaluation design.

**13. Ebling & Glauert, "Exploiting the Full Potential of JASigning to Build an Avatar Signing Train Announcements" (Univ. Access Inf. Soc. 2016)**
*Why:* Concrete avatar design pitfalls from a real deployment. Clothing color, eye gaze, fingerspelling speed — all documented.
*What you will learn:* What Deaf users complain about in practice; specific design choices that improve or harm acceptance.

**14. Alibaba XR Lab, "A Speech-Driven Sign Language Avatar Animation System" (IJCAI 2022)**
*Why:* Architecturally the closest published analog to your goal. Speech in, avatar out, with facial synthesis.
*What you will learn:* Production-oriented full pipeline design; gloss motion retrieval and editing; lip movement generation; sync architecture.

**15. Islam et al., "Ishara-Lipi: Development of Isolated Bangla Sign Language Character Dataset" (ICBSLP 2018)**
*Why:* Foundation paper for BdSL computer vision research. Understand what data exists and what methodology was used.
*What you will learn:* BdSL character set; dataset construction methodology; baseline recognition accuracy.

**16. SignON consortium, "Sign Language Technology: Do's and Don'ts" white paper**
*Why:* Ethics and co-design lessons from a €5.6M EU-funded project that ended without a production avatar. Learn from their mistakes.
*What you will learn:* What Deaf community co-design looks like in practice; what "Do's and Don'ts" the consortium identified from 17 research institutions.

**17. Kacorri et al., "Demographic Predictors of American Sign Language App Acceptance" (ASSETS 2015)**
*Why:* Demographic factors that predict technology acceptance among Deaf users. Age of acquisition, fluency, and hearing status each modulate acceptance differently.
*What you will learn:* How to segment your user evaluation by demographic factors; why native signers rate avatars most harshly.

**18. Camgoz et al., "Sign Language Transformers: Joint Sign Language Recognition and Translation" (CVPR 2020)**
*Why:* Joint SLR/SLT model that established transformer architecture as the dominant paradigm. Understand the benchmark even though you won't train it for BdSL.
*What you will learn:* How transformer-based SLP differs from sequence-to-sequence approaches; PHOENIX14T evaluation methodology.

**19. IUT BdSLW60 paper (Islamic University of Technology, BdSLW60 dataset)**
*Why:* 60-word BdSL dataset with MediaPipe + attention BiLSTM classification. One of the largest BdSL word-level recognition resources.
*What you will learn:* Which BdSL words have been computationally studied; MediaPipe landmark extraction methodology for BdSL.

---

## Tier 3: Reference Papers

**20–22. MDM (Tevet et al. 2022), T2M-GPT, MotionGPT**
General motion generation background. Know these exist and why they cannot be applied to BdSL sign generation.

**23–24. SignLLM (Fang et al. 2024) and SignDiff (2023/2025)**
Current neural sign language production SOTA. Understand the evaluation numbers to contextualize why dictionary approach is the correct choice now.

**25. PHOENIX-2014T dataset paper (Cihan Camgoz et al., 2018)**
The canonical SLP benchmark. Know its structure, limitations (weather domain, German SL), and why it is not usable for BdSL.

**26. How2Sign dataset paper (Duarte et al., 2021)**
Best multimodal ASL resource. Understand its structure for future comparison.

**27. Wasserroth et al. (IVA Adjunct, 2025)**
HoloLens-2 avatar study showing less than 50% sentence comprehension. Small sample (N=9) but illustrates the NMM failure mode concretely.

**28. Stinson, Elliot & Kelly, "C-Print Speech-to-Text and Interpreting" (2009/2017)**
Speech-to-text vs. sign interpreting retention comparison. Educational context for your effectiveness claims.

**29. Saunders et al., "Everybody Sign Now / SignGAN" (2020)**
Why industry moved from graphical avatars to photorealistic video. Read to understand the trajectory and why VRM is a pragmatic exception.

**30. SignAvatar/TransportSign technical documentation (Serbia)**
~3–4 second production latency benchmark for a deployed sign language avatar system. Useful as a "what is achievable" reference.

---

# PHASE 8 — PRODUCTION READINESS

## The Four Stages and What Separates Them

### Prototype → MVP

The prototype proves that the pipeline can run end-to-end. It may crash on edge cases, have latency spikes, produce wrong gloss occasionally, and work only on specific test inputs. The team is the only user.

The MVP proves that the pipeline runs reliably for a defined set of inputs that represent real use conditions. Specifically:

- It processes any YouTube video from your target domain without crashes
- Sync stays within 2 seconds for any 20-minute lecture
- Seek/pause works correctly for all tested timestamps
- Unknown signs produce concept cards, not errors
- The application loads in under 10 seconds on a typical laptop

What separates prototype from MVP: **test coverage and error handling.** Every failure mode has a designed response. The fallback system works. The loading experience is acceptable.

### MVP → Research System

The research system proves that the application has measurable educational benefit for DHH users. Specifically:

- At least 5 DHH or HoH participants have been tested using validated instruments
- Comprehension scores, satisfaction ratings, and cognitive load measures are documented
- Sign quality has been rated by a BdSL collaborator and results are documented
- NMMs are implemented and visible to evaluators
- A formal evaluation write-up exists that could support a submission to ASSETS or SLPAT

What separates MVP from research system: **evidence of impact.** The research system can answer the question "does this help DHH students?" with data, not belief.

### Research System → Real Product

The real product serves DHH students reliably, at scale, without requiring the research team to maintain it. Specifically:

- Deaf community co-design validation from at least 20 BdSL users
- Sign dictionary has been community-validated (not just team-created)
- BdSL gloss notation standard has been published and ratified by community members
- System reliability exceeds 99% uptime with graceful degradation under failure
- Multi-domain coverage beyond the initial one-lecture demo
- Educational effectiveness study published with peer review

What separates research system from real product: **community ownership and scale reliability.** A product does not require the creator to be present for it to work.

---

## Ethical Concerns

The following concerns require explicit documentation in the research report and public repository, regardless of hackathon timeline pressure:

**Sign representation ethics:** Every BdSL sign in the dictionary has a source. Document whether that source is community-validated, interpreter-validated, or team-created. Signs without community validation must be labeled as such in the UI ("this sign has not been validated by the BdSL community").

**Comprehension risk:** The application can produce wrong gloss. If a DHH student relies on incorrect information for an exam, the harm is real. The application must make its confidence limits visible. "This system provides educational support. Verify important information with your instructor."

**Data privacy:** If you capture audio from live microphone mode, any speech recognition output contains lecture content and potentially personal speech. Document your data handling policy explicitly.

**Attribution of BdSL:** Bangla Sign Language is the property of the Bangladeshi Deaf community. Building a technology on their language without community involvement is ethically problematic. The project documentation should explicitly name the community and commit to ongoing co-design.

---

# PHASE 9 — IF I WERE THE CTO

## What I Would Do in Year One, Personally Responsible

The following is the unvarnished version. No qualifications, no hedging.

---

### What I Would Do

**In the first two weeks:** I would spend 20% of my working hours finding and meeting Deaf BdSL users. Not "planning to" — actually meeting. I would contact BUET's disability support office, the National Federation of the Deaf Bangladesh, every Deaf school in Dhaka, and post in BdSL community Facebook groups. I would keep meeting people until I had one person who agreed to be a regular collaborator and evaluator. Everything else in weeks 1–2 is secondary to this.

**In weeks 3–6:** I would build the synchronization engine and test it mercilessly on real Bangladeshi lecture audio. I would run WhisperX on 5 different lecture recordings, measure timestamp accuracy, and document every number. I would not touch the avatar rendering until the sync engine passed a 30-minute continuous test on Bengali-heavy audio.

**In weeks 7–10:** I would build the clip dictionary for exactly one lecture — not "educational vocabulary in general," one specific 20-minute lecture that we will demo. I would pick a lecture that is publicly available, commonly taught, and where the key vocabulary is manageable. Introduction to Computer Science concepts. Basic Biology. Something where 60–80 signs cover 70% of the content words.

**In weeks 11–14:** I would add NMMs on day 1 of this sprint and refuse to remove them under any time pressure. They take 3–5 days and the linguistic credibility they add is disproportionate. Then I would spend 2 weeks polishing the crossfade transitions and validating sign quality with the BdSL collaborator.

**In the final 2 weeks before submission:** I would pre-process the demo lecture, cache all outputs, test the demo on 3 different machines including a weak one, record the demo video in one continuous take showing a real human problem first, and write the report starting from impact and ending with methodology.

---

### What I Would Refuse to Build

**Live microphone mode before recorded-video mode is robust.** Full stop. If I heard "but what about live lectures?" I would say: recorded YouTube video is how 90% of students will use this. Live mic is version 2. Shipping live mic before recorded video is solid is how you ship a broken version 1.

**Neural sign generation.** Not because it isn't interesting — it is. But without a BdSL corpus, neural generation will produce outputs that a Deaf user cannot understand. Showing those outputs in a demo would actively damage the project's credibility with the one group whose credibility matters most.

**A photorealistic avatar.** Not because the research doesn't show that photorealistic avatars perform better (it does, Quandt 2022 confirms this). But because the engineering investment to produce a photorealistic web-deployable avatar with correct BdSL handshapes is a multi-year effort. The VRM approach is correct for this stage. Accept the avatar quality ceiling and invest the saved time in synchronization and NMMs.

**Multi-domain support.** Demonstrating mediocre performance across 10 domains is worse than excellent performance in 1 domain. Pick one domain and be excellent.

---

### What I Would Postpone

**Bangla-primary mode.** Not indefinitely — it is essential for the core user population. But English-heavy mixed Bangla is what most Bangladeshi CS lectures actually sound like, and it is significantly more tractable than pure Bangla for the ASR pipeline. Start there. Add pure-Bangla mode when the English-heavy mode is solid.

**Mobile optimization.** Desktop browser first. The core users are students in class with a laptop. Mobile is a real use case but adds layout and performance complexity that should come after the core pipeline is stable.

**Speaker diarization.** It is useful for Q&A sessions but adds a full additional processing stage. It is not necessary for the demo to be impressive.

**Formal IRB ethics approval and large-N study.** Before July 1, you cannot get IRB approval in time for a formal study. Do informal evaluation now (N=3–5, no IRB required in most informal contexts). Plan the formal study for Research Phase 1.

---

### What I Would Validate First

**Before writing one line of sync engine code:** Does WhisperX produce word-level timestamps within 300ms for real Bangladeshi academic audio? Run this test. Document the result. If the answer is no, the synchronization architecture needs rethinking.

**Before building 80 signs:** Does a Deaf BdSL user recognize 7 out of 10 of your first 10 signs? Run this test. If no, the sign quality problem is existential and must be solved before expanding the dictionary.

**Before calling the sync engine done:** After a 30-minute continuous run on the target lecture, is there any point where the avatar is more than 2 seconds behind the spoken word? Measure it with a stopwatch. If yes, the sync engine is not done.

---

### What I Would Measure — The Five Numbers That Determine Project Success

1. **Sync drift at 5-minute intervals:** Measure the seconds between spoken word and avatar sign at minutes 5, 10, 15, 20, 25, and 30. All values should be ≤2 seconds.

2. **Sign recognition rate:** Present 20 signs from the dictionary to the BdSL collaborator without labels. Record what percentage they identify correctly. Target ≥70%.

3. **Gloss comprehension score:** Use the Quandt 5-point scale. Present 10 signed sentences to the BdSL collaborator. Target mean ≥3.0.

4. **Caption word error rate on target lecture:** Compare WhisperX output to manual transcription for a 5-minute segment of the target lecture. Target ≤10% WER.

5. **User comprehension delta:** In a 3-person informal study, compare score on 5 comprehension questions after watching a lecture segment with your system vs. captions only. Any positive delta is publishable as preliminary evidence.

---

### What Would Make This Each Thing

**Hackathon-winning:** Perfect seek/pause synchronization demonstrated live + visible NMMs + one BdSL user quote saying something positive about the signing. The judges who matter most will be impressed by robustness, not by a beautiful avatar that breaks when they touch the seek bar.

**Thesis-worthy:** A formal evaluation (N≥15 DHH participants) using validated instruments (UEQ-S, comprehension questions) showing statistically significant comprehension improvement over captions-only condition. A BdSL vocabulary resource published as an open dataset. A reproducible evaluation methodology other researchers can apply.

**Publishable:** The BdSL gloss corpus + notation proposal is a publishable contribution independent of the system. The educational effectiveness study with DHH students is publishable in ACM ASSETS, the premier accessibility venue. The synchronization architecture with BdSL-specific adaptations is publishable in a systems track. You have three distinct publication paths.

**Startup-worthy:** Evidence of comprehension improvement in ≥50 DHH students over ≥4 weeks of regular use. A community-validated sign dictionary with 200+ signs. A co-design partnership with a Deaf organization (NFDB or equivalent). Revenue model: institutional licensing to universities at BDT X/student/year, individual access free.

**Genuinely useful for DHH students:** One Deaf student using your application every lecture for an entire semester and reporting that they understand their courses better than before. Not a statistic. One person. Named. On record. If you can find that person, your work is done.

---

## The Brutal Final Assessment

Here is what the landscape report does not say directly enough:

**The avatar is not the product.** The product is a synchronized, simplified, accessible version of what the professor just said. Build that. Everything else is delivery.

**BdSL is your research contribution, not your demo asset.** Your demo should be in English-heavy mixed Bangla. Your BdSL work should be framed as a pioneering research contribution to an underdocumented language, not as a fully working production feature.

**If you have not talked to a Deaf BdSL user by the end of Week 2, you are building the wrong thing.** Full stop.

**Synchronization is harder than it looks.** Budget twice as long as you think it needs. The edge cases are where users abandon the system.

**The biggest risk is not technical failure.** It is building something technically impressive that Deaf students don't use because it doesn't fit their life. The only protection against that risk is continuous contact with Deaf users throughout the build.

Build for Riya. Not for the judges. Not for the evaluators. Not for the portfolio. For the student who has been missing 60% of every lecture for three years and has never had a tool that helped her follow it in real time.

If that system exists when you submit on July 1, you have succeeded — regardless of what the competition result says.

---

*Prepared June 2026. All recommendations reflect current state of the literature, the BdSL data landscape, and the project constraints as stated.*
