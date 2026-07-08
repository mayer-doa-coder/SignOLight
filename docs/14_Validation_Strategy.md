# Validation Strategy

## Opening: The Most Important Distinction You Will Ever Learn

There are two questions that every builder must hold in their mind at all times. The first is: *Are we building the right thing?* The second is: *Are we building the thing right?*

These questions sound similar. They are completely different.

Building the right thing means your application actually solves the problem that Riya has — that it fits her life, that she would use it, that it changes something real about her experience of lectures. This is called **validation**.

Building the thing right means your application works as you intend it to — the captions are accurate, the avatar moves when it should, the video stays in sync. This is called **testing**, and it gets its own full section later.

This distinction matters because it is entirely possible to build the wrong thing perfectly. You can have a system with zero bugs, perfect synchronisation, beautiful animations, and reliable performance — that Deaf students do not use, do not trust, or do not find helpful. It passes every technical test. It fails every human test. The project is a technical success and a real-world failure.

Validation is the discipline that prevents this outcome. It is the ongoing practice of asking "is what we are building actually useful?" — and asking it with enough rigour and honesty to catch the answer when the answer is no.

---

## 14.1 What Validation Means

### What This Means

Validation is the process of confirming, through evidence from real people, that what you are building addresses a genuine problem in a way that genuinely works for the people who have that problem.

Note the emphasis on "real people" and "evidence." Validation is not guessing. It is not assuming. It is not asking your friends whether they think your idea is good. It is structured, honest engagement with the actual humans who have the problem you are trying to solve, observing how they respond to your proposed solution, and allowing that response to guide your decisions.

There are four layers of validation, each building on the last:

**Problem validation** — confirming that the problem you are trying to solve is real, experienced by real people, and important enough to them that they would want a solution.

**Solution validation** — confirming that the solution you are proposing would actually address the problem. Not just that it technically could work, but that the specific approach you are taking fits how real users would encounter and use it.

**Quality validation** — confirming that the solution works well enough. Not perfectly, but to a level that is genuinely useful rather than frustrating.

**Impact validation** — confirming that the solution actually makes a difference to the user's life. That it changes something measurable about their experience or outcomes.

### Why It Matters

Without validation, you are building in the dark. You are making decisions based on assumptions — assumptions about what Deaf students need, about what makes a sign language avatar useful, about what level of caption accuracy is acceptable, about whether anyone would actually open this application on a Tuesday morning before a lecture.

Some of those assumptions will be correct. Experience, research, and careful thinking can get you close. But some will be wrong, and the ones that are wrong will cause real problems for real users. Validation is the practice of finding out which assumptions are wrong before you have committed your entire timeline to acting on them.

For a hackathon specifically, validation also matters for your presentation. Judges at SciBlitz AI Challenge are not just evaluating whether your system works — they are evaluating whether your system would actually be useful in the real world. A team that can say "We showed this to three Deaf students at BUET, and here is what they told us" is making a fundamentally stronger argument than a team that says "We believe this would help Deaf students." One is evidence. The other is belief.

### Real-World Example

Here is a story that illustrates what happens when validation is skipped.

A developer team at a major tech company spent eighteen months building an automatic speech-to-text system specifically for Hard-of-Hearing users. The system was technically excellent — it achieved very high accuracy rates on benchmarks, the interface was clean, the latency was acceptable. They launched it with great fanfare.

Within three months, almost no one was using it.

When they finally did user research — something they should have done before building — they discovered that their primary users did not need better speech-to-text. They needed better text-to-speech. They were not primarily trying to understand spoken words. They were trying to communicate their own responses back to hearing people. The developers had solved a real problem — just not the primary problem.

Eighteen months of work. One user research session that could have been done in week one would have revealed this.

### Common Beginner Mistakes

**Mistake one: Validating with people who want to make you feel good.** Showing your project to your friends, your family, your professors, or your classmates and asking "what do you think?" produces answers that are shaped by social kindness, not honest assessment. People who care about you will find positive things to say. This feels validating. It is not.

