# Final Mentor Advice

## To You, the Builder — Everything That Matters Most

This document has now walked through twenty sections of detailed guidance. You have maps for every major challenge, research directions for every major question, and planning frameworks for every phase of work. That is a lot of information.

Here, at the end, I want to give you something different — not a framework or a research direction, but direct, honest advice. The kind of advice a mentor gives when the formal session is over and the student says: "But really, what do I need to know?"

---

## What to Focus On First

Start with one working thing. Not ten half-working things. One thing, working well, end to end.

The one thing is this: a lecture video plays, a caption appears in real time, and the avatar signs at least one key word from that caption at approximately the right moment. That is the irreducible core of your application. Everything else — facial expressions, expanded sign dictionary, live microphone mode, beautiful animations — is built on this foundation.

If this foundation is shaky, nothing built on top of it will stand. If this foundation is solid, everything you add will work.

Before you add any feature, ask yourself: is the core working reliably? Not impressively. Not under perfect conditions. Reliably. If the answer is no, fix the core before expanding.

After the core, the second priority is the one thing that most directly improves Riya's experience: **caption quality**. Because even if the avatar is rough, even if the synchronisation is imperfect, if Riya can read an accurate simplified caption and follow the lecture, you have achieved something real. Caption quality is your most direct path to impact.

**Third priority is synchronisation.** The avatar must follow the video. A beautiful avatar doing the wrong signs at the wrong time is worse than a simple avatar doing approximate signs at the right time.

Everything else — better facial expressions, expanded signs, live mode, mobile support — is fourth and beyond. Do not start on fourth things until you are genuinely satisfied with one, two, and three.

---

## What to Ignore Initially

**Ignore visual polish.** The avatar's clothing, hairstyle, skin texture, background environment — all of this is irrelevant until the core works. Judges evaluating an accessibility application are looking for whether it would actually help a Deaf student. They are not looking for whether the avatar is wearing a nice shirt.

**Ignore completeness of sign coverage.** A system with thirty signs that work well is more impressive than a system with three hundred signs that work poorly. Your thirty signs should be the right thirty — the ones that appear most frequently in the academic content you are targeting.

**Ignore building for everyone simultaneously.** Your application does not need to serve every possible Deaf student in every possible context in version one. It needs to serve Riya, studying computer science, watching pre-recorded lecture videos. Build for her first. Expand from there.

**Ignore perfect BdSL grammar at the expense of functionality.** A sign that communicates the right concept in a slightly grammatically imperfect way is better than no sign at all. Strive for grammatical correctness, but do not let its pursuit prevent you from having a working system.

**Ignore features that only improve the demo and not the product.** There is a specific category of feature that looks great in a five-minute demonstration but adds nothing to the experience of using the application for ninety minutes. You know what these features are for your project — be honest with yourself about them and deprioritise them.

---

## The Biggest Mistakes to Avoid

**The biggest mistake is building in isolation.** This project is about Deaf students. If you build it without any contact with Deaf students, you will get it wrong in ways you cannot predict and cannot correct without contact. Even one conversation, even one fifteen-minute session where you show a Deaf student what you have built and watch them use it — this is transformative. Do not skip this. No amount of research, testing, or careful thinking can replace it.

**The second biggest mistake is claiming more than you deliver.** This project operates in a community that has been overpromised to before. If you say "our application supports Bangla Sign Language" without being specific about what that means and what it does not yet cover, you will disappoint users who expected something complete. Be honest. Honest limitations, communicated gracefully, build more trust than impressive claims that turn out to be overstated.

**The third biggest mistake is optimising for judges instead of for users.** The application you would build to impress judges for five minutes is different from the application you would build to genuinely help Riya every Tuesday for a semester. Choose to build the second one. The first one will be less impressive in a five-minute demo. The second one will be far more meaningful — and the judges who understand accessibility technology will see the difference.

**The fourth biggest mistake is treating the deadline as the finish line.** The deadline for the hackathon is July 1. That is the start line for the actual race, which is whether this application helps real Deaf students in Bangladesh. If you treat July 1 as the finish line, you will optimise for submission quality and abandon the project afterward. If you treat it as the start line, every decision you make before July 1 will be shaped by a longer horizon.

---

## What Success Actually Looks Like

Success is not a trophy or a first-place finish. Success is not a perfect synchronisation algorithm or a beautiful avatar. Success is not a research paper or a startup or a government adoption.

