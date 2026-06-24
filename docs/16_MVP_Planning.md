# MVP Planning

## Opening: The Most Important Word in Product Building

If there is one concept that will save your hackathon project from collapsing under its own ambition, it is this: **Minimum Viable Product**, or MVP.

"Minimum" does not mean bad, weak, or incomplete. It means the smallest version of your product that delivers real value to a real user. Think of it this way: "minimum" refers to the effort required, not the impact delivered. A minimum viable product should be genuinely useful — it just does not have every feature you might eventually want to add.

"Viable" is the crucial word. It means the product actually works well enough for someone to get genuine value from it. Not "technically functions" but "genuinely helps someone in a real situation." A product that takes thirty seconds to generate a single gloss is technically functional but not viable for a live lecture context.

"Product" reminds you that you are building something for a user, not a technology demonstration for yourself.

The hardest skill in building — especially for technically inclined students who enjoy the challenge of complex features — is deciding what not to build. Your MVP strategy is fundamentally a strategy of deliberate, strategic restraint.

---

## 16.1 Defining Your MVP

### What This Means

Defining your MVP means deciding, explicitly and in writing, what your application must do to deliver real value — and what it will not do in the first version. The second list is just as important as the first.

### Why It Matters

Without an explicit MVP definition, scope expands constantly. Each team member has ideas. Each discussion generates new features. The product grows in all directions simultaneously, and nothing is finished to a quality that actually serves the user. This is called scope creep, and it is the primary reason hackathon projects fail to produce a compelling demo.

When you define your MVP explicitly, you create a shared agreement within your team about what constitutes "done." This has an immediate practical effect: it allows you to finish something rather than perpetually adding to everything.

### Real-World Example

Consider a team building a recipe suggestion application. They could build: recipe search, dietary preference filtering, ingredient substitution, nutritional information, shopping list generation, social sharing, user profiles, and meal planning calendars. All of these features are sensible. All of them would make the product better.

But if the team defines their MVP as "give me a recipe based on three ingredients I have at home," they can build that one feature excellently and have something genuinely useful. Judges who ask "did this work?" will say yes, emphatically. The other features become Phase 2.

The equivalent for your project: your MVP is not a full-featured accessibility platform. It is a specific, excellent demonstration of the core pipeline working on educational content.

### Defining Your MVP: The Core Experience

The core experience your MVP must deliver is this: a Deaf or Hard-of-Hearing student can watch a video lecture (or a recorded simulation of one) and, with your application running alongside, follow the key concepts through captions and an avatar signing the key vocabulary, with the signing staying reasonably synchronised with the video.

That is the MVP. Everything else — live microphone input, multiple language switching, expanded sign dictionary, advanced facial expressions, mobile responsiveness, user accounts — is either already delivered by the core experience or is a feature you add if time allows.

### The MVP Feature List vs. The Full Vision Feature List

Here is a framework for deciding what belongs in your MVP. For every feature, ask: "Without this feature, can a Deaf student still get real value from the core experience?" If yes, the feature is not part of the MVP.

**MVP features (must have to deliver core value):**
- A working video player that can play a lecture recording or YouTube-embedded video
- Real-time (or near-real-time) captions alongside the video
- An avatar that signs key vocabulary terms while the video plays
- Synchronisation between the video timeline and the avatar's signing
- Simplified captions that reduce cognitive load
- A concept card fallback for unknown vocabulary

**Important features that enhance the experience (add if time allows):**
- Live microphone mode for live lectures
- Bangla-English language switching
- Avatar facial expressions beyond neutral
- Ability to pause and replay a sign
- Expanded sign dictionary beyond 30-80 words

**Advanced features (post-hackathon roadmap):**
- Full BdSL grammar-based signing
- Speaker diarization (identifying different speakers)
- Mobile application
- Offline functionality
- Integration with learning management systems

Notice something important: the MVP is still impressive. A working pipeline that takes a lecture video and produces synchronised captions with an avatar signing key vocabulary — in real time, in Bangla and English — is genuinely remarkable. It is absolutely sufficient to win a hackathon. You do not need the enhanced features to make a strong submission.

### Common Beginner Mistakes

**Mistake one: Defining the MVP to include every feature you have already built.** This defeats the purpose. The MVP should be defined first, based on what the user needs, not based on what you have already built.

