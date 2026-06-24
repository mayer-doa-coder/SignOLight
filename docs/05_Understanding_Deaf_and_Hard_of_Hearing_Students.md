# Understanding Deaf and Hard-of-Hearing Students

## Why This Section Is the Most Important

You can have a perfect vision, a perfect problem definition, and a beautiful user journey map, and still build something that does not truly serve Deaf and Hard-of-Hearing students — if you do not understand their actual experience.

This section is about going deeper than "they can't hear." It is about understanding the full context of being a Deaf or Hard-of-Hearing student: the history, the culture, the language, the educational experience, the emotional reality, and the specific ways that a tool like yours can help or unintentionally cause harm.

---

## The Spectrum of Hearing Loss

Hearing is not binary — it is not simply "can hear" or "cannot hear." It exists on a spectrum, and where someone is on that spectrum affects everything about their educational experience.

Hearing loss is generally measured in decibels (dB). A person with typical hearing can detect sounds as quiet as 0–20 dB. Hearing loss categories are roughly:

| Category | dB Range | Description |
|---|---|---|
| Mild loss | 21–40 dB | Can hear most speech but misses soft sounds or parts of words. May not realise they have a hearing loss until someone points it out. May struggle in noisy classrooms without realising why. |
| Moderate loss | 41–55 dB | Misses a significant portion of speech at normal volume. Benefits greatly from hearing aids. May struggle in larger lecture halls where they sit further from the speaker. |
| Moderately severe loss | 56–70 dB | Needs hearing aids or other technology for almost all spoken communication. May use some sign language in combination with spoken language. |
| Severe loss | 71–90 dB | Hears only loud sounds. Relies heavily on visual communication, sign language, lipreading, or a combination. Hearing aids help but do not fully restore comprehension. |
| Profound loss | 91 dB or more | Often feels no usable hearing. Sign language is the primary mode of communication. Written text is the secondary mode. |

Why does this matter for your application? Because a student with moderate loss and a student with profound loss have completely different needs. Your application needs to serve both. The student with moderate loss primarily needs captions — they can follow the lecture visually. The student with profound loss primarily needs sign language — captions help but are cognitively more demanding.

---

## Sign Language Is a Full Language, Not a Code

This is perhaps the single most important conceptual point in this section. Many hearing people — including many builders of accessibility technology — think of sign language as a visual translation of spoken language. As if you take a spoken sentence and "encode" it into hand movements, one word at a time.

**This is completely wrong**, and building on this assumption will cause your application to be less useful than it could be.

Sign languages are fully independent languages with their own grammar, syntax, vocabulary, and expressive range. They are not based on spoken languages. They did not develop by translating spoken languages into gestures. They developed naturally, within Deaf communities, over generations, in the same way that all human languages develop — through use, need, and community.

Here is a specific example. In English, you would say, "Did you finish the assignment?" In American Sign Language (ASL), the grammar is different — you might sign ASSIGNMENT FINISH YOU? where the question is indicated not by word order but by facial expression (raised eyebrows for yes/no questions, furrowed brows for WH-questions). The grammar is fundamentally different.

Bangla Sign Language (BdSL) has its own grammar that is different from both spoken Bengali and from other sign languages. The exact grammar of BdSL is not yet fully documented — it is an area of active research — but it follows the same principle: it is its own language, not a translation of Bengali.

What this means for your application is profound. When you generate sign language from spoken lecture content, you cannot simply take the spoken Bengali sentence and convert it word-by-word into signs. Word-by-word signed Bengali is called "Signed Exact Bengali" and while some people use it, it is not the natural grammar of BdSL. Native BdSL signers find it awkward and harder to follow than natural BdSL.

Your gloss generation step — where the LLM converts simplified text into sign-language-friendly word order — is doing the work of adapting the grammar. This is the right approach. The goal is not word-for-word translation but meaning-preserving adaptation into a form that can be signed naturally.

---

## Deaf Culture and Identity

In most countries, there is a distinction that is meaningful and important: capital-D **"Deaf"** versus lowercase-d **"deaf."** This distinction is not about the degree of hearing loss. It is about cultural identity.