**Mistake two: Asking leading questions.** "Do you think a sign language avatar would help you understand lectures?" is a leading question. It suggests the answer. Almost everyone will say yes. A better question is: "Walk me through what happens when you attend a lecture you struggle to follow. What do you do? What do you wish existed?" The second question does not suggest an answer — it listens for one.

**Mistake three: Validating at the end.** Many teams build first and validate last — essentially using the hackathon submission as their validation exercise. This means that if validation reveals fundamental problems with the approach, there is no time to address them. Validation should happen continuously, from the earliest concept through to the final demo.

**Mistake four: Treating validation as a single event.** Some teams do one user interview, conclude "we validated the concept," and never speak to a user again. Validation is ongoing. User needs evolve. Your understanding of the problem deepens as you build. Regular validation contact — even brief, even informal — maintains the connection between what you are building and what users actually need.

### Risks If Ignored

If you skip validation and build on unexamined assumptions, you risk building something that is polished, functional, and irrelevant. In a competition, this means you will likely present to judges who are more knowledgeable about the problem space than the typical casual observer, and they will identify the gap between your claims and real-world utility.

Beyond the competition, there is a more serious risk: if your application reaches actual Deaf users who begin to rely on it, and it fails them — because it was never built around their actual needs — you have not just wasted time. You have potentially reinforced the belief that technology cannot help them, making them less likely to try the next tool that might actually work.

### How to Validate It

This is the meta-question: how do you validate your validation? Here are three practical checks.

First, the sourcing check: can you identify at least one real piece of feedback from a person who is actually Deaf or Hard-of-Hearing and currently studying? Not a professor who works with Deaf students. Not a parent of a Deaf child. The actual user.

Second, the surprise check: has your validation process produced at least one finding that surprised you? If every piece of user feedback confirmed exactly what you already believed, you were probably asking the wrong questions or the wrong people. Good validation reveals something unexpected.

Third, the decision check: has any piece of user feedback caused you to change a decision you had already made about the project? If your validation never changes anything, it is not guiding your building process — it is just providing quotes for your presentation.

### Success Criteria

Validation is happening at a meaningful level when: you have spoken directly with at least two Deaf or HoH students and observed or heard their honest assessment; at least one finding has surprised you; at least one decision you made was changed based on user input; and your team can describe what you learned from users without looking at notes.

### Key Takeaways

Validation is not a phase — it is a practice. It cannot be done in a day and checked off. It requires ongoing, honest contact with real users, honest questions that do not lead to the desired answer, and the willingness to change direction when evidence demands it.

---

## 14.2 User Validation With Deaf Students

### What This Means

User validation with Deaf students specifically means creating structured opportunities for Deaf and Hard-of-Hearing students to interact with your application — or even just your concept — and giving you honest, detailed feedback about whether it serves their needs.

"Structured" does not mean formal or intimidating. It means intentional. You have a goal for the session. You know what you want to learn. You have prepared questions or activities. You are listening carefully and taking notes.

### Why It Matters

There is no substitute for this. No amount of reading about Deaf education, no amount of research into sign language technology, no amount of careful thinking about the user journey replaces direct contact with the people you are building for. The gap between what you imagine their experience to be and what it actually is will surprise you every time.

### Real-World Example

Imagine a team building a navigation app for blind users who have never spoken to a blind person. They reason: "Blind people need directions. We'll read out turn-by-turn directions in a clear voice. Simple." When they finally test with a blind user, they discover several things they had not anticipated: the user walks with one hand on a cane and one hand holding a phone, making touch interaction difficult; they already know their familiar routes by memory and find constant direction announcements patronising and distracting; and their greatest navigation need is not known routes but unexpected obstacles and changes. None of this was obvious without direct user contact.

