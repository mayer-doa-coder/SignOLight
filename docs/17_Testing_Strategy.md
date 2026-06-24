# Testing Strategy

## Opening: The Difference Between Building and Knowing

There is a specific confidence that comes from building something yourself. You designed the system. You know what each part is supposed to do. You have watched it work. You have a deep, intuitive sense that it is going to work again.

This confidence is valuable. It is also unreliable as a substitute for evidence.

Testing is the discipline of generating evidence that your application works as intended — not just in the conditions you designed it for, but in the range of conditions your users will encounter. Good testing finds the failures before your users do. It replaces the question "I think it will work" with "I know it works in these conditions, I know it struggles in these other conditions, and I know what my users can expect."

For your specific application, testing is particularly important because your users — Deaf and Hard-of-Hearing students — are relying on your application for something that actually matters to their education. A bug that causes a minor inconvenience for a casual user causes a real problem for someone who is depending on captions to understand a lecture.

---

## 17.1 Understanding the Types of Tests Your Project Needs

### What This Means

Different types of tests serve different purposes. The most important types for your project are:

**Component testing:** Does each individual part of your pipeline produce the right output? Does the transcription work? Does the simplification step produce clearer sentences? Does the gloss generation produce sign-language-appropriate output?

**Integration testing:** When all the parts are connected together, does the whole pipeline work? Does the output of the transcription step flow correctly into the simplification step? Does the gloss connect correctly to the avatar?

**Performance testing:** Does the system work fast enough to be useful? Does it maintain acceptable speed across a full lecture length? Does it hold up under repeated use?

**User experience testing:** Can a real user find and use the features they need without confusion? Does the interface present information in a way that is actually accessible?

**Edge case testing:** What happens in unusual conditions — very fast speech, heavy background noise, multiple simultaneous speakers, an extremely long lecture, internet interruptions?

**Regression testing:** After you make a change to fix one problem, does everything that was working before still work?

### Why It Matters

Without a systematic testing approach, you will find bugs during your demo — in front of judges. This is not a theoretical risk. It happens to most teams who do not test systematically. The internet drops for two seconds during the demo, and no one knows whether the system will recover gracefully. The professor in the test lecture speaks with an unusual accent, and the transcription output becomes unreliable. The user clicks the seek bar and the avatar freezes.

Testing converts unknown failure modes into known ones. You discover the failures privately, in your own testing environment, where you can fix them or design around them before they surprise you publicly.

### Real-World Example

Consider a well-known story from product development: in the early days of smartphone keyboards, one major manufacturer tested their keyboard extensively with professional typists who were experienced and accurate. They did not test with casual users who typed quickly with thumbs and made many errors. When casual users encountered the keyboard, autocorrect errors caused significant embarrassment and frustration. The product failed not because of a technical bug but because testing was done with the wrong users under the wrong conditions.

For your application: if you test only with clear-speech lecture recordings from a professional studio, you will not discover that the system struggles with the fast, mumbled delivery of a real university professor explaining something at the end of a two-hour lecture when he is tired. Testing with realistic conditions is essential.

---

## 17.2 Component Testing: Testing Each Part of the Pipeline

### Testing the Transcription Component

**What to test:** Accuracy across multiple speech styles, languages, and conditions.

**How to test it:** Gather five to ten lecture recordings that represent the range of real conditions your users will encounter. Include: a clear-speech formal lecture in standard Bengali; a mixed Bengali-English lecture typical of computer science or engineering courses; a lecture with a strong regional accent; a lecture recorded in a room with noticeable background noise; and a lecture where the speaker speaks faster than average.

For each recording, compare the transcription output to what was actually said. Count the number of meaningful errors — not minor punctuation differences, but actual word substitutions, missed words, or added words that change meaning. Calculate an approximate error rate per minute of speech.

Define your threshold. Based on the research you have done in Section 15, what error rate is acceptable for educational captioning? Most accessibility research suggests that captions with error rates above 5-10% (roughly one meaningful error per ten to twenty words) become significantly less useful for comprehension. Set your threshold and compare your measured performance against it.

