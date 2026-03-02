# Requirements
###### This document outlines what the system must do, how it should feel to users, and the minimum AI expectations required for this product.

## Functional Requirements - What does it do?

- User can input specific constraints.
- User can view output in an organized and visually attractive manner.

- Users can create an account and authenticate securely.

- Users can easily access past inputs and outputs.

- User can see why certain constraints would or would not work.


## Non-Functional Requirements - How does it feel?

- Each profile requires password-based authentication  

- Passwords must be hashed using **bcrypt**  

- Unauthorized users are denied access to profiles and decision data

- System adapts to varying screen sizes.

- System functions on small and large devices

- Decision submissions and feedback appear in a few minutes (**under 10 minutes**)




## AI Specific Requirements

### The AI layer must be able to:

- Understand constraints

- Generate legal designs

- Learn from results

- Explain itself

- Validate configurations

- Integrate tightly with the system

- Protect data

- Improve over time


## User Stories
###### "As a [type of user], I want [goal] so that [reason/benefit]."

1. As a physical design engineer, I want the AI to suggest new configurations that improve timing so that I can reach timing closure faster without manual trial-and-error.
    - AC1: Given a set of timing reports, the AI must generate at least N candidate configurations that attempt to reduce worst negative slack (WNS) or total negative slack (TNS). 

2. As a physical design engineer, I want to set hard constraints on power, area, and timing so that the AI never proposes configurations that violate my design targets.
    - AC1: User must be able to set min/max thresholds for power, area, and timing in the UI.
    - AC5: The UI must show which constraints were applied to each generated configuration.

3. As a physical design engineer, I want the AI to avoid previously failed configurations so that compute time isn’t wasted repeating bad runs.
    - AC1: The system must store a history of all previous configurations and their outcomes.
    - AC2: The AI must check new candidate configurations against the historical dataset before proposing them.

4. As a physical design engineer, I want the AI to explain why a configuration is recommended so that I can trust and validate its choices.

    - AC2: The explanation must reference specific expected improvements (e.g., “reduces congestion in region X”, “improves WNS by tightening CTS parameters”).