Success is Riya opening your application on a Tuesday morning, sitting down in her Operating Systems lecture, and understanding 80% of what the professor says when she would previously have understood 30%. Success is her leaving that lecture with notes she wrote herself, with confidence rather than guessing. Success is her telling her friend about your application on Wednesday, and her friend — who is also Deaf, also studying, also struggling — trying it the following week.

That is success. Human and specific and measurable in the terms that matter.

Everything else — the technical achievements, the research contributions, the competition results, the institutional adoption — these are means to that end, not the end itself.

---

## What Would Make This Project Publication-Worthy

For this project to become a peer-reviewed publication, it needs three things beyond the working application.

**First, a systematic user study.** At least five to ten Deaf or Hard-of-Hearing students using the application in controlled conditions, with their comprehension measured before and after, with their experience documented through standardised questionnaires. This study does not need to show that your application is perfect — it needs to show that you measured rigorously and reported honestly.

**Second, a contribution to BdSL documentation.** Your sign dictionary, if compiled with community validation notes and linguistic annotations, represents new knowledge about BdSL academic vocabulary. Documenting this carefully — which signs you chose, why, who validated them, what variations were noted — makes it citable.

**Third, an honest analysis of limitations.** The papers that are most respected in accessibility research are those that name their limitations clearly and describe what would be needed to overcome them. A paper that says "our gloss generation achieved X quality as measured by Y metric, with specific weaknesses in Z context, which we attribute to A and B factors" is publishable. A paper that claims general success without honest measurement is not.

The target publication venues would be **ACM ASSETS** (the leading accessibility technology conference), the **ACM CHI** conference, the **Sign Language Studies** journal, or the **Deafness and Education International** journal. Each of these has published work at a similar scale to what you could produce.

---

## What Would Make This Project Startup-Worthy

For this project to become a sustainable startup or social enterprise, it needs four things.

**First, a demonstrated user base.** Not a potential user base, not a theoretical market — a real group of Deaf students who are using the application regularly and finding it valuable. Even fifty users who use it weekly and report genuine improvement in their educational experience is a more convincing foundation than a market analysis suggesting millions of potential users.

**Second, a scalable model for sign dictionary expansion.** The single biggest limitation of the current application — the dependency on manual animation work for each new sign — needs a solution. The MediaPipe motion capture approach is the most promising path here. A startup that can demonstrate it can expand its sign dictionary through community contribution rather than manual work has a credible path to scaling.

**Third, an institutional customer.** A single university that has formally adopted the application — even a small pilot program — proves that the institutional market is accessible. One real institutional customer is worth a hundred letters of intent from potential customers.

**Fourth, a team committed beyond the hackathon.** A startup is a multiyear commitment. The project needs at least two people willing to work on it seriously for eighteen to twenty-four months, navigating the inevitable setbacks, pivots, and challenges that every early-stage project faces.

---

## What Would Make This Genuinely Useful for Deaf and Hard-of-Hearing Students

Stripping away all the ambition and the frameworks and the roadmaps, this is the most important question in this entire document: what would make this genuinely useful for the Riya who sits in the back of an Operating Systems lecture on Tuesday morning?

**Reliability.** The application must work every time she opens it. Not most times. Every time. She cannot plan her lecture attendance around hoping the application works today. She needs to be able to count on it.

**Accuracy.** The captions must be right most of the time. Not perfect — she understands that AI is imperfect. But accurate enough that she would rather follow them than not have them. The moment the captions become more confusing than helpful, the application stops being useful.

**Honesty.** When the application does not know something — when a word has no sign, when the background noise is too high for reliable transcription, when the language is too complex for confident simplification — the application must say so. Clearly. Without shame. "I'm not sure about this one — here's my best attempt" is the honest voice of a tool that respects its user.

**Respect.** The application must feel like it was built for Deaf students, not built for hearing people's idea of what Deaf students need. The language must be respectful. The design must treat the user as capable and intelligent. The sign content must honour BdSL as a real language, not approximate it as a gesture system.

Those four things — reliability, accuracy, honesty, and respect — are what would make this genuinely useful. They are not the most technically challenging requirements. In some ways, they are harder than the technical challenges, because they require a sustained commitment to the user's perspective over the builder's convenience.

If you hold onto those four requirements — if you make every significant decision by asking "does this make the application more reliable, more accurate, more honest, or more respectful?" — you will build something that Riya actually uses on Tuesday morning. And that is worth everything.

---

*Build with care. Build with honesty. Build with the knowledge that on the other side of your work, there is a student who has been waiting for something like this for a long time.*
