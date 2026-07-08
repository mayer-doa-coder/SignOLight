# Biggest Risks in This Project

## Why Thinking About Risk Is an Act of Courage, Not Pessimism

There is a natural human tendency, especially when you are excited about a project, to avoid thinking about what could go wrong. Thinking about failure feels like inviting it. Acknowledging risk feels like admitting weakness. If you just focus on the positive, the thinking goes, things will work out.

This is one of the most costly mental habits a builder can have.

Thinking carefully about risk is not pessimism — it is the most responsible thing you can do for your users and your project. If you build something for Riya that she begins to rely on and it fails in a critical moment — mid-exam, mid-lecture, mid-semester — you have not just inconvenienced her. You have broken her trust, possibly made her academic situation worse, and potentially contributed to her feeling that technology is not built for people like her. That is a meaningful harm.

Here is how to think about risk correctly. A risk is not a certainty — it is a possibility with a certain likelihood and a certain impact. Some risks are highly likely but low impact. Some are unlikely but catastrophic. The ones you must pay the most attention to are the ones that are both fairly likely and have a significant impact on your users.

We will walk through the seven biggest risks in your specific project, one by one.

---

## Risk One: The Accuracy Problem — When Being Wrong Is Worse Than Being Silent

Your application converts spoken lecture content into captions and then into sign language gloss. At every step in that chain, errors can accumulate. The speech recognition might mishear a word. The simplification step might change the meaning of a sentence. The gloss might reorder words incorrectly. The avatar might perform a sign that is close to the target sign but actually means something different.

For a hearing student following along with captions as a supplement to audio they can already hear, a small error is minor — they catch it from the audio and correct their understanding. For a Deaf student who is relying entirely on the caption, a wrong caption is not a minor issue. It can mean they write down the wrong concept in their notes. It can mean they study the wrong thing for an exam. It can mean they make an error in a practical assignment because they misunderstood a crucial instruction.

Now consider a more serious case. The professor says, "This method should NOT be used in production code — it has a critical security vulnerability." Your speech recognition mishears "NOT" and the caption reads, "This method should be used in production code." Riya, following the captions, writes the opposite of the truth in her notes.

This is the accuracy risk. It is not about your system being imperfect — every system is imperfect. It is about whether your users know when to trust the output and when to verify it.

The mitigation here has two parts. First, be transparent about confidence. Where possible, indicate to the user when the system is uncertain — not through complex technical displays, but through simple visual signals. A caption shown in slightly dimmer text might indicate lower confidence. A sign shown with a question mark overlay might indicate the system found a similar but not identical match.

Second, and most importantly, design your application so that the caption is always visible alongside the signed content. The avatar should never replace the caption entirely. The two together give the user a way to cross-reference and catch inconsistencies.

---

## Risk Two: The Demo-Reality Gap — The Problem With Perfect Conditions

There is a very specific pattern that kills student projects, startup products, and even well-funded enterprise software: it works beautifully in the demo and breaks in reality.

The demo is always performed in controlled conditions. The person demonstrating speaks clearly, at a normal pace, facing the microphone directly. The room is quiet. The internet is fast and stable. The lecture content uses common words that the system handles well. Everything is set up in advance and rehearsed.

Real life is nothing like this.

A Bangladeshi university lecture hall has dozens of people shifting in their seats, air conditioning noise, traffic sounds from outside, a professor who mumbles when he turns to write on the board, a microphone that is ten feet from the speaker, a student's laptop that is running five other applications, and a campus wifi network that drops connections during peak hours.

The gap between your demo conditions and real use conditions is not a minor technical problem — it is one of the primary reasons why accessibility technology gets abandoned by users. The student tries it, it fails under real conditions, and they never trust it again.

The mitigation is to test your application in conditions that are as close to real as possible, as early as possible. Not just on your own laptop in your quiet room, but on a mid-range smartphone in a noisy café with a YouTube video playing in the background. Not just with clear speech you prepared yourself, but with actual lecture recordings from real university courses, with all their imperfections.

Every time you find a failure mode under real conditions, you learn something. Every time you discover that your system breaks when someone speaks too fast, or when there is background music, or when two people speak at once — you have a chance to either fix it or, if you cannot fix it yet, to be honest with users about its limitations.

---

## Risk Three: The Adoption Gap — Building Something Nobody Uses

This risk is perhaps the most emotionally painful because it happens after the work is done. You build the application. You deploy it. It is technically functional. And then nobody uses it.

Adoption failure can happen for many reasons. Users may not know the tool exists. Users may not trust a new, unfamiliar tool with something as important as their education. Users may find the initial setup confusing enough that they give up before experiencing the value. Users may have tried a similar tool before that disappointed them and may assume yours will too. Users may feel that using an assistive technology tool in class makes them visibly different from their peers and attracts attention they do not want.

That last point deserves extra attention. Many disability researchers have documented what is called the "visibility problem" with assistive technologies — users avoid using helpful tools because the tools themselves signal their difference to others. A Deaf student who opens a conspicuous application on their screen with a large, bright avatar may draw stares from classmates that make them feel more excluded, not less. This is counterintuitive from a designer's perspective but very real from a user's perspective.

