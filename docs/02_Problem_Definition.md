# Problem Definition

## What Is a "Problem" in a Product Context?

There is a difference between a problem and a pain. A pain is general discomfort. "Deaf students have a hard time in class" is a pain. A problem, in the context of building something, is specific, observable, and caused by a particular gap in the world.

A well-defined problem has three parts:

1. There is a specific person experiencing the difficulty.
2. There is a specific situation where the difficulty occurs.
3. There is a clear gap between what they need and what currently exists.

Here is an example of a **poorly defined problem**:

> *"Deaf students struggle with education."*

Here is the same problem **defined properly**:

> *"A Deaf student attending a university lecture in Dhaka has no real-time access to what the professor is saying, because no automated captioning tool supports Bangla, no sign language interpreter service is affordable or widely available, and existing foreign accessibility tools do not address the local language and sign system."*

Notice the difference. The first version is too vague to guide any decisions. The second version tells you exactly what to build, who for, in what context, and why existing solutions fail.

---

## The Specific Problem Your Project Solves

Let's break down the problem your project addresses into layers, like peeling an onion.

### Layer One: The Language Barrier

Most classroom instruction in Bangladeshi universities happens in Bangla, with some English technical terms mixed in. Existing captioning tools like Google's live captions or YouTube's automatic subtitles were designed for English speakers and perform poorly on Bangla speech, especially academic Bangla mixed with technical vocabulary. A deaf student who uses Bangla Sign Language cannot simply turn on a foreign tool and expect it to work.

### Layer Two: The Sign Language Gap

Even when a deaf student can read written Bengali captions, the problem is not fully solved. For many Deaf individuals, especially those who have been Deaf from birth, written Bengali or English is actually a second language. Their first language — the one they think in, dream in, and understand most naturally — is Bangla Sign Language. Written text at academic speed is cognitively demanding in a way that watching sign language is not. A caption that says "The compiler converts source code into machine-readable instructions" may mean very little in written form, but shown as a signed explanation with simplified language, it becomes accessible.

### Layer Three: The Real-Time Requirement

Lectures are live. Information arrives quickly, is not repeated, and builds on itself. If a student misses what a compiler does in the first five minutes, the next twenty minutes about compilers will not make sense either. Unlike reading a textbook where you can pause and re-read, a live lecture requires real-time processing. Any solution that does not work in real time, or very close to it, does not solve the core problem.

### Layer Four: The Context Problem

A generic accessibility tool that simply captions any content is not the same as a tool built specifically for academic lectures. Lectures use domain-specific vocabulary, reference previous concepts, have a specific rhythm and structure, and involve a single authority figure conveying structured knowledge. A system designed for this context needs to handle technical terms, maintain coherence across a lecture, and handle the mix of formal instruction and casual clarification that teachers naturally use.

---

## Why This Problem Has Not Been Solved Already

This is an important question to ask. If the problem is so clear, why has no one solved it? The answer tells you something about the difficulty and the opportunity.

The problem has not been solved because it sits at the intersection of several hard technical areas — speech recognition, natural language processing, sign language linguistics, and real-time graphics — that rarely overlap in academic or industry research. Most speech recognition research is done in English. Most sign language technology research focuses on American Sign Language or British Sign Language. Most accessibility tools are built for Western, English-speaking markets where the commercial opportunity is perceived as larger.

Bangladesh has approximately 2.7 million Deaf people. Most accessibility technology companies do not see this as a large enough market to invest in. This is actually an opportunity for a student team — because the bar for existing competition is low, and the need is real.

---

## Common Beginner Mistake: Building the Solution You Want Rather Than the Solution Users Need

This is probably the most costly mistake you can make in the problem definition phase. It goes like this: you see a problem, you imagine a solution, you become excited about the solution, and from that moment on, every conversation you have is secretly about confirming that your solution is right.

This is called **confirmation bias** and it will lead you to build something that looks impressive technically but that real users do not actually need or use.

Here is a concrete example. Imagine you are very excited about the 3D avatar. Every time you think about the problem, you picture the avatar as the central solution. So you conduct a "user research" conversation with a Deaf student, and you ask, "Would it help to have an animated avatar showing you sign language in lectures?" Of course they say yes — who would say no to more accessibility?

What you should have asked is: **"Walk me through what happens when you attend a lecture you cannot hear. What do you do? What do you wish existed?"** If you ask that open question, you might discover that the most urgent need is not the avatar — it might be reliable captions first, because the avatar is not useful without understanding the text. You might discover that the student's biggest pain is not during the lecture but in the week after, when they try to find study materials they can access.

Do not ask questions that confirm your hypothesis. Ask questions that challenge it.

---

## Risk: Solving the Wrong Problem

If you define the problem incorrectly, everything you build is correct for the wrong problem. This is painful because the work still feels productive — you are making progress on features, the app looks impressive, the demo is smooth. But when you show it to real users, you discover that it does not fit into their actual life. They don't use it. Or they use it briefly and stop.

The risk of solving the wrong problem is highest when you build in isolation, when you stop talking to users once you start coding, and when you treat the user interview as a one-time formality rather than an ongoing practice.

---

## Validation Methods for Your Problem Definition

Here are three ways to validate that you have defined the problem correctly.

### Method One: Observation, Not Interview

Find a way to watch a Deaf or Hard-of-Hearing student navigate an actual class or lecture. Not a simulation. Not a role-play. Actual attendance if possible. What you see with your own eyes will tell you things that no interview ever will. Notice where they lean forward. Notice when they look frustrated. Notice what they do when they miss something — do they ask a neighbour? Do they check their phone? Do they write a question down? This is called **contextual observation** and it is the gold standard of problem validation.

### Method Two: The Newspaper Test

Imagine a journalist writing an article about a problem with deaf education in Bangladesh. Would the problem you've defined be the headline? Or would it be a small footnote? If your problem feels too narrow ("deaf students don't have Bangla sign language for computer science vocabulary"), it might not be the root problem. If it feels too broad ("deaf people face challenges in society"), you need to narrow it.

### Method Three: Problem-Solution Fit Check

Write the problem down in one clear paragraph. Then write down your proposed solution. Then ask: if someone solved this problem completely and perfectly, would your solution be a reasonable description of how they did it? If yes, you have problem-solution fit. If the problem and solution feel mismatched — for example, if the problem is about captions but your solution is primarily about avatars — you have work to do.

---

## How to Know This Phase Is Successful

You have defined your problem correctly when you can state it in one or two sentences that describe a specific person, a specific situation, and a specific gap. When someone hears your problem statement and says "Yes, that's a real problem, I've seen that" — and that someone is from the target community, not just a classmate — you are ready to move on.