**Document what you find.** If your system achieves 3% meaningful errors on clear Bengali speech but 15% on fast mixed-language speech, that is important information. It tells you in what conditions the application should be used with more caution, and it is honest information to include in your project report's limitations section.

### Testing the Simplification Component

**What to test:** Does the simplified output preserve the educational meaning of the original while being more accessible?

**How to test it:** Take ten passages of academic lecture text — at least 60 words each — from real lectures. Run each through your simplification step. For each pair (original and simplified), evaluate three things:

First: meaning preservation. Does the simplified version convey the same core educational content? Note any information that was lost or any meaning that changed.

Second: readability. Is the simplified version genuinely easier to read? Reading level tools (available online) can provide a rough reading level assessment, though they are not perfect for Bengali text.

Third: accuracy. Has simplification introduced any factual errors? Compare specific factual claims in the original to the simplified version.

**Document what you find.** Simplification is inherently a trade-off between clarity and completeness. Your testing will reveal where your system strikes that balance and where it fails in either direction.

### Testing the Gloss Component

**What to test:** Does the gloss output represent sign-language-appropriate reformulation of the simplified text?

**How to test it:** As described in the validation section, this requires someone with BdSL familiarity. For systematic testing, prepare twenty simplified sentences representing a range of sentence types — statements, questions, negations, definitions, and instructions — and run each through your gloss generation. Present each gloss output to your BdSL reviewer and ask them to rate each gloss as: natural and readable, understandable but grammatically unusual, or unclear or wrong.

Track the proportion in each category. A gloss component that produces natural-and-readable output for at least 50% of test sentences, with fewer than 20% rated as unclear or wrong, is performing reasonably for a first-generation system.

### Testing the Synchronisation Component

**What to test:** Does the avatar stay aligned with the video across all normal user actions?

**How to test it:** Create a systematic list of test actions and run each one, noting the outcome:

Normal playback from start to finish (15-minute clip): does the avatar stay in step throughout?
Pause at minute 3, resume: does the avatar continue from the correct position?
Seek forward to minute 10: does the avatar correctly align within 3 seconds?
Seek backward to minute 5: does the avatar correctly align within 3 seconds?
Change playback speed to 0.75x: does the avatar stay aligned?
Change playback speed to 1.25x: does the avatar stay aligned?
Close and reopen the browser tab mid-lecture: does the session recover cleanly?

For each test, note: did it work correctly? If not, what exactly happened? How long did misalignment last? Did the system recover on its own?

---

## 17.3 Integration Testing: The Full Pipeline

### What This Means

After each individual component has been tested, you must test the complete pipeline — from audio input through to avatar signing — as a unified system. Integration testing reveals a specific class of problems that component testing cannot: the problems that arise from components interacting with each other in unexpected ways.

### Why It Matters

A specific example: your transcription component and your simplification component might each work well individually. But if your simplification component is sensitive to punctuation and your transcription component produces inconsistent punctuation, the integration might produce poorly simplified output even though both components are individually acceptable.

Integration failures are common because the boundary between components — how they pass information to each other — is often where assumptions break down. One component assumes the other will always provide a complete sentence. The other sometimes provides an incomplete fragment. Neither is broken; they simply do not fit together perfectly.

### The Integration Test Protocol

Run a complete pipeline test on three full lecture clips, each at least fifteen minutes long, from start to finish. During each test, observe and record:

Does the pipeline stay running throughout? Any crashes, hangs, or silent failures?

Does information flow correctly between stages? Does the caption that appears correspond to what the avatar is signing? Do the timestamps align?

What is the observed end-to-end delay — from spoken word to signed avatar motion? Measure this at multiple points (beginning, middle, and end of the lecture) to detect synchronisation drift.

What happens when the lecture contains no speech for 30 seconds? Does the system handle silence gracefully?

After each integration test, write up your findings in a brief document. This becomes part of your testing evidence for the project report.

---

## 17.4 Performance Testing

### What This Means

