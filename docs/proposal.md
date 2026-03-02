# Blur's Proposal

## Using AI to Make Chip Design Faster and Cheaper
*How can we make designing chips quicker, more affordable, and smarter?*

## Our Elevator Pitch
When engineers design chips, they need to balance three things: how much power it uses, how fast it runs, and how physically small it is. Right now, finding the right balance means a lot of slow, manual guessing. We're building an AI tool that does that searching automatically, finding better designs in fewer attempts, saving time, money, and effort.

## Who We're Building This For
Our tool is for people who design and build chips:

- Physical Design Engineers
- CAD Engineers
- Hardware startups

## What We're Building
We're building an AI-powered platform that automatically finds the best settings for a chip design.

Instead of guessing manually, users tell the system:

- What their chip needs to do
- What matters most (ex. speed vs. size)
- How many attempts they want to use

The system then:

1. Picks settings to try using AI
2. Runs the chip design automatically
3. Reads the results
4. Learns from what worked and what didn't
5. Suggests better settings each round

The end result is better chip designs, in fewer tries.

## Why AI?
Chip design is expensive and time-consuming, even for big companies.

With just 8 settings and 10 possible values each:

10^8 = 100,000,000 possible combinations

No engineer can test all of those by hand.

**Without AI:**
- Engineers guess and check manually
- Each attempt can take weeks

**With AI:**
- A model predicts which settings will perform well
- The system focuses only on promising options
- Bad configurations are skipped over

AI turns chip design from guessing into a smart, guided process.

## Tech Stack
- **Python** — Core
- **Bayesian Optimization** — AI-driven searching
- **OpenROAD** — Runs the actual chip design
- **PostgreSQL** — Stores results and tracks progress
- **Next.js** — Web interface for storing runs and viewing results