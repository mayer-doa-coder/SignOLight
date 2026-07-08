# Who The Users Are

## Why Defining Users Matters More Than You Think

Here is something that surprises most first-time builders: you cannot build one thing for everyone. You can try, but what happens is you end up building something that is mediocre for everyone rather than excellent for anyone.

When you define your users precisely — when you know their names, their ages, their frustrations, their daily routines, their relationship with technology — you gain a superpower. Every design decision becomes easier. "Should the captions be larger or smaller?" is a hard question in the abstract. "Would Riya, who sits three rows from the front, be able to read captions at this size on a shared screen while also watching the teacher?" is a question you can actually answer.

In product design, the detailed description of a real or representative user is called a **persona**. We are going to build a few personas for your project.

---

## Your Primary Users: Deaf and Hard-of-Hearing Students

First, an important note. "Deaf and Hard-of-Hearing" is not one group. It is a spectrum of experiences, and the needs are different at different points on that spectrum. Getting this wrong will cause you to build for one end of the spectrum while ignoring the other.

### Persona A: Riya — Deaf from Birth, Sign Language Primary

Riya is 19. She has been Deaf since birth. Her parents are hearing, but she attended a school with a Deaf program where she learned Bangla Sign Language (BdSL) from age 6. BdSL is her first language. She thinks in BdSL. When she reads written Bengali or English, she is working in her second language, which is more cognitively demanding. She types and writes well, but reading dense academic text is exhausting for her.

She is now at university, studying computer science. Lectures are entirely in spoken Bengali and English. There is no sign language interpreter. There are occasional printed handouts. She has learned to lipread partially, but it is unreliable — it depends on whether the professor faces the class, on lighting, on the professor's accent. On average, she estimates she catches 40% of what is said in lectures.

For Riya, the avatar is not just helpful — it is the primary interface she would prefer. If the avatar signs the lecture content in BdSL, she can follow it as naturally as a hearing student follows the spoken lecture. Captions are useful as a backup, but the signed content is what she actually needs.

Riya is comfortable with technology. She uses her smartphone constantly. She uses YouTube to watch signed content from other countries when she can find it. She is frustrated that almost no academic signed content exists in Bangla.

### Persona B: Anik — Acquired Hearing Loss, Oral Communication Preference

Anik is 23. He started losing his hearing at age 14 due to illness. He spent his school years as a hearing person, learned to speak Bengali and English fluently, and reads and writes normally. He does not know sign language. He uses hearing aids that help in quiet environments, but in a lecture hall with ambient noise, they are not sufficient.

For Anik, the avatar means very little — he does not know sign language. What matters to him is reliable, accurate real-time captions. He wants to read what the professor is saying as it is said. He is already skilled at reading, so the cognitive load of reading captions is not a problem.

Anik's frustration is different from Riya's. His primary frustration is not understanding the language of the content — his Bengali and English are excellent. His frustration is the unreliability of what he can hear. Some days his hearing aids work better, some days worse. He needs a consistent, readable text backup that he can follow in real time.

For Anik, your application is valuable, but the avatar is largely irrelevant. The captions are everything.

### Persona C: Nadia — Moderate Hearing Loss, Partial BdSL Knowledge

Nadia is 21. She has moderate hearing loss — she hears some things well, misses others completely, and is exhausted by the constant effort of listening carefully. She learned some BdSL in school but is not fluent. She can understand simple signed phrases but loses track with complex or fast signing.

For Nadia, the ideal experience is the combination of captions and avatar working together. She reads the simplified captions to understand the meaning, and when she sees the avatar sign a key word she recognises, it reinforces the concept. She does not need perfect BdSL fluency in the avatar — she needs signs for important vocabulary words.

Nadia is also anxious about being identified as Deaf in class. She prefers to use any accessibility tool discreetly, on her own device, without attracting attention. This means your application should work on a personal screen without requiring anything broadcast to the classroom.

### What This Means for You

Your application serves both Riya and Anik. But the features they value are different. For Riya, prioritise the avatar and the signed content. For Anik, prioritise the captions. Your design needs to make both accessible without requiring either person to navigate through a mode they do not need.