The equivalent for your project: you might discover that Deaf students do not want the avatar to be prominently displayed because it attracts attention in class. You might discover that the simplified captions are actually patronising for students with strong literacy skills. You might discover that the single most useful feature would be the ability to replay the last ten seconds of signed content — something you had not thought of.

### How to Find Deaf Students to Work With

This is a practical concern that teams often struggle with. Here are specific approaches.

Reach out to Deaf schools and Deaf community organisations in your city. In Dhaka, there are Deaf schools and organisations connected to the National Federation of the Deaf in Bangladesh. A respectful, brief email explaining that you are building an educational accessibility tool and would love feedback from a Deaf student for fifteen to twenty minutes is often enough.

Contact the disability support office at your own university or a nearby university. Ask whether they can connect you with any Deaf or Hard-of-Hearing students who might be willing to give feedback.

Post in Deaf community groups on Facebook, which are active in Bangladesh. Be transparent about who you are, what you are building, and what you are asking for. Do not promise more than you can deliver.

Consider paying for the time of anyone who agrees to give feedback, even a small amount. This signals that you respect their time and expertise. Their knowledge of BdSL and their experience as Deaf students is a contribution, not a charity.

### Conducting the Validation Session

A good user validation session for this project looks like this.

You explain briefly — ideally through a sign language interpreter if available, or through written communication — what you are trying to learn. Not "we want to show you our project" but "we want to understand your experience of lectures and whether this tool might help."

You observe more than you guide. If they are using your application, watch what they do rather than explaining what they should do. If they get stuck somewhere, note it but do not rescue them immediately. Their moment of confusion is data.

You ask open questions afterward. "What did you find most useful?" "Was there anything confusing?" "Was there a moment where you felt unsure what was happening?" "If you could change one thing, what would it be?"

You take notes or ask permission to record the session. Memory is unreliable. You will think you remember what was said, but you will forget the nuances.

You thank them and follow up. Share what you learned from the session and, if relevant, how it changed your thinking.

### Relevant Research Areas and Papers to Explore

**Research fields:** Human-Computer Interaction (HCI), Accessibility Research, Deaf Education Technology, Participatory Design

**Search keywords:** "participatory design deaf users," "user evaluation sign language technology," "accessibility technology evaluation methods," "deaf user experience research," "community-based design disability"

**Important areas to read:**
The field of **participatory design with Deaf communities** has a substantial literature. Researchers like Christian Rathmann and others have written about the ethics and methods of involving Deaf communities in technology design. Search for "Deaf participatory design" in Google Scholar for relevant papers.

The **Universal Design for Learning (UDL)** framework, developed by CAST (Center for Applied Special Technology), provides a research-backed framework for thinking about accessibility in educational contexts. Meyer, Rose, and Gordon's work on UDL is foundational. Their book "Universal Design for Learning: Theory and Practice" provides the conceptual foundation. Search for "Universal Design for Learning Deaf students" for specific applications.

The journal **Deafness and Education International** publishes research specifically on educational technology for Deaf learners. This is a direct source for understanding what works and what does not in your specific context.

The journal **ACM ASSETS** (Assets: A Conference on Assistive Technology) is the leading conference for accessibility technology research. Searching its proceedings for "sign language" and "Deaf education" will produce directly relevant work.

**Why they matter:** These sources give you a methodological foundation for conducting user research with Deaf communities that is both ethically sound and practically effective. They also give you language and frameworks that will strengthen your report and presentation.

**What can realistically be reused:** The participatory design literature gives you questions to ask, structures for sessions, and frameworks for analysing what you hear. The UDL framework gives you principles for evaluating whether your application is genuinely accessible. You do not need to implement the research — you need to apply its insights to your design and validation choices.

---

## 14.3 Technical Validation

### What This Means

Technical validation is the process of confirming that each component of your pipeline produces output that is accurate and useful enough to serve your users. It is different from testing — testing checks whether things break, while validation checks whether things work well enough.

