# Improvement Roadmap

## Opening: Why Improvement Is a Discipline, Not an Accident

Most student projects follow the same arc. There is a burst of creative energy at the beginning, frantic building in the middle, a deadline-driven push at the end, and then — after submission — the project is placed in a folder never to be opened again.

If this project matters — and it does matter, because real Deaf students in Bangladesh need what you are building — then the submission deadline is not the end of the story. It is the end of the first chapter.

An improvement roadmap is a plan for what comes after. It answers a question that most builders only start asking once the initial energy has faded: *now that the first version exists, how do we make it genuinely better over time?*

The word "genuinely" is important here. There are two ways to improve a product. The first is to add features that look impressive, feel exciting to build, and demonstrate technical sophistication. The second is to improve the things that most affect whether real users get real value. These two paths are not the same, and they diverge more dramatically than most builders expect.

An improvement roadmap grounded in the right principles helps you choose the second path consistently, even when the first path is more technically tempting.

---

## 18.1 The Foundation: User-Driven Improvement

### What This Means

User-driven improvement means that every decision about what to improve next is made primarily on the basis of what your users say they need, what your testing shows is failing them, and what your validation reveals about the gap between your current application and the experience you intended to provide. It is the opposite of technology-driven improvement, which is making decisions based on what is technically interesting, newly available, or impressive to demonstrate.

### Why It Matters

The reason user-driven improvement matters is grounded in the purpose of your project. You are not building a showcase of AI technology. You are building a tool that helps Deaf students understand their lectures. Every hour you spend improving something that does not affect Riya's ability to understand Tuesday's lecture is an hour that could have been spent on something that does.

This does not mean technical quality is unimportant. Better transcription accuracy, smoother animation, more reliable synchronisation — these directly affect the user experience and are worth pursuing. What is not worth pursuing is improving things that users have not asked for, have not noticed, or that serve your interests as builders more than their interests as learners.

### Real-World Example

Consider a sign language avatar application built by a university research team. After their initial release, they spent six months improving the photorealism of their avatar's skin texture and hair rendering. The avatar looked strikingly more lifelike. They ran user evaluations and found that user satisfaction had barely changed. When they asked users why, users said: "I never looked at the hair. I was always watching the hands." The six months had been well spent technically and wasted practically.

Compare this to another team that, after talking to users, discovered that the single most common complaint was that the avatar sometimes showed the wrong sign for words that happened to have similar spellings. They fixed this contextual disambiguation problem in two weeks and saw a measurable improvement in user-reported comprehension. Two weeks well spent.

### Common Beginner Mistakes

**Mistake one: Improving what you find interesting rather than what users need.** This is the hardest mistake to avoid because the things you find technically interesting often feel important and valuable. They may be both. But if users are not asking for them and your testing is not revealing them as problems, they are not your highest priority.

**Mistake two: Improving based on one user's feedback.** One user's strong preference is not necessarily representative. If one person tells you the avatar's walking animation is distracting, that is worth noting. If three out of five users independently mention the same issue, that is a signal to act on.

**Mistake three: Improving without measuring the baseline.** If you do not know how the current version is performing, you cannot know whether an improvement actually helped. Before making a significant change, document the current state clearly enough that you can compare the before and after.

### Risks If Ignored

If you do not practice user-driven improvement, your roadmap will drift toward technical showmanship. Each new version will be more impressive to demonstrate and less useful to the students who depend on it. The gap between what your application can do and what it does for real users will widen over time, even as the technical complexity increases.

### How to Validate It

Keep a simple record of where your improvement ideas come from. For each improvement you complete, note whether the idea originated from user feedback, from testing findings, or from the team's own interest. Over time, aim for more than 60% of your improvements to be traceable to user feedback or testing. If the proportion falls below 40%, you are likely drifting toward technology-driven development.

### Success Criteria

User-driven improvement is working when: users who have been with the application for three months report that the things they mentioned as frustrating in month one have been addressed; your improvement log shows a direct connection between user feedback and subsequent changes; and your testing reveals fewer and fewer of the same failure modes over time.

### Key Takeaways

Improvement is a discipline with a clear principle: improve what users need, not what you find interesting. The principle sounds simple. Holding to it consistently, under the pressure of technical curiosity and the excitement of new capabilities, is genuinely difficult.

### Relevant Research Areas and Papers to Explore

**Research fields:** Software Maintenance, Iterative Development, Continuous Improvement in Accessibility Technology

**Search keywords:**
- "iterative improvement accessibility software"
- "post-deployment bug discovery patterns"
- "user feedback driven development"
- "software stability improvement methods"

