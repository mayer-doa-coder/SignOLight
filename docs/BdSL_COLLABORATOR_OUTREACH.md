# BdSL Community Collaborator Outreach

> This is the single most important non-code task for the project. Code can pass tests — only a real BdSL signer can confirm that Riya actually understands the output.

---

## Why This Matters

The CTO axioms establish that avatar comprehension scores 2.5–3.5/5 without community validation (Quandt 2022). The difference between 2.5 and 3.5 is largely in **sign accuracy** and **grammar confidence** — both of which require a native BdSL signer to verify. No automated test can substitute for this.

The specific things we cannot know without a collaborator:

1. Whether our 36 domain sign clip files represent BdSL correctly, or whether we're accidentally showing ASL or BSL poses
2. Whether our SOV grammar rules match actual BdSL usage (documented SOV is sometimes overridden in real signer discourse)
3. Whether our fingerspell alphabet poses are recognizable by a native BdSL reader
4. Whether our concept card explanations are culturally appropriate for a Bangladeshi student

---

## Who to Contact

### Priority 1 — Deaf schools and centres in Dhaka (fastest path to a signer)

| Organisation | Contact approach | Why |
|---|---|---|
| **DISS (Dhaka Institute of Surdos / Deaf students)** | Visit or call: Mirpur, Dhaka | Direct access to native BdSL signers who are also students — matches Riya persona exactly |
| **BRAC ICED (Institute of Educational Development)** | Email: iced@brac.net | Has inclusive education researchers familiar with BdSL; may connect you with Deaf teachers |
| **Shishu Bikash Kendra (Savar, Dhaka)** | NGO running Deaf education programs | Alternative if DISS is not reachable |

### Priority 2 — Academic researchers

| Researcher / Group | Contact approach | Why |
|---|---|---|
| **Bangla-SGP team** (arXiv:2511.08507 — Islam et al., 2024) | Contact via paper's corresponding author affiliation | They created the only known BdSL gloss dataset; may have BdSL signer contacts |
| **Dr. Md. Shamim Kaiser** — Islamic University Bangladesh | Faculty page / ResearchGate | Has published on Bangla NLP; may know BdSL linguistics researchers |
| **BUET CSE Dept.** — any NLP or accessibility research group | BUET contact directory | University most likely to have students researching BdSL |

### Priority 3 — Online Deaf communities

| Community | Platform | Why |
|---|---|---|
| **DeafSpace BD** | Facebook group | Largest online community of Deaf Bangladeshis; real users |
| **Bangladesh National Federation of the Deaf (BNFD)** | Website / Facebook | Official federation; may point to specific validators |

---

## Email Template (English — ready to send)

> Copy, fill in [BLANKS], and send. Keep it short — 150 words max.

---

**Subject:** Volunteer for 2-hour sign language validation session (educational app)

Dear [Name / Organisation],

I am a researcher / student building SignOLight, a tool to help Deaf students follow university lectures in Bangladesh. The app displays BdSL (Bangla Sign Language) signs synchronized to lecture captions in real time.

We need a native BdSL signer to review our sign library — specifically to confirm that our sign poses and grammar rules are correct for BdSL (not ASL or BSL). This would take approximately **2 hours via video call or in person**.

What we would ask:
- Review 10 sign poses (short video clips) and rate accuracy 1–5
- Read 5 BdSL gloss sentences and confirm the SOV word order feels natural
- Flag any signs that look like ASL or BSL rather than BdSL

We can offer co-authorship credit in our research write-up. Entirely voluntary.

Would you be willing to help, or can you suggest someone who could?

Thank you,
[Your name and affiliation]

---

## The 5 Validation Tasks (with acceptance criteria)

### Task 1 — Sign clip accuracy review

**What to show:** The 10 sign clip files from `frontend/public/signs/*.json` rendered as animation on the avatar.

**What to ask:** For each sign, rate 1–5:
- 5 = "Yes, I recognise this immediately as [WORD] in BdSL"
- 3 = "I know what it is, but the handshape is slightly off"
- 1 = "This looks like ASL/BSL, not BdSL"

**Acceptance threshold:** Average ≥ 3.5 → keep clips. Any clip rated ≤ 2 by the signer → replace or remove.

### Task 2 — SOV grammar check on 5 sample glosses

**What to show:** These 5 glosses from actual demo output:
1. `NEURAL NETWORK DATA PATTERN LEARN`
2. `WEIGHT GRADIENT CALCULATE NOT`
3. `STUDENT CONCEPT UNDERSTAND CANNOT`
4. `FUNCTION WHAT DO`
5. `MODEL OUTPUT PRODUCE NOT`

**What to ask:** "Do these feel like natural BdSL sentence structure, or does the word order feel wrong?"

**Acceptance threshold:** At least 4/5 glosses rated as "acceptable BdSL structure" → SOV heuristic passes. Any with systematic problems → update `SIGN_MOTIONS` ordering or `buildGlossPrompt()` rules.

### Task 3 — Fingerspell alphabet verification

**What to show:** The 26 English fingerspell poses from the VRM animation.

**What to ask:** "Are any of these ASL handshapes rather than BdSL handshapes? BdSL has a different alphabet from ASL."

**Note to developer:** BdSL does not have a standardized single-hand alphabet for English letters. If the signer cannot recognise the handshapes, add a plain-text fallback for `[FINGERSPELL:X]` tags instead of animating.

### Task 4 — Concept card language check

**What to show:** 5 concept card overlays from the demo — e.g., "epistemological: relating to the theory of knowledge".

**What to ask:** "Is this explanation understandable to a Bangladeshi secondary-school student? Would you rephrase any of them?"

**Acceptance threshold:** No more than 1 card rated as "confusing or inappropriate" → concept card enrichment passes.

### Task 5 — Brief user test (if time permits)

**What to do:** Play 30 seconds of the demo lecture with BdSL avatar + captions visible. Ask: "How much of the content did you understand — roughly what percentage?"

**Record answer.** Compare to baseline (Riya scenario: ~40% without the app). Any increase → positive comprehension delta (CTO metric 5).

---

## How to Incorporate Feedback

After the session, update these files based on signer input:

| Finding | File to update |
|---|---|
| Sign clip rated ≤ 2 | Remove clip from `frontend/public/signs/` and log in `SIGN_MOTIONS` as ❌ |
| SOV order wrong | Update `buildGlossPrompt()` BdSL grammar rules in `backend/routes/sign.js` |
| SOV order wrong (pipeline.py path) | Update `sov_reorder()` in `backend_nlp/pipeline.py` |
| Fingerspell poses unrecognisable | Add plain-text `[FINGERSPELL:X]` display fallback in `frontend/src/components/SignAvatar.js` |
| Concept card wording | Re-run `enrichConceptCards()` with updated system prompt in `sign.js` |

After incorporating changes, update `GAP_ANALYSIS-v2.md` **BdSL community collaborator** row from ❌ to 🟡 Partial, and note the session date, collaborator initials, and which tasks passed.

---

## Timeline Goal

| Milestone | Target |
|---|---|
| Send first outreach email | Within 1 week of reading this |
| First validation session | Within 3 weeks |
| Changes incorporated | Within 1 week after session |
| GAP_ANALYSIS updated | Same day as changes |
| Second review (if major changes) | 2 weeks after first session |

Without at least one validation session, the project cannot honestly claim ≥ 70% BdSL sign recognition (CTO success metric 2). This is a blocking dependency for Phase A completion.