The mitigation begins early. Talk to potential users not just about whether they would use a tool like this in theory, but specifically whether they would use it in a public lecture hall where classmates might see it. Ask about their comfort level. Design the interface to be usable at lower brightness and smaller size if needed. Consider a "minimal mode" that shows only captions without the avatar for situations where the user prefers discretion.

---

## Risk Four: The Timeline Trap — Too Much Ambition, Too Little Time

Your project has an enormous scope. Real-time audio processing. Bangla and English transcription. Language simplification. Sign gloss generation. A 3D avatar with facial expressions. Timeline synchronization. YouTube integration. Live microphone input. These are individual research areas that people spend entire PhD programs on.

You have until July 1.

The timeline trap is one of the most predictable risks in hackathons specifically. The team is ambitious. In the first weeks, there are more ideas than time. Features keep being added. Each new feature feels important and achievable. And then suddenly it is ten days before the deadline, nothing is fully working, the demo is broken, and the team is exhausted.

The mitigation is a concept called **scope control**, and it requires that someone on your team be willing to say "no" — not because these features are not valuable, but because shipping something excellent in its core function is more valuable than shipping ten things that half-work.

In a competition context, judges evaluate what they can see working. A perfect demo of three features will outscore a broken demo of twelve features every single time. The question to ask constantly is: "What is the smallest version of this application that would still make Riya's life meaningfully better?" Build that version first. Add to it only if time allows.

---

## Risk Five: The Cultural Risk — Well-Intentioned but Disrespectful

We touched on this in Section 5, but it deserves its own entry in the risk register. It is possible to build an application that is technically impressive and well-intentioned but that the Deaf community finds offensive, patronising, or harmful.

Specific examples of how this can happen:

- If your avatar signs in a way that is visually similar to BdSL but grammatically wrong in significant ways, native BdSL users may find it irritating — like a foreigner insisting on speaking your language badly and loudly rather than using a translator.
- If your marketing or presentation language describes Deaf people as suffering from a disability that technology heroically overcomes, Deaf-identified users may feel their identity and culture are being treated as a problem to be fixed.
- If you make design decisions without any input from actual BdSL users — about which signs to include, how the avatar should move, what language to use in the interface — you are essentially making assumptions about what the Deaf community needs without asking them.

The mitigation here is not complicated: involve Deaf people in your design process. Even one conversation. Even one review session. Even one email to a Deaf student organization asking for feedback. It will not make your project perfect, but it will show respect and catch the most obvious missteps.

---

## Risk Six: External Dependencies — When Someone Else's Decision Breaks Your Project

Your application relies on several external services that you do not control. If a speech recognition API changes its pricing, your project might become too expensive to run. If an AI service temporarily goes down, your entire pipeline fails. If a library you depend on updates in a way that breaks your integration, your demo might stop working on the morning of your presentation.

This is not a theoretical risk. External service disruptions are a normal part of building software, and they tend to happen at the worst possible moments.

The mitigation has two layers. First, always have a backup plan for your live demo. A pre-recorded demonstration video that shows the application working perfectly is worth having ready regardless of technical confidence. If something breaks during the live demo, you show the video instead of showing a broken screen to judges.

Second, where possible, reduce the number of steps in your pipeline that depend on external services being live and responsive. The more external dependencies you have, the more points of failure you have.

---

## Risk Seven: The Proxy Metric Problem — Measuring the Wrong Thing

This risk is subtle but deeply important. It happens when you start optimising for things that are easy to measure rather than things that actually matter.

**Easy-to-measure things:** the number of signs in the dictionary, caption latency in milliseconds, avatar polygon count, percentage of words successfully recognised, number of academic papers cited in your approach.

**Hard-to-measure but actually important things:** did Riya understand the lecture? Did she feel respected using the application? Did she miss fewer exam questions after using the tool? Did she feel more confident in class?

The proxy metric problem occurs when you spend your last two weeks before submission polishing avatar facial expressions that users have never seen or asked for, while captions are still occasionally displaying gibberish that undermines trust.

The mitigation is to return regularly to the human measure of success: go back to Riya's story. The question is not "how many signs does the avatar know" but "did Riya understand Tuesday's lecture?" Every time you are tempted to add or perfect a feature, ask whether it moves that needle.

---

## Common Beginner Mistake: Treating Risk Management as a One-Time Activity

Many students do a risk analysis once, early on, and then never revisit it. They list the risks, feel responsible for having done so, and move on. But risks evolve. New risks emerge as the project develops. A risk that seemed minor in Week 1 might become critical in Week 5.

The mitigation is simple: take five minutes at the start of each working session to ask "What could go wrong this week that we haven't planned for?" This does not need to be formal. It can be a conversation. But it should be regular.

---

## How to Know This Phase Is Successful

You have completed the risk analysis successfully when you can name at least five specific risks to your project, explain what each one looks like when it materialises, describe one specific action you have taken or will take to reduce each one, and identify which risk you are most worried about and why. You should be able to have this conversation without a document in front of you — the risks should be alive in your mind throughout the building process.