**Important concepts to explore:** The concept of **technical debt** — the accumulated cost of shortcuts taken during rushed development — is relevant to understanding why stabilisation is important. Search "technical debt software" to find readable explanations. Martin Fowler's writing on refactoring and technical debt is accessible and relevant.

**Why they matter:** Understanding that instability often comes from accumulated shortcuts during initial development helps you approach improvement strategically rather than just reactively.

**What can realistically be reused:** The frameworks for prioritising which instabilities to fix first — based on frequency, severity, and user impact — are directly applicable to your planning process.

---

## 18.2 Phase One: The Immediate Post-Hackathon Window

### What This Means

Phase one is the period immediately following your hackathon submission — roughly the first one to three months after July 1. This phase is about addressing the limitations you discovered during building and testing, incorporating the feedback from the competition's final presentation day, and making the application stable and reliable enough for regular use by a small group of real users.

The defining characteristic of phase one is *refinement, not expansion*. You are not adding major new features. You are making what you already have work better for the users who have it.

### Why This Phase Matters

After a hackathon, there is a natural tendency to immediately think about the next ambitious thing — more signs, live microphone mode, mobile support. This tendency should be resisted in phase one, for a specific reason.

Your application, as submitted for the competition, has been tested primarily by you and your team in conditions you controlled. It has been presented to judges who gave brief, broad feedback. It has not been used by real Deaf students over an extended period in real classroom conditions. When real users start using it, they will find things that none of your testing revealed. Phase one is about discovering those things and fixing them before they cause the application to be abandoned.

### What Phase One Improvement Looks Like

The improvements appropriate for phase one fall into four categories.

**Stability improvements.** These address crashes, hangs, unexpected failures, and cases where the application produces no output rather than partial output. Every stability problem should be treated as a priority because users who encounter unexpected failures do not typically give a second chance. They leave and do not return.

**Accuracy improvements.** Based on your testing findings and early user feedback, there will be specific, identifiable accuracy problems. Perhaps certain types of Bengali sentences are consistently transcribed poorly. Perhaps the simplification step regularly fails for very short phrases. Perhaps certain common educational words are consistently mapped to the wrong gloss. Each of these represents a specific, addressable improvement.

**Usability improvements.** These address the interface confusions revealed by your user experience testing. Perhaps users are not finding the seek bar, or the caption display is difficult to read in a bright room, or the concept card fallback appears in a way that is easy to miss. These improvements do not change the core functionality but make it more accessible.

**Feedback and monitoring improvements.** Before phase one ends, you want to have some way of knowing when things are going wrong. A simple mechanism for users to flag when the application is not working for them — even just a clearly visible "report a problem" link — gives you early warning of issues that would otherwise be invisible.

### Real-World Example

Consider a team that launches their first version with great excitement. Within two weeks, they receive messages from three users saying that the application works fine at home but gives them error messages at their university. Investigation reveals that the university's wifi blocks requests to one of the external services the application uses. This is a stability issue they had never encountered in testing because they had always tested at home.

Fixing this — even just providing a clear message that explains what is happening and suggests what the user can do — is a phase one improvement. It is not technically glamorous. It is absolutely essential.

### Risks If You Rush Past Phase One

Rushing past phase one to add major new features before the core application is reliable is a common and consequential mistake. What happens is this: you add exciting new capabilities on an unstable foundation. The instability becomes harder to diagnose and fix because it is now entangled with the new features. Users who encounter the instability do not know whether the problem is in the original features or the new ones. The application becomes harder to maintain, harder to improve, and ultimately less useful despite the expanded feature set.

### How to Validate Phase One Progress

At the end of phase one, take the list of the five most significant stability, accuracy, and usability problems you identified at the start. Confirm that each one has been addressed, either by fixing it or by adding a graceful fallback that prevents it from causing a poor user experience. Run your full testing checklist again. The results should show measurable improvement on the specific problems you targeted.

### Relevant Research Areas and Papers to Explore

**Research fields:** Software Quality Assurance, Bug Triage Methodology, Accessibility Software Lifecycle

**Search keywords:**
- "post-launch software stabilisation methodology"
- "bug severity classification user impact"
- "accessibility software quality assurance"
- "user feedback triage software projects"

**Why they matter:** Understanding how to classify and prioritise post-launch bugs by user impact — rather than technical complexity — helps you spend phase one time on the right things.

**What can realistically be reused:** Bug severity frameworks that weight issues by how many users are affected and how severely give you a structured approach to phase one prioritisation.

---

## 18.3 Phase Two: Expanding What Works

### What This Means

Phase two is the period from roughly three to nine months after the initial launch. This phase is about carefully expanding the application's capabilities in the directions that your real users — not your assumptions about users — have most clearly indicated they need.