A **lowercase-d deaf** person identifies primarily as a person with a medical condition. They may use hearing aids, prefer oral communication (speaking and lipreading), and see their deafness as something to manage or work around.

A **capital-D Deaf** person identifies as a member of the Deaf community and culture. They use sign language as their primary language, see their Deafness as a cultural identity rather than a disability, may reject the idea of cochlear implants or other hearing restoration technologies, and take pride in Deaf history and community.

This distinction matters because it affects how your application should present itself. If you describe it as a "tool to help disabled students overcome their hearing disability," Deaf-identified users may be offended. If you describe it as "bringing sign language into every classroom," it may feel more respectful and welcoming to Deaf-identified users while still being useful to hearing-aid users who just need captions.

In Bangladesh, Deaf culture is less formally defined than in countries like the USA or UK, but there are Deaf communities, Deaf schools, and BdSL-using communities that have their own social networks and cultural practices.

---

## The Educational Experience of Deaf Students in Bangladesh

To build for these students, you need to understand what their educational experience typically looks like — because it is often very different from what you might assume.

Many Deaf children in Bangladesh attend special schools for the Deaf, where teachers may use some form of sign language, where the peer group is entirely Deaf, and where communication is adapted to their needs. These schools have variable quality, resources, and teacher training.

When these students transition to mainstream higher education — universities and polytechnics — they enter an environment that was not designed for them. Lectures are spoken. Notes are written on boards that require hearing the explanation to understand. Group work requires conversation. Exams are timed written tests. There are rarely sign language interpreters. Accessibility support is minimal to nonexistent.

This transition is a major stress point. Students who performed well in Deaf schools often struggle in mainstream universities not because of intellectual ability but because of communication barriers. The disparity between their potential and their academic performance is a direct result of inaccessibility.

Your application directly addresses this transition point. It is most valuable for students who are moving from a supported Deaf education environment into an unsupported mainstream one.

---

## How Fatigue Affects Deaf Students

Something that many hearing people do not realise is that communication for Deaf and Hard-of-Hearing people is significantly more tiring than it is for hearing people.

A hearing student in a lecture is passively receiving information through their auditory system, which requires relatively little conscious effort. Their eyes are free to watch the board, take notes, and observe the teacher's body language.

A Deaf or Hard-of-Hearing student in the same lecture is doing multiple demanding things simultaneously: lipreading (which is exhausting and only works 30–40% of the time even for skilled lipreaders), watching the board, watching an interpreter if one is present, taking notes, and maintaining attention. All of these things compete for limited visual attention.

By the end of a 90-minute lecture, a Deaf student may be genuinely exhausted in a way that their hearing classmates are not. This is called **cognitive fatigue** and it has real effects on learning, retention, and academic performance.

What does this mean for your design? It means that your application should **reduce cognitive load, not add to it**. The layout should be clean and uncluttered. The avatar should be in a position where the student does not need to dramatically shift their gaze between the video and the avatar. Captions should be large and readable without effort. The application should not require the student to manage many settings or make many decisions — it should just work.

---

## Risk: Well-Meaning Harm

There is a specific and uncomfortable risk worth naming here. It is possible to build a tool with completely good intentions that still causes harm to its users.

Here is one example: if your avatar signs slowly and unnaturally, native BdSL users may find it condescending — like a hearing person who doesn't speak Bengali trying to speak Bengali at you very slowly and with a terrible accent. It may feel like a mockery of their language rather than an embrace of it.

Another example: if your application labels users as "deaf users" or asks them to select "I am disabled" during setup, some users may feel stigmatised or choose not to use it at all.

The way to avoid well-meaning harm is to involve the Deaf community in design decisions — not as passive recipients of feedback, but as active co-designers. Even if only one Deaf person reviews your application before your hackathon submission, that involvement matters and should be mentioned in your presentation.

---

## How to Know This Phase Is Successful

You understand your users deeply enough when you can describe the experience of attending a lecture as a Deaf student in Bangladesh, including the emotional and physical dimensions, not just the logistical ones. When you can explain the difference between BdSL and signed Bengali. When you have at least one piece of feedback from a real Deaf or HoH person that surprised you and changed something about your design.