For your application, there are four distinct components that each require their own validation approach: transcription accuracy, simplification quality, gloss accuracy, and synchronisation reliability.

### Transcription Accuracy Validation

Take five real lecture recordings — at least three in Bengali, two in English, from actual university lectures, not cleaned-up demonstrations. Run each through your transcription pipeline. Compare the output text to what was actually said.

A useful metric here is not perfection but usability. A caption with minor errors is still usable. A caption with errors that change the meaning is not. As you review the transcription output, categorise errors:

- **Harmless errors:** spelling variations, punctuation mistakes, minor word substitutions that do not change meaning. ("The compiler translates source code" instead of "the compiler converts source code.")
- **Confusing errors:** word substitutions that make a sentence hard to understand but do not reverse the meaning. ("The compiler translates *horse* code" — clearly wrong but obviously an error.)
- **Misleading errors:** substitutions that change the meaning in ways a student might not notice. ("The method *should* be used" instead of "the method should *not* be used.")

Your validation goal is to ensure that misleading errors are rare — ideally fewer than one per five minutes of lecture — and that the overall transcription quality is high enough that captions provide genuine support rather than confusion.

### Simplification Quality Validation

Take ten passages of simplified output and compare them to the original. For each, ask: does the simplified version preserve the main educational content? Does it introduce any factual errors? Is it genuinely simpler to follow, or just shorter?

A useful test is the comprehension comparison. Show the original passage to one person and the simplified passage to another. Ask both a specific comprehension question about the content. If both get it right, the simplification is preserving meaning while improving accessibility.

### Gloss Accuracy Validation

As described in Section 10, gloss accuracy requires a BdSL-familiar reviewer. The validation process is: show the avatar performing glosses for five different lecture passages to someone familiar with BdSL. After each passage, ask them to summarise what they understood. Compare their summary to the actual content.

Document your findings honestly. "For passages about computer science vocabulary, comprehension was good. For passages using idiomatic Bengali expressions, comprehension was lower." This honesty strengthens rather than weakens your project — it shows that you have done real validation and are being transparent about what you found.

### Synchronisation Reliability Validation

For synchronisation validation, the key test is the timeline disruption test. Watch a 15-minute lecture clip. Pause it at minute 3, wait 30 seconds, then resume. Observe whether the avatar realigns correctly. Skip forward to minute 10. Observe the realignment. Skip back to minute 5. Observe again.

Each of these disruptions should result in the avatar smoothly showing the correct content for the new video position within a few seconds. If any disruption causes the avatar to show wrong content for more than three to four seconds, that is a synchronisation failure worth addressing.

---

## 14.4 Validation Timeline for Your Hackathon

### What This Means

Given that your submission deadline is July 1, 2026, you have approximately three weeks from the date of this guide. You cannot do all forms of validation simultaneously — you need to sequence them wisely.

### The Recommended Validation Schedule

**Week one (now through June 18):** Focus on problem and solution validation. Talk to at least one Deaf or Hard-of-Hearing student. Show them a very simple version of what you are building — even just a description or a rough sketch. Confirm that the problem is real to them and that the approach feels relevant. This does not require a working demo.

**Week two (June 19-25):** Focus on technical validation of core components. Test transcription quality on real lecture recordings. Test simplification output for five different lecture passages. Begin basic synchronisation testing. Identify the biggest failure modes.

**Week three (June 26 - July 1):** Focus on integrated validation — testing the full pipeline end-to-end on a complete lecture clip. Conduct one user validation session with a working prototype if possible. Document your findings for the project report.

### Success Criteria for Validation Strategy Overall

Your validation strategy is complete enough when:
You have conducted at least one validation session with a real potential user and can describe what you learned. You have tested each component of your pipeline on real-world content and can state honestly where it works well and where it struggles. You have used at least one validation finding to change a design decision. Your project report can describe your validation process specifically, not vaguely.