Performance testing measures whether your application works fast enough and consistently enough to be useful in real conditions. For your application, there are three specific performance concerns: latency (how long from speech to caption), throughput (can it handle a full 90-minute lecture without degrading), and resource usage (does it work on a normal student's computer and internet connection).

### Latency Testing

Measure, at five different points in a test lecture, the time between a word being spoken and the corresponding caption appearing on screen. Average these measurements. Compare the average to your target (you defined this in Section 9 — roughly 1-2 seconds of acceptable delay). If your average delay is significantly above target, investigate which step in the pipeline is slowest and whether it can be reduced.

### Throughput Testing

Run your application on a 60-minute lecture clip without interruption. Note:

Does latency increase over time (indicating a memory leak or accumulating delay)?

Does caption accuracy change over the course of the lecture (indicating model drift or session-length issues)?

Does the avatar synchronisation hold throughout (no creeping delay)?

Does the browser or application become visibly slower over time?

Any of these would indicate a throughput problem that needs addressing before the demo.

### Network Sensitivity Testing

Since your application depends on external services for processing, test it under degraded network conditions. Throttle your internet connection to simulate a slower connection (university wifi during peak hours often throttles). Observe whether the application handles brief connection interruptions gracefully or breaks silently.

---

## 17.5 Edge Case Testing

### What This Means

Edge cases are the unusual situations that lie outside the normal expected use of your application. They are called edge cases because they happen at the edges of normal use rather than at the centre. They are important to test because they often reveal fundamental assumptions in your system that are wrong.

### The Most Important Edge Cases for Your Application

**Multiple simultaneous speakers.** During a live Q&A, a student asks a question and the professor answers. Your system expects one speaker. What happens? Does it attempt to transcribe both speakers? Does it crash? Does it produce confused output? Test this explicitly with a lecture recording that contains audience questions.

**Very fast speech.** Some professors speak significantly faster than average during segments where they are covering material they consider obvious or less important. Test with a recording that includes at least one such segment.

**Silence and noise.** Long silences (a professor writing on the board for two minutes without speaking) and sections with high background noise (applause, movement, equipment noise) should both be tested explicitly.

**Out-of-vocabulary words.** Prepare a lecture clip that contains at least three words that you know are not in your sign dictionary. Verify that the fallback system (concept cards) activates correctly for each one and that the system does not produce incorrect output.

**Very long technical terms.** A single sentence containing three or four long technical terms (e.g., "The microprocessor architecture implements superscalar pipelining with speculative execution and branch prediction") stresses every part of your pipeline. Test with at least five such sentences.

**Language switching within a single sentence.** This is common in Bangladeshi academic lectures: "The compiler, মানে হলো, it translates your source code." Test with examples of this specific pattern.

---

## 17.6 User Experience Testing

### What This Means

User experience testing specifically evaluates whether a person who has never used your application before can figure out how to use it without instruction.

### Why It Matters

Your application may be technically excellent but presented in an interface that confuses users. This is a real and common failure mode. The value of user experience testing is in discovering the confusion points before users encounter them without your help.

### The Five-Minute Usability Test

Find someone who has not seen your application before — a friend, a classmate, anyone who is approaching it fresh. Give them one task: "You have a lecture video you want to understand. Use this application to help you understand it." Then watch silently. Do not help. Do not explain. Note:

Where do they pause and look uncertain?
What do they click that does not do what they expected?
What do they look for and cannot find?
At what point do they say anything — frustration, surprise, confusion, delight?

After five minutes, ask them: "What do you think this application does? Was anything confusing?" Their answers will reveal interface problems that you are completely unable to see yourself because you already know how everything works.

---

## 17.7 Testing Documentation and Reporting

### What This Means

Testing documentation is the written record of what you tested, how you tested it, what you found, and what you did about it. This documentation serves two purposes: it guides your team's work during the building phase, and it provides evidence for your project report that you have tested your system rigorously.

### Why It Matters

A project report that says "we tested the system and it works well" is vague and unconvincing. A report that says "we tested transcription on eight Bengali lecture recordings with mixed code-switching, finding average word error rates of approximately X%, with higher error rates observed in recordings with significant background noise" is specific, honest, and demonstrates that real testing happened.

Judges understand that a student team's system will not be perfect. What they are evaluating is whether you understand your system well enough to know where it works and where it struggles. Testing documentation provides the evidence that you do.

### The Testing Log

Keep a simple testing log throughout your building process. For each test session, record: the date, what you tested, what you found, and what you changed as a result. This does not need to be elaborate — a shared document or spreadsheet is sufficient.

By July 1, your testing log should contain at least ten entries showing different types of tests on different aspects of the system. This log can be directly referenced in your project report's methodology section.

---

## 17.8 The Pre-Submission Testing Checklist

### What This Means

In the 48 hours before your submission deadline, a specific set of final tests should be run to confirm that everything is working in the exact form you are submitting.

### The Checklist

The night before you prepare your final submission:

Run the complete pipeline on your primary demo lecture clip from start to finish. Confirm that the output looks and behaves as you expect. If anything is wrong, you have time to investigate.

Test your live demo URL in a browser you have never used before. Confirm that it loads, functions, and requires no login or installation.

If your application has any features that require specific browser permissions (microphone access, for example), confirm that these work correctly in an incognito browser window.

Record a short (one-minute) screen capture of the application working and save it locally. This is your emergency backup if the live demo fails during the final presentation.

Test your application on a different internet connection than the one you normally use. If you normally use a fast university or home connection, try a mobile hotspot to simulate slower conditions.

Run the application for 30 continuous minutes without touching it. Confirm that it does not crash, slow down, or produce degraded output after extended operation.

Confirm that your GitHub repository is public, your README is complete, and your commit history shows activity throughout the competition window.

---

## 17.9 Relevant Research Areas: Testing Sign Language and Accessibility Applications

**Research fields:** Software Testing Methodology, Accessibility Technology Evaluation, Sign Language Technology Evaluation, Usability Testing with Disabled Users

**Search keywords:**
- "evaluation sign language technology system"
- "accessibility application testing methodology"
- "usability testing with disabled users"
- "automatic speech recognition evaluation WER"
- "sign language production quality evaluation"

**Important areas to explore:**

**Word Error Rate (WER)** is the standard metric for evaluating speech recognition systems. Understanding how WER is calculated and what WER values are considered acceptable in different contexts helps you evaluate and communicate your transcription quality honestly. Search for "word error rate speech recognition" to find tutorials and benchmarks.

**BLEU score and sign language evaluation** — the machine translation community uses BLEU scores to evaluate translation quality, and this metric has been applied to sign language gloss translation. Understanding what BLEU scores indicate (and their limitations for sign language specifically) is useful for contextualising your gloss quality. Search "BLEU score sign language translation" for relevant papers.

**Accessibility testing frameworks** — the Web Content Accessibility Guidelines (WCAG) published by the W3C provide a comprehensive framework for testing accessibility of web applications. Even if your application does not need to comply with WCAG formally, using its principles as a testing checklist will improve the quality of your accessibility design.

**Usability testing with Deaf users** — the ACM ASSETS conference proceedings contain multiple papers on how to conduct usability testing specifically with Deaf and Hard-of-Hearing users, including communication strategies, the role of interpreters in testing sessions, and how to handle linguistic diversity in test groups.

**Why they matter:** Using standard evaluation metrics — even imperfectly — allows you to compare your system's performance to published benchmarks. This contextualises your results and demonstrates methodological awareness in your report.

**What can realistically be reused:** The WER calculation method can be applied directly to evaluate your transcription component. WCAG principles can be used as a checklist for your interface design. Usability testing protocols from accessibility research can structure your user testing sessions.

---

## 17.10 Success Criteria for the Testing Strategy Overall

Your testing strategy is complete when: you have tested each component of your pipeline individually on realistic content; you have run at least three full integration tests on complete lecture clips; you have a testing log with at least ten entries; you have tested at least five edge cases; you have conducted at least one user experience test with someone who had not previously used the application; and you have completed the pre-submission checklist in the 48 hours before your deadline.

When your demo fails during the final presentation — and something will always go wrong in live demos — you will be able to say to judges: "We encountered this issue in our testing. Here is what we understand about why it happens and what the solution would be." That response, grounded in documented testing, is far more impressive than surprise and confusion.