---

## Your Secondary Users

Secondary users are people who interact with your product but are not the main beneficiaries. They still matter, because if they have a bad experience, they may prevent primary users from using the tool.

### The Teacher or Professor

Your application works on the student's device without requiring anything from the teacher. This is a deliberate and wise design choice. Teachers do not need to install anything, change their behaviour, or be asked permission. If the tool required teacher cooperation — for example, if the teacher had to wear a microphone or enable a special mode — you would face a major adoption barrier. Most teachers in Bangladesh have never thought about accessibility accommodations.

However, teachers are also potential champions. If a teacher notices that their Deaf student is performing better, understanding lectures, engaging more — that teacher becomes an advocate. They might recommend the tool to colleagues, mention it to the department head, or speak about it publicly. Secondary users can become powerful allies.

### Parents of Deaf Students

Parents are often the primary decision-makers for whether their child uses a technology tool, especially in a conservative family context. Parents of Deaf children in Bangladesh are often navigating their own grief and adaptation process, having a child whose primary language is not the family language. Parents want to know: Is this safe? Does it work? Will it embarrass my child? Will it help their grades? If you can show a parent a before-and-after story — "Before this tool, Riya missed 60% of lectures. After, she understood 90%" — they become champions.

### Administrators and Institution Accessibility Officers

Some universities have begun to think about accessibility compliance. An administrator who needs to demonstrate that their institution supports disabled students may be very interested in your tool, especially if it is low-cost or free for students to use. However, institutional adoption involves bureaucracy, testing, approval processes, and procurement decisions. This is a long path. For your hackathon, focus on individual users, not institutions.

---

## Common Beginner Mistake: Designing for Yourself

If you are a hearing person building this project, there is a serious risk that every design decision will be made by someone who has never experienced what your users experience. You will design captions in a font size you find comfortable, not in a font size that a person exhausted from a full day of visual communication finds comfortable. You will design the avatar's signing speed based on what seems fast enough to you, not based on what is readable for someone processing sign language.

This is not a failure of intention — it is a failure of methodology. The solution is simple but requires discipline: **regularly get feedback from actual Deaf and Hard-of-Hearing users**. Not "here is our prototype, what do you think?" but "sit with this for ten minutes while I watch. Tell me what is confusing. Tell me what is missing."

Even one person from your target community giving you honest feedback once a week is worth more than months of guessing.

---

## Common Beginner Mistake: Treating All Deaf People as One Group

We saw this above, but it bears repeating. There are Deaf people who would be offended if you called them "disabled." There are Deaf people who are proud members of Deaf culture and see sign language as beautiful and complete, not as a workaround. There are Hard-of-Hearing people who identify primarily as hearing people with a medical condition. There are late-deafened adults who are grieving the loss of hearing they once had.

These are fundamentally different psychological, cultural, and practical situations. The language you use in your application matters. The way you introduce your product matters. If your promotional material says "helping the disabled access education," you may alienate Deaf users who do not identify with the word "disabled." If it says "making sign language part of every classroom," you may feel more welcoming.

---

## Risk: Building for the Wrong User

There is a specific risk worth naming: building for a fictional user who is a combination of all your assumptions, and discovering that this fictional user does not actually exist in large numbers.

For example, you might imagine a user who is Deaf, fluent in BdSL, studies at a major university, has a modern smartphone, reliable internet, and an immediate need for this tool. Each of these assumptions may be true for some users but not all. If you build for a user who needs all of these things simultaneously, your actual market may be very small.

The validation method here is simple: talk to five real potential users and ask them to describe their situation honestly. Are they fluent in BdSL? Do they have reliable internet during class? Do they have a device good enough to run a browser-based 3D avatar? Each answer either confirms your assumptions or challenges them.

---

## How to Know This Phase Is Successful

You have completed user definition successfully when you can describe at least two different types of users in specific, human detail — including their name, age, situation, daily challenges, relationship with technology, and what specific feature of your application would matter most to them. When you face a design decision, you can say "Riya would prefer X because..." and that reasoning is based on something you learned from a real conversation, not something you imagined.
