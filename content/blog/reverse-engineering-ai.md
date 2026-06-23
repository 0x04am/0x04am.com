+++
title = "Reverse Engineering Artificial Intelligence - Part 1"
date = 2026-05-28
description = "We're reverse engineering LLMs today. Walking in knowing nothing, walking out understanding the whole pipeline. Pretraining, tokenization, transformers, RLHF - all of it."

[extra]
image = "/img/blog/transformer-3d.webp"

[taxonomies]
tags = ["ai", "llm", "deep-dive"]
+++

yo, we're reverse engineering LLMs today. Felt fitting. Disclaimer: I don't know jack shit about reversing these things, so the format of this blog will be learn as you go. So you and I both walk in knowing nothing, but hopefully walk out understanding this field. The main learning material for this is gonna be none other than Karpathy himself, notably this video:

<div style="margin: 1.5rem 0;">
<iframe width="560" height="315" src="https://www.youtube.com/embed/7xTGNNLPyMI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## What is an LLM

Fuck that, if you're here that means you already know what it is. Otherwise you got some learning to do, choom.

## How do you build it

So let's dive right into the nitty gritty. There are multiple stages into getting this shit show to work, and each stage has multiple steps. Let's start with the first stage:

## 1. Pre Training

### Data Collection

Now for this stage, you're gonna need a lot of data, like a whole lot. Karpathy mentions the following website: [FineWeb](https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1) which is basically 44TB of curated internet web pages. Sounds like a lot, but in the grand scheme of things it isn't. The entire internet is worth petabytes. 44TB seems small in regards to that, right?

![FineWeb dataset processing pipeline](/img/blog/fineweb.webp)

Most providers like Anthropic, Google and OpenAI have their own versions of FineWeb for internal training. These docs need to be diverse and of high quality. What you feed in is what you get out.

After you gather all your data, you gotta make sure it's in a state the model can process. This step is basically cleaning up the data, text extraction, language filtering, PII removal and more.

### Tokenization

Once you have your dataset, you have to convert it into a format the LLM will understand. This is called **Tokenization**. Listen close, because shit's gonna hit the fan real soon if you don't.

Alright, all the data you've scraped so far, imagine it as a single line of text. Yes, a 44 TB line of text. Everything is basically characters in 1 line. Now this text is gonna go into neural networks to train them. Before we do that though, we have to decide which format to feed it in.

Neural nets expect a one dimensional sequence of a set of finite symbols. So we have to figure out how to represent our data in the form of 1D symbols. Now if we were to encode this text in binary, we'd essentially have something like: `01010010101010100110010010...`, where 8 bits represent 1 char. Here "1" and "0" are the symbols, and the length of the text is the sequence length.

Sequence length is pretty finite and precious in neural networks, so we have to find ways to reduce it. One way to do so is by increasing the amount of symbols. Take every 8 bits and encode it as a number. This can range from 0 to 255, and is essentially 8 times smaller. Also, don't think of the numbers as numbers, think of them as letters in a language.

In production environments, you take this to the extreme. You need to shrink sequence length because of how precious it is, and the way to do that is by increasing the symbols you use. Further symbols are introduced using the **byte pair encoding** algorithm. For example if the number 116 is often followed by 32, we group them and create a new symbol, say 256, and we replace all 116 32 with 256. We can run this loop as many times for pairs that occur the most in the sequence (GPT-4 used 100,277 symbols).

To see this live in action, check out: [tiktokenizer](https://tiktokenizer.vercel.app/?model=gpt2). I encourage you to play around with it and see how tokens change based on spaces, multi chars and uppercase and lowercase.

![Tiktokenizer in action](/img/blog/tiktoken.png)

### Training the Neural Net

Now we take our entire wall of text and tokenize it. The FineWeb data set is 15 trillion tokens. This is the language in which the machine speaks. Think of this language as english, but whenever there are 2 words that come after each other a lot, we combine them to create a new word.

Now we want to model how these words relate to each other mathematically. To do that, we take a window of tokens randomly. The window length can range from 0 to a pre set max size. Training for long windows is computationally very expensive, so in production max size is usually set to something like 8k to 16k tokens.

Now we take a random window and feed it to the neural net as an input. The neural net will output a list of tokens with their respective probabilities. Let's say it put out A, B and C with the probabilities of 40%, 30% and 30% respectively. Now the actual next token in the data was B, so we adjust the neural net's parameters so that next time it sees this same context, B gets a higher probability.

### Neural Net Internals

Let's take a look at what's inside this so called neural network. Spoiler alert: it's just a bunch of numbers. These numbers are called parameters/weights and they affect the probabilities of the output tokens. Tune them a little, and you'll find that the neural network now gives different outputs. This is how the model's trained.

This architecture is called the **Transformer** and is the T in GPT. It's a stack of layers and each layer does 2 things: looks at every other token in the window and figures out what's relevant (this is called **attention**; and it's all you need). Then it runs math to refine those results. Input tokens go in as numbers, the transformers do the math on them and out comes possible output tokens with their respective probability.

Check out [bbycroft.net/llm](https://bbycroft.net/llm) to see a 3D visualisation of a transformer.

![3D Transformer visualization](/img/blog/transformer-3d.webp)

### Inference

Now this is the part where we reap the fruits of our labor. We generate text. How do we do this? We give the model a starting text, called the prefix. The model generates the very next token. Then that becomes the prefix and the model repeats. This is what's known as **inference**.

So after all that training, what do you actually get? You get a text completer. Not a chatbot. Not an assistant. Just a machine that predicts the next word. You give it "breaking news:" and it'll write a fake article. You give it a question and it might just give you more questions, because that's what the internet looks like. It doesn't know it's talking to you. It doesn't care. It's just completing text.

## 2. Post Training

So how do we go from that to ChatGPT? Two steps.

### Supervised Fine Tuning (SFT)

You get humans to write out conversations. Thousands of them. "What's the capital of France?" → "The capital of France is Paris." Basic stuff. You feed all of this to the model and it starts picking up the pattern. Oh, when someone asks me something, I'm supposed to answer it. Not generate a reddit thread. Not write a wikipedia article. Just answer the question. This is where it stops being a text completer and starts acting like an assistant.

### RLHF

Reinforcement Learning from Human Feedback. This is the weird one. You take the model and have it generate multiple responses to the same prompt. Then humans rank them. Best to worst. Then you train a completely separate model (called the reward model) to learn what humans think a "good" response looks like. Then you tell the original model to maximize that score. So now you have an AI trying to impress another AI that was trained on human opinions. It's as messy as it sounds. This is also why these models feel sanitized sometimes. They're optimizing for approval.

---

And that's it. That's the whole pipeline. Scrape the internet, clean it up, tokenize it, shove it through a transformer, train it on GPUs for months, then teach it manners with SFT and RLHF. That's how you build an LLM.

In part 2, we build one. From scratch. In code. See you there.