**Mistake two: Not writing the MVP down.** An unwritten MVP is just a vague intention. Write it on paper or a shared document and put it somewhere visible. When a new feature idea comes up, compare it explicitly to the written MVP definition.

**Mistake three: Confusing MVP with "low quality."** The MVP should be excellent within its defined scope. "Minimum" describes breadth of features, not depth of quality. A narrow, excellent product is an MVP done right. A broad, mediocre product is scope creep done wrong.

**Mistake four: Expanding the MVP every week.** Once the MVP is defined, protect it from feature additions until the core is complete and stable. When new ideas come up — and they always do — add them to a list called "Phase 2" rather than adding them to the current scope.

### Risks If Ignored

If you do not define your MVP, you will arrive at your submission deadline with ten features that are 60% complete instead of three features that are 95% complete. A live demo of a 95%-complete core experience is compelling. A live demo of ten half-finished features is uncomfortable to watch and easy to dismiss.

### How to Validate the MVP Definition

Show your MVP definition to someone outside your team. Ask them: "If a Deaf student could do only these things with our application, would it be genuinely useful to them?" If the answer is yes — even if they suggest additional features that would make it better — your MVP is well defined. If they say "no, without X you don't really have anything useful," you need to either add X to the MVP or reconsider your core value proposition.

### Success Criteria for MVP Definition

Your MVP is well defined when: it is written down in one paragraph; every team member agrees on what it says; every feature on the list is genuinely necessary for core value delivery; and you can draw a clear line between MVP features and Phase 2 features.

---

## 16.2 Timeline Planning for MVP Completion

### What This Means

Given your July 1 submission deadline, the time between now and submission needs to be allocated across four activities: building, testing, validating with users, and preparing the submission deliverables (report, video, model card, GitHub). All four must happen before the deadline.

### Why It Matters

Most teams under-allocate time for everything except building. They assume that writing the report will take a few hours, recording the demo video will take an afternoon, and preparing the GitHub repository will take an evening. In practice, each of these takes significantly longer than expected, and they are typically done in the final 48 hours under significant time pressure, producing lower quality than if they had been planned properly.

### Real-World Example

Think about students preparing a final thesis. The student who plans to write the thesis in the last two weeks consistently produces weaker work than the student who writes one chapter per week for eight weeks. The deadline is the same. The available time is the same. The outcome is different because one student planned and one student hoped.

### The Recommended Allocation

Given approximately three weeks remaining (from the date of this guide):

**Week one (approximately June 11-18):** Complete the core MVP pipeline end-to-end, even if quality is rough. Have something working, even imperfectly, by the end of this week. The goal is not polish — it is a complete, integrated, running system.

**Week two (June 19-25):** Improve quality on the three most critical components (synchronisation, caption accuracy, and sign visibility). Conduct at least one user validation session. Begin writing the project report — do not leave this until week three.

**Week three (June 26 - July 1):** Final polish, demo preparation, complete the project report, record the demo video, prepare the GitHub repository and README, complete the model and data card. Submit before midnight on July 1.

Notice that the submission deliverables — report, video, GitHub, model card — span weeks two and three, not just the final night. This is intentional. The project report and demo video are evaluated by judges, and they deserve the same quality investment as the application itself.

### Planning for the Demo Video Specifically

The demo video is described in the rulebook as "important" and something that "judges will watch first." This means it is not a rushed afterthought — it is one of your primary means of communication with judges.