The defining characteristic of phase two is *targeted expansion*. You are adding new capabilities, but only the specific new capabilities that your evidence shows will most meaningfully improve the user experience. You are not adding features because they are technically interesting or because they appeared in the initial vision. You are adding features because users have asked for them, or because your testing has revealed gaps that limit how much value users can get from the existing features.

### Why This Phase Matters

Phase two is where many projects make their biggest mistakes, because it is the phase where ambition returns. The initial work has been done, the foundation seems stable, and the temptation to add the exciting features you did not have time for in phase one is very strong.

The protection against poor decisions in phase two is the same as it is everywhere in this project: evidence from real users. Before adding any new capability in phase two, you should be able to answer: "Which of our current users asked for this? How many times? What problem does it solve for them that they cannot currently solve?"

### The Most Valuable Phase Two Improvements

Based on what you know about the project and the users, here are the improvements most likely to deliver high value in phase two.

**Expanded sign dictionary.** Going from 30–80 signs to 200–400 signs meaningfully increases the proportion of lecture content that can be signed rather than shown as concept cards. But the specific signs added should be chosen based on which words appear most frequently in the lectures your users actually attend — not on which signs are easiest to create or which words appear most frequently in generic educational text. This requires knowing your users and their actual content.

**BdSL community input.** Phase two is the time to establish a genuine relationship with the BdSL community — to show existing signs to community members, receive corrections and suggestions, and begin building a process for community validation of new signs. This is not just ethically important; it directly improves the quality and trustworthiness of your sign dictionary.

**Better language handling for Bengali.** If your testing has shown that mixed Bengali-English academic speech is a significant challenge for transcription, phase two is the time to specifically address this. The improvement might come from better prompting, from user feedback mechanisms that allow corrections, or from specific optimisation for the code-switching patterns common in Bangladeshi academic lectures.

**Improved fallback quality.** The concept card fallback — shown when a word has no sign — is something your users encounter frequently, especially for technical vocabulary. Improving the quality of concept card explanations, adding simple illustrations where possible, and ensuring that the fallback integrates smoothly with the overall experience is a high-value improvement that directly serves your users.

### Common Beginner Mistakes

**Mistake one: Adding features that are visible in demos but not valuable in use.** A sophisticated new animation for how the avatar transitions between signs looks impressive in a demonstration but may not meaningfully affect comprehension. A better concept card explanation for a confusing technical term does not look impressive but directly helps a student who needs to understand that term. Choose the second type of improvement.

**Mistake two: Improving in ways that break existing behaviour.** Every improvement in phase two carries the risk of breaking something that was working in phase one. Before releasing any significant phase two improvement, run the full testing checklist from Section 17 to confirm that existing functionality is intact.

**Mistake three: Trying to do too many things at once.** Phase two improvements should be done one at a time or in small, focused batches. Making many changes simultaneously makes it impossible to know which change caused a problem when something breaks.

### Relevant Research Areas and Papers to Explore

**Research fields:** Sign Language Dataset Construction, Community-Driven Language Documentation, Iterative Product Development

**Search keywords:**
- "sign language dictionary construction methodology"
- "community-based sign language documentation"
- "participatory sign language corpus"
- "iterative user-centered design accessibility"

**Important research to explore:** The field of **language documentation** — the practice of formally recording endangered or under-documented languages — has relevant methodology for BdSL dictionary expansion. Researchers like Nick Evans have written accessibly about language documentation ethics and methods. Search "language documentation methodology" for foundational reading.

Research on **community-validated sign language dictionaries** — how Deaf communities validate and agree on signs for new vocabulary — is relevant to how you expand your dictionary in a way the community will accept. Search "sign language dictionary community validation" for papers from linguistics researchers who have studied this process.

**Why they matter:** These sources give you a principled approach to dictionary expansion that goes beyond technical quality to cultural appropriateness and community trust.

**What can realistically be reused:** Documentation methodology for recording and storing signs, ethical guidelines for community involvement, and frameworks for handling regional variation in sign vocabulary are all directly applicable.

---

## 18.4 Phase Three: Deepening the Core Capability

### What This Means

Phase three is the period from roughly nine to eighteen months after the initial launch. This phase is about deepening the core capability of the application — moving from a system that handles common cases well to a system that handles a genuinely broad range of academic content reliably.

Phase three is also, importantly, about building the infrastructure that would allow the application to be used by many more people — not just the small initial user group, but potentially hundreds or thousands of Deaf students across Bangladesh.

### Why This Phase Matters

Up to this point, your improvements have been mostly about quality and reliability for a small group of users. Phase three is about the question that sustainability and scale require: can this application work for any Deaf student, at any Bangladeshi university, studying any subject?

This is a fundamentally different and more demanding standard than "can this work for Riya, studying computer science at her specific university."