Plan your demo video content before you record it. Outline what you will show and in what order. Practise it at least twice. The typical strong demo video for an application like yours would: introduce the problem in thirty seconds through a real human story (Riya's Tuesday moment); demonstrate the application working on a real lecture clip for two to three minutes, showing captions, avatar, and synchronisation working together; briefly acknowledge current limitations and describe what they would look like solved; and close with the human impact — what this means for Riya.

Record in a quiet environment with good lighting. Use screen recording software to capture both the application and a voice narration. Do not try to demo live features that have not been thoroughly tested — if the live demo misbehaves during recording, switch to a pre-loaded example that you know works reliably.

### Relevant Research Areas and Papers to Explore

**Research fields:** Software Project Management, Agile Development for Student Projects, Minimum Viable Product Theory

**Search keywords:**
- "MVP minimum viable product lean startup"
- "agile software development student teams"
- "hackathon project management strategies"
- "scope creep prevention software projects"

**Important concepts to explore:**

**The Lean Startup methodology** by Eric Ries introduced the MVP concept in a product context. His book "The Lean Startup" and the associated concept of the "Build-Measure-Learn" loop provide a practical framework for iterative development that is highly applicable to hackathon projects.

**The concept of "product shaping"** from Basecamp's "Shape Up" methodology (freely available online) describes how to define work that can be completed in a bounded time period without scope creep. The principles are directly applicable to your situation.

**Why they matter:** Understanding MVP theory and iteration methodology helps you make scope decisions confidently and defend them to your team when there is pressure to add features.

**What can realistically be reused:** The frameworks for defining what belongs in scope and what does not, and the language for communicating scope decisions to a team, are directly applicable to your planning process.

### Success Criteria for MVP Planning

Your timeline planning is good enough when: each of the four activities (build, test, validate, prepare deliverables) has dedicated time allocated; no single activity is compressed into the final 48 hours; and your team has a shared understanding of what must be complete by end of each week for the project to be submittable on July 1.

---

## 16.3 The Demo Strategy: Showing What Works, Honestly

### What This Means

Your demo — both the recorded video and the live demonstration at the final day — is not just a test of technical quality. It is a communication about what you built, why it matters, and what you learned. Designing the demo strategically means choosing what to show, in what order, and how to handle the inevitable moments where things do not work perfectly.

### Why It Matters

Judges at SciBlitz AI Challenge evaluate demo quality and functionality at 20% of the total score. This is a significant portion. A demo that is technically limited but thoughtfully presented can score higher than a technically impressive demo that is disorganised and unclear.

More importantly, the demo is the moment when the human story of your project — Riya's story — becomes visible. The best demos do not just show features. They put the features in human context: "This is what Riya's Tuesday used to look like. This is what it looks like with our application."

### The Structure of a Strong Demo

A strong demo for your application has five parts:

**Part one — the problem moment (30 seconds).** Show, briefly and concretely, the problem you are solving. A short clip of a lecture happening with no accessibility support. Or a description of Riya's experience in Tuesday's class. Make the problem vivid and human before you show any technology.

**Part two — the core feature in action (90 seconds).** Show the application running on a real lecture clip. Let the judges see captions appearing, the avatar signing, and the synchronisation working. Do not narrate this heavily — let the product speak. Describe briefly what is happening only if something needs explanation.

**Part three — a specific interaction (60 seconds).** Show something specific that demonstrates a design decision you made thoughtfully. Show the fallback concept card for a word the system does not recognise. Show what happens when you seek forward in the video. Show a moment where the facial expression on the avatar changes for a question. Choose one demonstration that shows depth of thinking, not just breadth of features.

**Part four — the limitations (30 seconds).** Briefly and confidently acknowledge what does not work yet. "Our current sign dictionary covers educational vocabulary — for very technical terms, we provide explanations rather than signs, as you can see here." This is not weakness. This is intellectual honesty, and judges respect it.

**Part five — the vision (30 seconds).** Return to Riya. "This means that next Tuesday, Riya does not go home guessing." End on the human impact.

### Common Beginner Mistakes

**Mistake one: Showing only the happy path.** A demo that only shows the application working perfectly under perfect conditions feels staged. Judges who understand the problem domain will push harder to see what fails. Proactively showing one failure mode — and your graceful handling of it — is more convincing than a demo that pretends nothing ever goes wrong.

**Mistake two: Narrating features instead of showing value.** "And here you can see the avatar performing the sign for COMPILER" is narrating a feature. "And this is the moment where Riya would normally have to wait until after class to find out what the professor just said — but now she can see it immediately" is showing value. Keep the human story present throughout the demo.

**Mistake three: Running out of demo time.** Practise your demo with a timer. Know exactly how long each part takes. Judges' time is limited and respect for their time is itself impressive.

### Success Criteria for Demo Strategy

Your demo is well prepared when: you have practised it at least three times and it takes the right amount of time; you have a recorded backup ready in case of live demo failure; and you can tell the story of your application's impact — not just its features — without looking at notes.