### The Most Valuable Phase Three Improvements

**Real-time motion capture integration.** The MediaPipe-based sign capture approach described in the project architecture could, in phase three, become a genuine community tool — a way for Deaf BdSL users to contribute signs by recording themselves, with the system automatically extracting and adding those signs to the dictionary. This transforms sign dictionary expansion from a bottleneck (requiring manual animation work) to a community-powered process.

**Subject-specific vocabulary packs.** Different academic subjects require different vocabulary. A biology student needs signs for cellular processes. An engineering student needs signs for mechanical and electrical concepts. A law student needs signs for legal terminology. Phase three is the time to create subject-specific vocabulary packs, developed in consultation with Deaf students and sign language interpreters in each field.

**Personalisation.** Different users have different needs and preferences. Some want faster signing speed, some slower. Some want larger captions, some smaller. Some want the avatar prominently displayed, some want it compact. Phase three is the time to allow meaningful personalisation that lets each user configure the experience for their specific needs.

**Collaboration with sign language interpreters.** Professional sign language interpreters have knowledge and skills that can directly improve your application's quality — they know what makes signing natural and grammatically correct, they understand the specific challenges of academic content, and they can identify where automated systems make systematic errors. Building relationships with interpreters and creating mechanisms for their input is a phase three priority.

### Relevant Research Areas and Papers to Explore

**Research fields:** Crowdsourced Language Resources, Sign Language Corpus Building, Personalised Accessibility Systems

**Search keywords:**
- "crowdsourced sign language dataset"
- "community-driven language resource construction"
- "personalised accessibility technology"
- "sign language interpreter technology collaboration"

**Important research to explore:** Research on **crowdsourced annotation** and **community-built language corpora** is highly relevant to the goal of community-powered sign dictionary expansion. The Common Voice project from Mozilla is an excellent case study in how to ethically crowdsource spoken language data — the principles translate to sign language.

Research on **adaptive accessibility systems** — systems that learn and adapt to individual user preferences over time — is relevant to personalisation. Search "adaptive accessibility personalisation" for relevant papers from the HCI and accessibility communities.

**Why they matter:** Moving from a team-maintained to a community-maintained resource is a fundamental shift in how the project works. Understanding the research on how to do this well — including the ethical dimensions of community data contribution — is essential preparation.

**What can realistically be reused:** The frameworks for community contribution platforms (how to make contributing easy and rewarding), quality control mechanisms for community-contributed content, and privacy-preserving approaches to data collection are all applicable.

---

## 18.5 Deciding What to Improve Next

### What This Means

Throughout all three phases, you will constantly face the question: of all the things we could improve, what should we work on next? This is a decision-making challenge, and having a clear process for it prevents the drift toward improving what is technically interesting rather than what is most needed.

### The Improvement Priority Framework

Here is a simple framework for deciding what to improve next, at any phase of the project.

**First, gather evidence.** What are users saying? What does your testing show? What do your monitoring tools (if any) indicate about where the application is failing?

**Second, categorise by impact.** For each potential improvement, estimate: if we made this change, how many users would benefit? How significantly would their experience improve? A change that meaningfully helps 80% of your users is more valuable than a change that greatly improves the experience for 5%.

**Third, categorise by effort.** For each potential improvement, estimate how much time and effort it would require. Some improvements are high-impact and low-effort — these are the obvious priorities. Some are high-impact but high-effort — these require careful scheduling. Some are low-impact regardless of effort — these should be deprioritised or declined.

**Fourth, check for dependencies.** Some improvements unlock others. Improving transcription accuracy may make gloss generation more reliable, which makes avatar synchronisation more meaningful. Prioritising improvements that unlock other improvements accelerates overall progress.

### Relevant Research Areas and Papers to Explore

**Research fields:** Product Management, Feature Prioritisation, Accessibility Technology Roadmapping

**Search keywords:**
- "feature prioritisation product management"
- "impact effort matrix product development"
- "accessibility roadmap planning"
- "user value driven development"

**Important concepts:** The **RICE scoring framework** (Reach, Impact, Confidence, Effort) from Intercom is a practical tool for prioritising improvements. Search "RICE scoring feature prioritisation" for explanations and examples. The **Kano model** — which distinguishes between features that users expect, features that users value, and features that delight but are not expected — is another useful framework for improvement prioritisation in the context of an accessibility application.

**Why they matter:** Having a named, documented framework for prioritisation makes it easier to have productive team discussions about what to work on next, and makes it easier to explain your decisions to advisors, judges, or collaborators.

**What can realistically be reused:** Both the RICE framework and the Kano model can be applied directly with a simple spreadsheet. They require no special tools and can be updated weekly in a few minutes.
